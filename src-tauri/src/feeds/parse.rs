use crate::feeds::types::{
    NativeEnclosure, NativeFeedAuthor, NativeFeedItem, NativeFeedParsePreviewResponse,
    NativeMediaThumbnail,
};
use crate::diagnostics::robustness::{record_many, RobustnessCounter};
use chrono::{DateTime, Utc};
use feed_rs::model::{Entry, Link, MediaObject, Text};
use feed_rs::parser::{self, generate_id};
use std::io::Cursor;

const PARSER_PATH: &str = "feed-rs";
const KNOWN_PARITY_GAPS: &[&str] = &[
    "RDF/RSS 1.0 feeds are not supported by feed-rs; renderer still uses feedsmith rdf fallback.",
    "Non-standard XML date enrichment via DOMParser is not replicated natively.",
    "Feeds with unescaped HTML inside Atom summary/content may fail feed-rs strict XML parsing while feedsmith succeeds (for example simon.xml).",
    "Preview image extraction from inline HTML is best-effort only.",
    "iTunes episode/season metadata is not mapped in the native preview slice yet.",
    "Renderer feedsmith remains the production parser until parity gaps close.",
];

pub fn parse_feed_preview(
    raw_text: String,
    feed_url: String,
) -> Result<NativeFeedParsePreviewResponse, String> {
    let trimmed = raw_text.trim();
    if trimmed.is_empty() {
        return Err("Received empty feed body.".to_string());
    }

    let format_hint = detect_format_hint(trimmed);
    let feed = parser::Builder::new()
        .id_generator(stable_id_generator)
        .build()
        .parse(Cursor::new(trimmed.as_bytes()))
        .map_err(|error| format!("Native feed parse failed: {error}"))?;
    let items = feed
        .entries
        .iter()
        .enumerate()
        .map(|(index, entry)| convert_entry(entry, &feed_url, index))
        .collect::<Vec<_>>();
    record_many(
        RobustnessCounter::ItemsWithoutIdentity,
        count_items_without_identity(&items),
    );

    Ok(NativeFeedParsePreviewResponse {
        format: format_hint,
        item_count: items.len(),
        items,
        parser_path: PARSER_PATH.to_string(),
        parity_gaps: KNOWN_PARITY_GAPS.iter().map(|gap| (*gap).to_string()).collect(),
    })
}

/// Items with neither link nor guid; their hash falls back to title/content.
fn count_items_without_identity(items: &[NativeFeedItem]) -> u64 {
    items
        .iter()
        .filter(|item| item.link.is_none() && item.guid.is_none())
        .count() as u64
}

/// Same as feed-rs's default `generate_id`, except that when it would fall back
/// to a random UUID we return "" instead. A random id would become the item's
/// guid and change the article hash on every fetch, inserting duplicates.
fn stable_id_generator(links: &[Link], title: &Option<Text>, uri: Option<&str>) -> String {
    if links.is_empty() && (uri.is_none() || title.is_none()) {
        return String::new();
    }
    generate_id(links, title, uri)
}

#[tauri::command(rename_all = "camelCase")]
pub fn feeds_parse_preview(
    raw_text: String,
    feed_url: String,
) -> Result<NativeFeedParsePreviewResponse, String> {
    parse_feed_preview(raw_text, feed_url)
}

fn detect_format_hint(raw_text: &str) -> String {
    let trimmed = raw_text.trim_start();
    if trimmed.starts_with('{') {
        return "json".to_string();
    }
    if trimmed.contains("xmlns=\"http://www.w3.org/2005/Atom\"") || trimmed.contains("<feed") {
        return "atom".to_string();
    }
    if trimmed.contains("<rss") {
        return "rss".to_string();
    }
    if trimmed.contains("<rdf:RDF") {
        return "rdf".to_string();
    }
    "unknown".to_string()
}

