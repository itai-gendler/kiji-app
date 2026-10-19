//! Parses agent-supplied `since` / `until` values into the stored date format.
//!
//! Article dates are stored as UTC RFC 3339 with milliseconds and a `Z`
//! suffix (`2026-10-19T03:06:24.000Z`), so bounds rendered the same way
//! compare correctly as plain strings in SQL.

use chrono::{
    DateTime, Datelike, Duration, FixedOffset, Local, NaiveDate, NaiveDateTime, NaiveTime,
    SecondsFormat, TimeZone, Utc,
};

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct ResolvedRange {
    /// Inclusive lower bound (stored format), if any.
    pub since: Option<String>,
    /// Exclusive upper bound (stored format), if any.
    pub until: Option<String>,
}

/// Which edge of the range a value describes. Date-only values expand to the
/// start of that day for `since` and the start of the next day for `until`,
/// so `until=2026-10-19` includes all of the 19th.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum Edge {
    Since,
    Until,
}

pub fn resolve_range(
    since: Option<&str>,
    until: Option<&str>,
    now: DateTime<Utc>,
    offset: FixedOffset,
) -> Result<ResolvedRange, String> {
    let since = since
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| parse_bound(value, Edge::Since, now, offset))
        .transpose()?;
    let until = until
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .map(|value| parse_bound(value, Edge::Until, now, offset))
        .transpose()?;

    if let (Some(start), Some(end)) = (&since, &until) {
        if start >= end {
            return Err("`since` must be earlier than `until`.".to_string());
        }
    }

    Ok(ResolvedRange {
        since: since.map(format_stored),
        until: until.map(format_stored),
    })
}

/// Resolves a range against the current time in the user's local timezone.
pub fn resolve_range_now(since: Option<&str>, until: Option<&str>) -> Result<ResolvedRange, String> {
    let now = Utc::now();
    let offset = *Local::now().offset();
    resolve_range(since, until, now, offset)
}

pub fn format_stored(value: DateTime<Utc>) -> String {
    value.to_rfc3339_opts(SecondsFormat::Millis, true)
}

fn parse_bound(
    raw: &str,
    edge: Edge,
    now: DateTime<Utc>,
    offset: FixedOffset,
) -> Result<DateTime<Utc>, String> {
    let lower = raw.to_ascii_lowercase();
    let local_now = now.with_timezone(&offset);
    let today_start = local_midnight(local_now.date_naive(), offset)?;

    match lower.as_str() {
        "now" => return Ok(now),
        "today" => {
            return Ok(match edge {
                Edge::Since => today_start,
                Edge::Until => today_start + Duration::days(1),
            })
        }
        "yesterday" => {
            return Ok(match edge {
                Edge::Since => today_start - Duration::days(1),
                Edge::Until => today_start,
            })
        }
        "this_week" | "this-week" | "week" => {
            let days_from_monday = i64::from(local_now.weekday().num_days_from_monday());
            let week_start = today_start - Duration::days(days_from_monday);
            return Ok(match edge {
                Edge::Since => week_start,
                Edge::Until => week_start + Duration::days(7),
            });
        }
        _ => {}
    }

    if let Some(duration) = parse_relative(&lower) {
        return Ok(now - duration);
    }

    if let Ok(parsed) = DateTime::parse_from_rfc3339(raw) {
        return Ok(parsed.with_timezone(&Utc));
    }

    for pattern in ["%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d %H:%M"] {
        if let Ok(naive) = NaiveDateTime::parse_from_str(raw, pattern) {
            return local_to_utc(naive, offset);
        }
    }

    if let Ok(date) = NaiveDate::parse_from_str(raw, "%Y-%m-%d") {
        let start = local_midnight(date, offset)?;
        return Ok(match edge {
            Edge::Since => start,
            Edge::Until => start + Duration::days(1),
        });
    }

    Err(format!(
        "Could not read the date `{raw}`. Use ISO 8601 (2026-10-19 or 2026-10-19T08:00:00Z) or a relative value such as 24h, 7d, 2w, today, yesterday, this_week."
    ))
}

/// `30m`, `24h`, `7d`, `2w` (optionally with a trailing `ago`).
fn parse_relative(value: &str) -> Option<Duration> {
    let trimmed = value.trim_end_matches("ago").trim();
    // Split off the last character (not byte): input may be any script.
    let (unit_index, unit) = trimmed.char_indices().last()?;
    let number = &trimmed[..unit_index];
    if number.is_empty() {
        return None;
    }
    let amount: i64 = number.trim().parse().ok()?;
    if !(0..=3650).contains(&amount) {
        return None;
    }
    match unit {
        'm' => Some(Duration::minutes(amount)),
        'h' => Some(Duration::hours(amount)),
        'd' => Some(Duration::days(amount)),
        'w' => Some(Duration::weeks(amount)),
        _ => None,
    }
}

