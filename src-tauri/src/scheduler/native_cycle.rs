use crate::db::{
    get_feeds_by_ids, list_scheduler_feed_entries, update_feed, DbState, FeedRecord, FeedUpdate,
};
use crate::feeds::{store_parsed_feed_content, StoreParsedFeedRequest};
use crate::net::{feeds_abort_request, fetch_with_cache, FeedFetchWithCacheRequest};
use crate::scheduler::run_plan::{
    boosts_to_map, create_scheduler_run_plan, scheduler_feed_entry_from_scheduler_row,
};
use crate::scheduler::types::{
    FeedPriorityEntry, SchedulerNativeCycleCompletePayload, SchedulerNativeCycleFeedPayload,
    SchedulerNativeCycleFeedResult, SchedulerNativeCyclePreviewRequest,
    SchedulerNativeCyclePreviewResponse, SchedulerNativeCycleStartPayload,
    SCHEDULER_NATIVE_CYCLE_COMPLETE_EVENT, SCHEDULER_NATIVE_CYCLE_FEED_EVENT,
    SCHEDULER_NATIVE_CYCLE_START_EVENT,
};
use crate::scheduler::webview_delivery::emit_scheduler_payload_to_main_webview;
use futures_util::future::join_all;
use once_cell::sync::Lazy;
use std::collections::{HashMap, HashSet};
use std::sync::Mutex;
use tauri::AppHandle;

const DEFAULT_NATIVE_CYCLE_CONCURRENCY: usize = 3;
const MAX_NATIVE_CYCLE_CONCURRENCY: usize = 8;

struct ActiveNativeCycle {
    cancelled: bool,
    request_ids: Vec<String>,
}

static ACTIVE_CYCLES: Lazy<Mutex<HashMap<String, ActiveNativeCycle>>> =
    Lazy::new(|| Mutex::new(HashMap::new()));

/// Cancel an in-flight native cycle: stop new chunks and abort registered fetches.
#[tauri::command(rename_all = "camelCase")]
pub fn scheduler_cancel_native_cycle(cycle_id: String) -> Result<(), String> {
    let request_ids = {
        let mut cycles = ACTIVE_CYCLES
            .lock()
            .map_err(|_| "Failed to lock native cycle registry.".to_string())?;
        if let Some(cycle) = cycles.get_mut(&cycle_id) {
            cycle.cancelled = true;
            cycle.request_ids.clone()
        } else {
            Vec::new()
        }
    };

    for request_id in request_ids {
        let _ = feeds_abort_request(request_id);
    }

    Ok(())
}

struct CycleRegistryGuard(Option<String>);

impl Drop for CycleRegistryGuard {
    fn drop(&mut self) {
        if let Some(cycle_id) = self.0.take() {
            unregister_cycle(&cycle_id);
        }
    }
}

fn register_cycle(cycle_id: &str) -> Result<(), String> {
    let mut cycles = ACTIVE_CYCLES
        .lock()
        .map_err(|_| "Failed to lock native cycle registry.".to_string())?;
    cycles.insert(
        cycle_id.to_string(),
        ActiveNativeCycle {
            cancelled: false,
            request_ids: Vec::new(),
        },
    );
    Ok(())
}

fn unregister_cycle(cycle_id: &str) {
    if let Ok(mut cycles) = ACTIVE_CYCLES.lock() {
        cycles.remove(cycle_id);
    }
}

fn is_cycle_cancelled(cycle_id: &str) -> bool {
    ACTIVE_CYCLES
        .lock()
        .ok()
        .and_then(|cycles| cycles.get(cycle_id).map(|cycle| cycle.cancelled))
        .unwrap_or(false)
}

fn register_request_id(cycle_id: &str, request_id: String) {
    let already_cancelled = {
        let Ok(mut cycles) = ACTIVE_CYCLES.lock() else {
            return;
        };
        let Some(cycle) = cycles.get_mut(cycle_id) else {
            return;
        };
        cycle.request_ids.push(request_id.clone());
        cycle.cancelled
    };
    // Cancel may have flipped between chunk check and register — abort immediately.
    if already_cancelled {
        let _ = feeds_abort_request(request_id);
    }
}