fn convert_entry(entry: &Entry, feed_url: &str, index: usize) -> NativeFeedItem {
    let content_value = entry_content(entry);
    let summary_value = entry_summary(entry);
    let link = entry_link(entry);
    let images = entry_images(entry);
    let thumbnail = entry_thumbnail(entry, &images);
    let preview_image = thumbnail
        .as_ref()
        .map(|value| value.url.clone())
        .or_else(|| images.first().cloned());
    let enclosures = entry_enclosures(entry);
    let authors = entry_authors(entry);
    let author = authors
        .first()
        .map(|value| value.name.clone())
        .or_else(|| entry.authors.first().map(|value| value.name.clone()));
    let guid = if entry.id.is_empty() {
        None
    } else {
        Some(entry.id.clone())
    };
    let id = guid
        .clone()
        .unwrap_or_else(|| generate_item_id(feed_url, index));
    let published_date = entry
        .published
        .or(entry.updated)
        .map(format_timestamp);
    let updated_date = entry.updated.map(format_timestamp);
    let summary = summary_value
        .filter(|summary| Some(summary.as_str()) != content_value.as_deref());

    NativeFeedItem {
        id,
        title: entry
            .title
            .as_ref()
            .map(|value| value.content.clone())
            .unwrap_or_default(),
        content: content_value.unwrap_or_default(),
        link,
        author,
        published_date,
        feed_id: feed_url.to_string(),
        updated_date,
        summary,
        guid,
        preview_image,
        thumbnail,
        images: non_empty_vec(images),
        enclosures: non_empty_vec(enclosures),
        categories: non_empty_vec(entry_categories(entry)),
        authors: non_empty_vec(authors),
        duration: entry_duration(entry),
        episode_number: None,
        season_number: None,
    }
}

fn entry_content(entry: &Entry) -> Option<String> {
    entry
        .content
        .as_ref()
        .and_then(|content| content.body.clone())
        .filter(|value| !value.is_empty())
        .or_else(|| entry_summary(entry))
}

fn entry_summary(entry: &Entry) -> Option<String> {
    text_value(&entry.summary)
}

fn text_value(text: &Option<Text>) -> Option<String> {
    text.as_ref()
        .map(|value| value.content.clone())
        .filter(|value| !value.is_empty())
}

fn entry_link(entry: &Entry) -> Option<String> {
    entry
        .links
        .iter()
        .find(|link| link.rel.as_deref() == Some("alternate") || link.rel.is_none())
        .map(|link| link.href.clone())
        .or_else(|| entry.links.first().map(|link| link.href.clone()))
}

fn entry_categories(entry: &Entry) -> Vec<String> {
    entry
        .categories
        .iter()
        .map(|category| {
            if category.term.is_empty() {
                category.label.clone().unwrap_or_default()
            } else {
                category.term.clone()
            }
        })
        .filter(|value| !value.is_empty())
        .collect()
}

fn entry_authors(entry: &Entry) -> Vec<NativeFeedAuthor> {
    entry
        .authors
        .iter()
        .filter(|author| !author.name.is_empty())
        .map(|author| NativeFeedAuthor {
            name: author.name.clone(),
            email: author.email.clone(),
            uri: author.uri.clone(),
        })
        .collect()
}

fn entry_images(entry: &Entry) -> Vec<String> {
    let mut images = Vec::new();
    for media in &entry.media {
        collect_media_images(media, &mut images);
    }
    images.sort();
    images.dedup();
    images
}

/// Audio/video file extensions that must never be used as an image source.
const NON_IMAGE_MEDIA_EXTENSIONS: &[&str] = &[
    "mp3", "m4a", "aac", "ogg", "oga", "opus", "wav", "flac", "mp4", "m4v", "mov", "webm", "mkv",
    "avi", "m3u8", "mpd",
];