fn local_midnight(date: NaiveDate, offset: FixedOffset) -> Result<DateTime<Utc>, String> {
    local_to_utc(date.and_time(NaiveTime::MIN), offset)
}

fn local_to_utc(naive: NaiveDateTime, offset: FixedOffset) -> Result<DateTime<Utc>, String> {
    offset
        .from_local_datetime(&naive)
        .single()
        .map(|value| value.with_timezone(&Utc))
        .ok_or_else(|| "That local time does not exist.".to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn fixed_now() -> DateTime<Utc> {
        // Sunday 2026-10-18 23:30 in UTC+8 (Monday morning would be the next day).
        DateTime::parse_from_rfc3339("2026-10-18T15:30:00Z")
            .unwrap()
            .with_timezone(&Utc)
    }

    fn utc8() -> FixedOffset {
        FixedOffset::east_opt(8 * 3600).unwrap()
    }

    #[test]
    fn relative_tokens_subtract_from_now() {
        let range = resolve_range(Some("24h"), None, fixed_now(), utc8()).unwrap();
        assert_eq!(range.since.as_deref(), Some("2026-10-17T15:30:00.000Z"));
        assert_eq!(range.until, None);

        let range = resolve_range(Some("7d"), Some("now"), fixed_now(), utc8()).unwrap();
        assert_eq!(range.since.as_deref(), Some("2026-10-11T15:30:00.000Z"));
        assert_eq!(range.until.as_deref(), Some("2026-10-18T15:30:00.000Z"));

        let range = resolve_range(Some("2w ago"), None, fixed_now(), utc8()).unwrap();
        assert_eq!(range.since.as_deref(), Some("2026-10-04T15:30:00.000Z"));
    }

    #[test]
    fn today_and_yesterday_use_the_local_day() {
        let range = resolve_range(Some("today"), Some("today"), fixed_now(), utc8()).unwrap();
        // Local day 2026-10-18 in UTC+8 starts at 2026-10-17T16:00Z.
        assert_eq!(range.since.as_deref(), Some("2026-10-17T16:00:00.000Z"));
        assert_eq!(range.until.as_deref(), Some("2026-10-18T16:00:00.000Z"));

        let range = resolve_range(Some("yesterday"), Some("yesterday"), fixed_now(), utc8()).unwrap();
        assert_eq!(range.since.as_deref(), Some("2026-10-16T16:00:00.000Z"));
        assert_eq!(range.until.as_deref(), Some("2026-10-17T16:00:00.000Z"));
    }

    #[test]
    fn this_week_starts_on_local_monday() {
        let range = resolve_range(Some("this_week"), None, fixed_now(), utc8()).unwrap();
        // Local Sunday 2026-10-18 → Monday 2026-10-12 00:00 local.
        assert_eq!(range.since.as_deref(), Some("2026-10-11T16:00:00.000Z"));
    }

    #[test]
    fn date_only_until_includes_the_whole_day() {
        let range =
            resolve_range(Some("2026-10-01"), Some("2026-10-01"), fixed_now(), utc8()).unwrap();
        assert_eq!(range.since.as_deref(), Some("2026-09-30T16:00:00.000Z"));
        assert_eq!(range.until.as_deref(), Some("2026-10-01T16:00:00.000Z"));
    }

    #[test]
    fn rfc3339_and_local_datetimes_parse() {
        let range = resolve_range(
            Some("2026-10-01T08:00:00+02:00"),
            Some("2026-10-02T09:15"),
            fixed_now(),
            utc8(),
        )
        .unwrap();
        assert_eq!(range.since.as_deref(), Some("2026-10-01T06:00:00.000Z"));
        assert_eq!(range.until.as_deref(), Some("2026-10-02T01:15:00.000Z"));
    }

    #[test]
    fn rejects_garbage_and_inverted_ranges() {
        assert!(resolve_range(Some("last tuesday"), None, fixed_now(), utc8()).is_err());
        assert!(resolve_range(Some("99999d"), None, fixed_now(), utc8()).is_err());
        assert!(resolve_range(Some("2026-10-02"), Some("2026-10-01"), fixed_now(), utc8()).is_err());
    }

    #[test]
    fn non_ascii_values_are_rejected_without_panicking() {
        for value in ["昨日", "7日", "é", "日", "3週間", "🙂"] {
            assert!(resolve_range(Some(value), None, fixed_now(), utc8()).is_err(), "{value}");
        }
    }

    #[test]
    fn blank_values_mean_unbounded() {
        let range = resolve_range(Some("  "), None, fixed_now(), utc8()).unwrap();
        assert_eq!(range, ResolvedRange { since: None, until: None });
    }
}