pub async fn preview_native_refresh_cycle(
    app: &AppHandle,
    db: &DbState,
    request: SchedulerNativeCyclePreviewRequest,
) -> Result<SchedulerNativeCyclePreviewResponse, String> {
    let now_ms = request.now_ms.unwrap_or_else(current_time_ms);
    let options = request.options.clone().unwrap_or_default();
    let boosts = boosts_to_map(request.boosts.clone());
    let execute = request.execute.unwrap_or(false);
    let concurrency = request
        .concurrency
        .unwrap_or(DEFAULT_NATIVE_CYCLE_CONCURRENCY)
        .clamp(1, MAX_NATIVE_CYCLE_CONCURRENCY);
    let cycle_id = request.cycle_id.clone();

    let _cycle_guard = if let Some(ref id) = cycle_id {
        register_cycle(id)?;
        CycleRegistryGuard(Some(id.clone()))
    } else {
        CycleRegistryGuard(None)
    };

    let entries = db
        .read(|connection| {
            let rows = list_scheduler_feed_entries(connection)?;
            Ok(rows
                .iter()
                .map(scheduler_feed_entry_from_scheduler_row)
                .collect::<Vec<_>>())
        })
        .await?;

    let plan = create_scheduler_run_plan(&entries, entries.len(), &boosts, now_ms, &options);

    let mut prioritized = plan.prioritized.clone();
    if let Some(max_feeds) = request.max_feeds {
        prioritized.truncate(max_feeds);
    }

    let queued_count = prioritized.len();
    let queued_feed_ids: Vec<String> = prioritized
        .iter()
        .map(|entry| entry.entry.feed_id.clone())
        .collect();
    if execute && queued_count > 0 {
        emit_scheduler_payload_to_main_webview(
            app,
            SCHEDULER_NATIVE_CYCLE_START_EVENT,
            &SchedulerNativeCycleStartPayload {
                queued_count,
                feed_ids: queued_feed_ids,
                cycle_id: cycle_id.clone(),
            },
            "Scheduler",
        );
    }

    let mut feed_results = Vec::new();
    let mut changed_feeds = 0usize;
    let mut not_modified_feeds = 0usize;
    let mut failed_feeds = 0usize;
    let mut inserted_articles = 0i64;
    let mut cancelled = false;

    if execute && queued_count > 0 {
        let force_refresh_feed_ids: HashSet<String> = options
            .force_refresh_feed_ids
            .clone()
            .unwrap_or_default()
            .into_iter()
            .collect();

        for chunk in prioritized.chunks(concurrency) {
            if let Some(ref id) = cycle_id {
                if is_cycle_cancelled(id) {
                    cancelled = true;
                    break;
                }
            }

            let chunk_ids: Vec<String> = chunk
                .iter()
                .map(|entry| entry.entry.feed_id.clone())
                .collect();
            let feeds_by_id = db
                .read(move |connection| get_feeds_by_ids(connection, &chunk_ids))
                .await?;

            // Feeds deleted between planning and execution are skipped so one
            // missing row cannot abort the rest of the cycle.
            let chunk_feeds = resolve_chunk_feeds(chunk, &feeds_by_id);
            let chunk_tasks = chunk_feeds.iter().map(|(_, feed)| {
                let feed = feed.clone();
                let force_refresh = force_refresh_feed_ids.contains(&feed.id);
                let request_id = cycle_id
                    .as_ref()
                    .map(|cid| format!("{}:{}", cid, feed.id));
                if let Some(cid) = cycle_id.as_ref() {
                    if let Some(rid) = request_id.clone() {
                        register_request_id(cid, rid);
                    }
                }
                refresh_single_feed_native(db, feed, force_refresh, request_id)
            });

            let chunk_results = join_all(chunk_tasks).await;
            for ((entry, _), result) in chunk_feeds.iter().zip(chunk_results) {
                let request_id = cycle_id
                    .as_ref()
                    .map(|cid| format!("{}:{}", cid, entry.entry.feed_id));
                let feed_result = match result {
                    Ok(outcome) => {
                        match outcome.status.as_str() {
                            "changed" => changed_feeds += 1,
                            "not-modified" => not_modified_feeds += 1,
                            _ => {}
                        }
                        inserted_articles += outcome.inserted_count.unwrap_or(0);
                        SchedulerNativeCycleFeedResult {
                            feed_id: entry.entry.feed_id.clone(),
                            status: outcome.status,
                            inserted_count: outcome.inserted_count,
                            error: None,
                        }
                    }
                    Err(error) => {
                        failed_feeds += 1;
                        SchedulerNativeCycleFeedResult {
                            feed_id: entry.entry.feed_id.clone(),
                            status: "failed".to_string(),
                            inserted_count: None,
                            error: Some(error),
                        }
                    }
                };

                emit_scheduler_payload_to_main_webview(
                    app,
                    SCHEDULER_NATIVE_CYCLE_FEED_EVENT,
                    &SchedulerNativeCycleFeedPayload {
                        feed_id: feed_result.feed_id.clone(),
                        inserted_count: feed_result.inserted_count,
                        error: feed_result.error.clone(),
                        cycle_id: cycle_id.clone(),
                        request_id,
                    },
                    "Scheduler",
                );
                feed_results.push(feed_result);
            }
        }

        if !cancelled {
            if let Some(ref id) = cycle_id {
                cancelled = is_cycle_cancelled(id);
            }
        }

        emit_scheduler_payload_to_main_webview(
            app,
            SCHEDULER_NATIVE_CYCLE_COMPLETE_EVENT,
            &SchedulerNativeCycleCompletePayload {
                queued_count,
                changed_feeds,
                not_modified_feeds,
                failed_feeds,
                inserted_articles,
                cycle_id: cycle_id.clone(),
                cancelled: Some(cancelled),
            },
            "Scheduler",
        );
    }

    Ok(SchedulerNativeCyclePreviewResponse {
        plan,
        queued_count,
        executed_feed_count: feed_results.len(),
        changed_feeds,
        not_modified_feeds,
        failed_feeds,
        inserted_articles,
        feed_results,
        cancelled: Some(cancelled),
        cycle_id,
    })
}