/// True when a URL's path ends in an audio/video file extension.
pub(crate) fn has_non_image_media_extension(url: &str) -> bool {
    let path = url.split(['?', '#']).next().unwrap_or(url);
    let Some((_, extension)) = path.rsplit_once('.') else {
        return false;
    };
    if extension.contains('/') {
        return false;
    }
    NON_IMAGE_MEDIA_EXTENSIONS.contains(&extension.to_ascii_lowercase().as_str())
}

/// `media:content` (and enclosures feed-rs maps into it) can be audio or video.
/// Only declared `image/*` content, or untyped content whose URL is not an
/// audio/video file, may be used as an article image.
fn is_image_media_content(content_type: Option<&str>, url: &str) -> bool {
    match content_type {
        Some(mime) => mime.trim().to_ascii_lowercase().starts_with("image/"),
        None => !has_non_image_media_extension(url),
    }
}

fn collect_media_images(media: &MediaObject, images: &mut Vec<String>) {
    for item in &media.content {
        if let Some(url) = item.url.as_ref() {
            let content_type = item.content_type.as_ref().map(|value| value.to_string());
            if is_image_media_content(content_type.as_deref(), url.as_str()) {
                images.push(url.to_string());
            }
        }
    }
    for thumbnail in &media.thumbnails {
        images.push(thumbnail.image.uri.clone());
    }
}

fn entry_thumbnail(entry: &Entry, images: &[String]) -> Option<NativeMediaThumbnail> {
    for media in &entry.media {
        if let Some(thumbnail) = media.thumbnails.first() {
            return Some(NativeMediaThumbnail {
                url: thumbnail.image.uri.clone(),
                width: thumbnail.image.width,
                height: thumbnail.image.height,
            });
        }
    }

    images.first().cloned().map(|url| NativeMediaThumbnail {
        url,
        width: None,
        height: None,
    })
}

fn entry_enclosures(entry: &Entry) -> Vec<NativeEnclosure> {
    let mut enclosures = Vec::new();
    for link in &entry.links {
        if link.rel.as_deref() == Some("enclosure") {
            push_link_enclosure(link, &mut enclosures);
        }
    }
    for media in &entry.media {
        for item in &media.content {
            if let Some(url) = item.url.as_ref() {
                enclosures.push(NativeEnclosure {
                    url: url.to_string(),
                    mime_type: item
                        .content_type
                        .as_ref()
                        .map(|value| value.to_string()),
                    length: item.size,
                    duration: item.duration.map(duration_seconds),
                });
            }
        }
    }
    enclosures.sort_by(|left, right| left.url.cmp(&right.url));
    enclosures.dedup_by(|left, right| left.url == right.url);
    enclosures
}

fn push_link_enclosure(link: &Link, enclosures: &mut Vec<NativeEnclosure>) {
    if link.href.is_empty() {
        return;
    }
    enclosures.push(NativeEnclosure {
        url: link.href.clone(),
        mime_type: link.media_type.clone(),
        length: link.length,
        duration: None,
    });
}

fn entry_duration(entry: &Entry) -> Option<f64> {
    entry
        .media
        .iter()
        .find_map(|media| media.duration.map(duration_seconds))
}

fn duration_seconds(duration: std::time::Duration) -> f64 {
    duration.as_secs_f64()
}

fn format_timestamp(timestamp: DateTime<Utc>) -> String {
    timestamp.to_rfc3339()
}

fn generate_item_id(feed_url: &str, index: usize) -> String {
    format!("{feed_url}#item-{index}")
}

fn non_empty_vec<T>(values: Vec<T>) -> Option<Vec<T>> {
    if values.is_empty() {
        None
    } else {
        Some(values)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::feeds::article_hash::generate_article_hash;
    use std::fs;
    use std::path::PathBuf;

    fn read_fixture(name: &str) -> Option<String> {
        let mut path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        path.push("../test/data");
        path.push(name);
        fs::read_to_string(path).ok()
    }

    #[test]
    fn records_simon_fixture_as_known_xml_parity_gap() {
        let Some(raw) = read_fixture("simon.xml") else {
            return;
        };
        let error = parse_feed_preview(
            raw,
            "https://simonwillison.net/atom/everything/".to_string(),
        )
        .expect_err("feed-rs strict xml");

        assert!(error.contains("ill-formed") || error.contains("parse"));
    }

    #[test]
    fn parses_android_atom_fixture() {
        let Some(raw) = read_fixture("androidFeed.xml") else {
            return;
        };
        let preview = parse_feed_preview(
            raw,
            "https://android-developers.googleblog.com/atom.xml".to_string(),
        )
        .expect("preview parse");

        assert_eq!(preview.format, "atom");
        assert!(preview.item_count > 0);
        assert!(!preview.items[0].title.is_empty());
        assert!(!preview.items[0].content.is_empty());
    }

    #[test]
    fn parses_image_enclosure_fixture() {
        let Some(raw) = read_fixture("feedwithimage.xml") else {
            return;
        };
        let preview = parse_feed_preview(raw, "https://toyokeizai.net/list/feed/rss".to_string())
            .expect("preview parse");
        let item = &preview.items[0];
        let image_url =
            "https://tk.ismcdn.jp/mwimgs/4/0/1200w/img_404b091d5672eb558b1d82a7c2617876779430.jpg?nextgen=false";

        assert_eq!(preview.item_count, 1);
        assert_eq!(item.preview_image.as_deref(), Some(image_url));
        assert_eq!(item.thumbnail.as_ref().map(|value| value.url.as_str()), Some(image_url));
        assert!(item.images.as_ref().is_some_and(|images| images.contains(&image_url.to_string())));
        assert!(item.enclosures.as_ref().is_some_and(|enclosures| {
            enclosures.iter().any(|enclosure| enclosure.url == image_url)
        }));
    }

    #[test]
    fn parses_rss_fixture_links_and_titles() {
        let Some(raw) = read_fixture("caminodetexas.xml") else {
            return;
        };
        let preview = parse_feed_preview(raw, "https://caminodetexas.substack.com/feed".to_string())
            .expect("preview parse");

        assert!(preview.item_count > 0);
        assert!(preview.items[0].link.as_deref().unwrap_or("").contains("/p/"));
        assert!(!preview.items[0].title.is_empty());
        assert_eq!(preview.items[0].feed_id, "https://caminodetexas.substack.com/feed");
    }

    #[test]
    fn podcast_audio_enclosure_is_not_an_image() {
        let Some(raw) = read_fixture("caminodetexas.xml") else {
            return;
        };
        let preview = parse_feed_preview(raw, "https://caminodetexas.substack.com/feed".to_string())
            .expect("preview parse");

        for item in &preview.items {
            let image_urls = item
                .images
                .iter()
                .flatten()
                .chain(item.preview_image.iter())
                .chain(item.thumbnail.iter().map(|value| &value.url));
            for url in image_urls {
                assert!(!has_non_image_media_extension(url), "audio used as image: {url}");
            }
        }
        assert!(preview.items.iter().any(|item| {
            item.enclosures.as_ref().is_some_and(|enclosures| {
                enclosures.iter().any(|enclosure| enclosure.url.contains(".mp3"))
            })
        }));
    }

    #[test]
    fn video_media_content_is_not_an_image_but_its_thumbnail_is() {
        let raw = r#"<?xml version="1.0"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel><title>t</title><link>https://example.com</link>
<item><title>Clip</title><link>https://example.com/a</link><guid>a</guid>
<media:content url="https://cdn.example.com/lead.mp4" type="video/mp4" medium="video"><media:thumbnail url="https://cdn.example.com/poster.jpg"/></media:content>
</item></channel></rss>"#;
        let preview = parse_feed_preview(raw.to_string(), "https://example.com/feed".to_string())
            .expect("preview parse");
        let item = &preview.items[0];

        assert_eq!(item.preview_image.as_deref(), Some("https://cdn.example.com/poster.jpg"));
        assert!(item.images.iter().flatten().all(|url| !url.ends_with(".mp4")));
    }

    #[test]
    fn classifies_media_urls_by_type_then_extension() {
        assert!(is_image_media_content(Some("image/jpeg"), "https://x/a"));
        assert!(!is_image_media_content(Some("audio/mpeg"), "https://x/a.jpg"));
        assert!(!is_image_media_content(None, "https://x/ep.MP3?dest-id=1"));
        assert!(is_image_media_content(None, "https://x/img?w=800"));
        assert!(!has_non_image_media_extension("https://x.mp3/image"));
    }

    #[test]
    fn rejects_empty_feed_body() {
        let error = parse_feed_preview(String::new(), "https://example.com/feed.xml".to_string())
            .expect_err("empty body");
        assert!(error.contains("empty"));
    }

    #[test]
    fn documents_known_parity_gaps() {
        let preview = parse_feed_preview(
            r#"<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>Example</title>
  <entry>
    <title>Hello</title>
    <id>entry-1</id>
    <updated>2026-06-22T00:00:00Z</updated>
    <content type="html">Native preview body</content>
  </entry>
</feed>"#
                .to_string(),
            "https://example.com/atom.xml".to_string(),
        )
        .expect("minimal atom");

        assert!(preview.parity_gaps.iter().any(|gap| gap.contains("feedsmith")));
    }

    const RSS_WITHOUT_LINK_OR_GUID: &str = r#"<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <title>Example</title>
    <link>https://example.com/</link>
    <item>
      <title>No link or guid</title>
      <description>Body</description>
    </item>
    <item>
      <title>Has guid</title>
      <guid isPermaLink="false">guid-123</guid>
    </item>
  </channel>
</rss>"#;

    #[test]
    fn item_without_link_or_guid_has_stable_hash_across_parses() {
        let parse = || {
            parse_feed_preview(
                RSS_WITHOUT_LINK_OR_GUID.to_string(),
                "https://example.com/feed.xml".to_string(),
            )
            .expect("rss parse")
        };
        let first = parse();
        let second = parse();

        assert!(first.items[0].link.is_none());
        assert!(first.items[0].guid.is_none());
        assert_eq!(
            generate_article_hash(&first.items[0]),
            generate_article_hash(&second.items[0])
        );
    }

    #[test]
    fn counts_items_without_link_or_guid() {
        let before = crate::diagnostics::robustness::snapshot().items_without_identity;
        let preview = parse_feed_preview(
            RSS_WITHOUT_LINK_OR_GUID.to_string(),
            "https://example.com/feed.xml".to_string(),
        )
        .expect("rss parse");

        assert_eq!(count_items_without_identity(&preview.items), 1);
        assert!(crate::diagnostics::robustness::snapshot().items_without_identity > before);
    }

    #[test]
    fn item_with_guid_keeps_it() {
        let preview = parse_feed_preview(
            RSS_WITHOUT_LINK_OR_GUID.to_string(),
            "https://example.com/feed.xml".to_string(),
        )
        .expect("rss parse");

        assert_eq!(preview.items[1].guid.as_deref(), Some("guid-123"));
    }

    #[test]
    fn item_with_link_keeps_feed_rs_generated_guid() {
        let raw = r#"<?xml version="1.0" encoding="utf-8"?>
<rss version="2.0">
  <channel>
    <title>Example</title>
    <item>
      <title>Linked</title>
      <link>https://example.com/post</link>
    </item>
  </channel>
</rss>"#;
        let default_id = parser::parse(Cursor::new(raw.as_bytes()))
            .expect("default parse")
            .entries[0]
            .id
            .clone();
        let preview = parse_feed_preview(raw.to_string(), "https://example.com/feed.xml".to_string())
            .expect("rss parse");

        assert!(!default_id.is_empty());
        assert_eq!(preview.items[0].guid.as_deref(), Some(default_id.as_str()));
    }
}