struct NativeFeedRefreshOutcome {
    status: String,
    inserted_count: Option<i64>,
}

async fn refresh_single_feed_native(
    db: &DbState,
    feed: FeedRecord,
    force_refresh: bool,
    request_id: Option<String>,
) -> Result<NativeFeedRefreshOutcome, String> {
    // A manual/forced refresh must bypass conditional GET so the server returns
    // 200 with a full body instead of a 304. The 60s cooldown + forceNetwork
    // bypass in the renderer prevents spamming, so stripping etag/last_modified
    // here is safe and makes Cmd+R actually re-fetch.
    let (etag, last_modified) = conditional_headers(&feed, force_refresh);
    let network = match fetch_with_cache(FeedFetchWithCacheRequest {
        url: feed.url.clone(),
        request_id,
        etag,
        last_modified,
        timeout: None,
    })
    .await
    {
        Ok(response) => response,
        Err(error) => {
            // A cycle cancel aborts in-flight requests; that is not a feed
            // failure and must not push a healthy feed into backoff.
            if should_record_feed_failure(&error) {
                record_feed_failure(db, &feed, &error).await?;
            }
            return Err(error);
        }
    };

    if network.not_modified || network.data.is_none() {
        let feed_id = feed.id.clone();
        let update = success_feed_update(network.etag.clone(), network.last_modified.clone(), None);
        db.write(move |connection| update_feed(connection, &feed_id, update))
            .await?;

        return Ok(NativeFeedRefreshOutcome {
            status: "not-modified".to_string(),
            inserted_count: Some(0),
        });
    }

    let raw_text = network
        .data
        .ok_or_else(|| "Feed fetch returned empty body.".to_string())?;

    // One short write transaction per feed keeps the writer available between
    // feeds, so UI writes never wait for the whole cycle.
    let store_request = StoreParsedFeedRequest {
        feed_id: feed.id.clone(),
        feed_url: feed.url.clone(),
        raw_text,
        feed_title: Some(feed.title.clone()),
        feed_favicon: feed.favicon.clone(),
        feed_favicon_has_transparency: feed.favicon_has_transparency,
        feed_favicon_bg_light: feed.favicon_bg_light.clone(),
        feed_favicon_bg_dark: feed.favicon_bg_dark.clone(),
        feed_image: feed.image.clone(),
        etag: network.etag.clone(),
        last_modified: network.last_modified.clone(),
        last_fetched: Some(current_time_rfc3339()),
        previous_update_frequency_score: Some(feed.update_frequency_score),
    };
    let stored = match db
        .write(move |connection| store_parsed_feed_content(connection, store_request))
        .await
    {
        Ok(response) => response,
        Err(error) => {
            record_feed_failure(db, &feed, &error).await?;
            return Err(error);
        }
    };

    Ok(NativeFeedRefreshOutcome {
        status: "changed".to_string(),
        inserted_count: Some(stored.inserted_count),
    })
}

/// Pairs each planned entry with its current feed row, dropping entries whose
/// feed no longer exists.
fn resolve_chunk_feeds<'a>(
    chunk: &'a [FeedPriorityEntry],
    feeds_by_id: &HashMap<String, FeedRecord>,
) -> Vec<(&'a FeedPriorityEntry, FeedRecord)> {
    chunk
        .iter()
        .filter_map(|entry| match feeds_by_id.get(&entry.entry.feed_id) {
            Some(feed) => Some((entry, feed.clone())),
            None => {
                eprintln!(
                    "[Scheduler] Skipping feed missing at execution time: {}",
                    entry.entry.feed_id
                );
                None
            }
        })
        .collect()
}

/// Fetch errors are `FeedCommandError` JSON; a `FEED_REQUEST_CANCELLED` code
/// means the cycle was cancelled, not that the feed failed.
fn should_record_feed_failure(error: &str) -> bool {
    let code = serde_json::from_str::<serde_json::Value>(error)
        .ok()
        .and_then(|value| value.get("code")?.as_str().map(str::to_string));
    code.as_deref() != Some("FEED_REQUEST_CANCELLED")
}

async fn record_feed_failure(db: &DbState, feed: &FeedRecord, error: &str) -> Result<(), String> {
    let _ = error;
    let feed_id = feed.id.clone();
    let consecutive_failures = feed.consecutive_failures;
    db.write(move |connection| {
        update_feed(
            connection,
            &feed_id,
            FeedUpdate {
                consecutive_failures: Some(consecutive_failures + 1),
                last_failed_fetch_at: Some(Some(current_time_rfc3339())),
                title: None,
                url: None,
                created_at: None,
                description: None,
                last_fetched: None,
                unread_count: None,
                article_count: None,
                tags: None,
                favicon: None,
                favicon_has_transparency: None,
                favicon_dominant_color: None,
                favicon_bg_light: None,
                favicon_bg_dark: None,
                favicon_fetch_failed: None,
                emoji: None,
                image: None,
                categories: None,
                language: None,
                is_podcast: None,
                podcast_metadata: None,
                reader_mode_enabled: None,
                etag: None,
                last_modified_header: None,
                sort_order: None,
                update_frequency_score: None,
                last_favicon_refresh: None,
            },
        )
    })
    .await
}

fn success_feed_update(
    etag: Option<String>,
    last_modified: Option<String>,
    update_frequency_score: Option<f64>,
) -> FeedUpdate {
    FeedUpdate {
        last_fetched: Some(Some(current_time_rfc3339())),
        last_failed_fetch_at: Some(None),
        consecutive_failures: Some(0),
        etag: etag.map(Some),
        last_modified_header: last_modified.map(Some),
        update_frequency_score,
        title: None,
        url: None,
        created_at: None,
        description: None,
        unread_count: None,
        article_count: None,
        tags: None,
        favicon: None,
        favicon_has_transparency: None,
        favicon_dominant_color: None,
        favicon_bg_light: None,
        favicon_bg_dark: None,
        favicon_fetch_failed: None,
        emoji: None,
        image: None,
        categories: None,
        language: None,
        is_podcast: None,
        podcast_metadata: None,
        reader_mode_enabled: None,
        sort_order: None,
        last_favicon_refresh: None,
    }
}

fn current_time_ms() -> i64 {
    chrono::Utc::now().timestamp_millis()
}

fn current_time_rfc3339() -> String {
    chrono::Utc::now().to_rfc3339_opts(chrono::SecondsFormat::Millis, true)
}

/// Selects conditional GET headers for a native feed fetch. A forced refresh
/// strips `etag` / `last_modified` so the server returns 200 with a full body
/// instead of a 304 Not Modified.
fn conditional_headers(feed: &FeedRecord, force_refresh: bool) -> (Option<String>, Option<String>) {
    if force_refresh {
        (None, None)
    } else {
        (feed.etag.clone(), feed.last_modified_header.clone())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::{FeedRecord, SchedulerFeedRow};

    fn feed_with_headers(etag: Option<&str>, last_modified: Option<&str>) -> FeedRecord {
        FeedRecord {
            id: "feed-1".to_string(),
            title: "Test".to_string(),
            url: "https://example.com/feed.xml".to_string(),
            created_at: "2026-06-30T00:00:00Z".to_string(),
            description: None,
            last_fetched: None,
            last_failed_fetch_at: None,
            unread_count: 0,
            article_count: 0,
            tags: Vec::new(),
            favicon: None,
            favicon_has_transparency: None,
            favicon_dominant_color: None,
            favicon_bg_light: None,
            favicon_bg_dark: None,
            favicon_fetch_failed: false,
            emoji: None,
            image: None,
            categories: Vec::new(),
            language: None,
            is_podcast: false,
            podcast_metadata: None,
            reader_mode_enabled: false,
            etag: etag.map(str::to_string),
            last_modified_header: last_modified.map(str::to_string),
            sort_order: 0,
            update_frequency_score: 0.0,
            consecutive_failures: 0,
            last_favicon_refresh: None,
        }
    }

    #[test]
    fn clamps_native_cycle_concurrency_bounds() {
        assert_eq!(0usize.clamp(1, MAX_NATIVE_CYCLE_CONCURRENCY), 1);
        assert_eq!(
            99usize.clamp(1, MAX_NATIVE_CYCLE_CONCURRENCY),
            MAX_NATIVE_CYCLE_CONCURRENCY
        );
    }

    #[test]
    fn conditional_headers_passthrough_when_not_forced() {
        let feed = feed_with_headers(Some("\"abc\""), Some("Wed, 30 Jun 2026 02:00:00 GMT"));
        let (etag, last_modified) = conditional_headers(&feed, false);
        assert_eq!(etag.as_deref(), Some("\"abc\""));
        assert_eq!(
            last_modified.as_deref(),
            Some("Wed, 30 Jun 2026 02:00:00 GMT")
        );
    }

    #[test]
    fn conditional_headers_stripped_when_forced() {
        let feed = feed_with_headers(Some("\"abc\""), Some("Wed, 30 Jun 2026 02:00:00 GMT"));
        let (etag, last_modified) = conditional_headers(&feed, true);
        assert!(etag.is_none());
        assert!(last_modified.is_none());
    }

    #[test]
    fn conditional_headers_none_when_feed_has_none() {
        let feed = feed_with_headers(None, None);
        let (etag, last_modified) = conditional_headers(&feed, false);
        assert!(etag.is_none());
        assert!(last_modified.is_none());
    }

    #[test]
    fn scheduler_feed_row_maps_to_entry_fields() {
        let row = SchedulerFeedRow {
            id: "f1".to_string(),
            title: "Title".to_string(),
            url: "https://example.com/rss".to_string(),
            last_fetched: Some("2026-06-30T02:00:00.000Z".to_string()),
            last_failed_fetch_at: None,
            sort_order: 3,
            update_frequency_score: 1.5,
            consecutive_failures: 2,
        };
        let entry = scheduler_feed_entry_from_scheduler_row(&row);
        assert_eq!(entry.feed_id, "f1");
        assert_eq!(entry.feed_url, "https://example.com/rss");
        assert_eq!(entry.feed_title, "Title");
        assert_eq!(entry.sort_order, 3);
        assert_eq!(entry.update_frequency_score, 1.5);
        assert_eq!(entry.consecutive_failures, 2);
        assert!(entry.last_fetched_ms.is_some());
        assert!(entry.last_failed_fetch_at_ms.is_none());
    }

    #[test]
    fn cancelled_fetch_does_not_record_feed_failure() {
        let cancelled = r#"{"code":"FEED_REQUEST_CANCELLED","message":"Feed request was cancelled."}"#;
        assert!(!should_record_feed_failure(cancelled));
    }

    #[test]
    fn other_fetch_errors_record_feed_failure() {
        let http = r#"{"code":"FEED_HTTP_STATUS","message":"HTTP request failed with status 404 Not Found.","httpStatus":404}"#;
        assert!(should_record_feed_failure(http));
        assert!(should_record_feed_failure("Feed request was cancelled."));
        assert!(should_record_feed_failure(""));
    }

    fn priority_entry(feed_id: &str) -> FeedPriorityEntry {
        let row = SchedulerFeedRow {
            id: feed_id.to_string(),
            title: "Title".to_string(),
            url: "https://example.com/rss".to_string(),
            last_fetched: None,
            last_failed_fetch_at: None,
            sort_order: 0,
            update_frequency_score: 0.0,
            consecutive_failures: 0,
        };
        FeedPriorityEntry {
            entry: scheduler_feed_entry_from_scheduler_row(&row),
            score: 0.0,
        }
    }

    #[test]
    fn resolve_chunk_feeds_skips_feeds_deleted_after_planning() {
        let chunk = vec![
            priority_entry("feed-1"),
            priority_entry("deleted"),
            priority_entry("feed-3"),
        ];
        let mut feeds_by_id = HashMap::new();
        for id in ["feed-1", "feed-3"] {
            let mut feed = feed_with_headers(None, None);
            feed.id = id.to_string();
            feeds_by_id.insert(id.to_string(), feed);
        }

        let resolved = resolve_chunk_feeds(&chunk, &feeds_by_id);
        let ids: Vec<_> = resolved
            .iter()
            .map(|(entry, feed)| (entry.entry.feed_id.as_str(), feed.id.as_str()))
            .collect();
        assert_eq!(ids, vec![("feed-1", "feed-1"), ("feed-3", "feed-3")]);
    }
}
