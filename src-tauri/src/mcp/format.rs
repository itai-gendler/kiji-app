//! Shapes article bodies for agents: Markdown or plain text, with size caps.

use crate::saved::export_format::content_to_markdown_body;

/// Upper bound on HTML handed to the Markdown converter; larger bodies are
/// cut first so one huge page cannot stall a request.
const MAX_HTML_INPUT_BYTES: usize = 2 * 1024 * 1024;
pub const SUMMARY_MAX_CHARS: usize = 300;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum BodyFormat {
    Markdown,
    Text,
}

impl BodyFormat {
    pub fn parse(value: Option<&str>) -> Result<Self, String> {
        match value.map(str::trim).filter(|value| !value.is_empty()) {
            None | Some("markdown") | Some("md") => Ok(Self::Markdown),
            Some("text") | Some("plain") => Ok(Self::Text),
            Some(other) => Err(format!("Unknown format `{other}`. Use `markdown` or `text`.")),
        }
    }
}

pub struct RenderedBody {
    pub body: String,
    pub truncated: bool,
    pub total_chars: usize,
    /// The source was cut before conversion, so `total_chars` is not the
    /// article's full length.
    pub input_cut: bool,
}

pub fn render_body(html_or_text: &str, format: BodyFormat, max_chars: usize) -> RenderedBody {
    let input = cut_at_char_boundary(html_or_text, MAX_HTML_INPUT_BYTES);
    let converted = match format {
        BodyFormat::Markdown => tidy_markdown(&content_to_markdown_body(input)),
        BodyFormat::Text => html_to_text(input),
    };
    let total_chars = converted.chars().count();
    let (body, truncated) = truncate_chars(&converted, max_chars);
    let input_cut = input.len() < html_or_text.len();
    RenderedBody {
        body,
        truncated: truncated || input_cut,
        total_chars,
        input_cut,
    }
}

/// One-line summary from a feed description (HTML or text).
pub fn summarize(description: &str, fallback_html: &str) -> String {
    let source = if description.trim().is_empty() {
        cut_at_char_boundary(fallback_html, 64 * 1024)
    } else {
        cut_at_char_boundary(description, 64 * 1024)
    };
    let text = html_to_text(source);
    truncate_chars(&text, SUMMARY_MAX_CHARS).0
}

/// Truncates to `max_chars` characters, appending an ellipsis when cut.
pub fn truncate_chars(value: &str, max_chars: usize) -> (String, bool) {
    match value.char_indices().nth(max_chars) {
        Some((index, _)) => {
            let mut cut = value[..index].trim_end().to_string();
            cut.push('…');
            (cut, true)
        }
        None => (value.to_string(), false),
    }
}

fn cut_at_char_boundary(value: &str, max_bytes: usize) -> &str {
    if value.len() <= max_bytes {
        return value;
    }
    let mut end = max_bytes;
    while end > 0 && !value.is_char_boundary(end) {
        end -= 1;
    }
    &value[..end]
}

/// Collapses runs of blank lines left behind by the converter.
fn tidy_markdown(markdown: &str) -> String {
    let mut result = String::with_capacity(markdown.len());
    let mut blank_run = 0;
    for line in markdown.lines() {
        if line.trim().is_empty() {
            blank_run += 1;
            if blank_run > 1 {
                continue;
            }
        } else {
            blank_run = 0;
        }
        result.push_str(line.trim_end());
        result.push('\n');
    }
    result.trim().to_string()
}

/// Plain text from HTML: drops script/style blocks and tags, keeps paragraph
/// breaks, decodes common entities, collapses whitespace.
pub fn html_to_text(html: &str) -> String {
    let mut text = String::with_capacity(html.len() / 2);
    let lower = html.to_ascii_lowercase();
    let bytes = html.as_bytes();
    let mut index = 0;

    while index < bytes.len() {
        // Only `<` followed by a tag-ish character starts a tag, so text such
        // as "a < b" survives.
        let starts_tag = bytes[index] == b'<'
            && bytes
                .get(index + 1)
                .map(|next| next.is_ascii_alphabetic() || matches!(next, b'/' | b'!' | b'?'))
                .unwrap_or(false);
        if starts_tag {
            let rest = &lower[index..];
            let skip_block = ["script", "style", "noscript"]
                .iter()
                .find(|tag| rest[1..].starts_with(**tag));
            if let Some(tag) = skip_block {
                let close = format!("</{tag}");
                index = match rest.find(&close) {
                    Some(offset) => {
                        let after = index + offset;
                        lower[after..].find('>').map(|end| after + end + 1).unwrap_or(bytes.len())
                    }
                    None => bytes.len(),
                };
                continue;
            }
            let end = rest.find('>').map(|end| index + end + 1).unwrap_or(bytes.len());
            let tag = &lower[index..end];
            if is_block_tag(tag) {
                text.push('\n');
            }
            index = end;
            continue;
        }
        // Skip past a non-tag `<` (ASCII, so +1 stays on a char boundary).
        let search_from = if bytes[index] == b'<' { index + 1 } else { index };
        let next = lower[search_from..]
            .find('<')
            .map(|offset| search_from + offset)
            .unwrap_or(bytes.len());
        text.push_str(&html[index..next]);
        index = next;
    }

    collapse_whitespace(&decode_entities(&text))
}

fn is_block_tag(tag: &str) -> bool {
    const BLOCKS: [&str; 14] = [
        "<p", "</p", "<br", "<div", "</div", "<li", "<h1", "<h2", "<h3", "<h4", "<tr", "<blockquote",
        "</blockquote", "<hr",
    ];
    BLOCKS.iter().any(|block| {
        tag.starts_with(block)
            && tag[block.len()..]
                .chars()
                .next()
                .map(|ch| !ch.is_ascii_alphanumeric())
                .unwrap_or(true)
    })
}

fn decode_entities(value: &str) -> String {
    if !value.contains('&') {
        return value.to_string();
    }
    let mut result = String::with_capacity(value.len());
    let mut rest = value;
    while let Some(start) = rest.find('&') {
        result.push_str(&rest[..start]);
        let tail = &rest[start..];
        let semicolon = tail
            .char_indices()
            .take(12)
            .find(|(_, ch)| *ch == ';')
            .map(|(index, _)| index);
        let Some(end) = semicolon else {
            result.push('&');
            rest = &tail[1..];
            continue;
        };
        let entity = &tail[1..end];
        let decoded = match entity {
            "amp" => Some('&'),
            "lt" => Some('<'),
            "gt" => Some('>'),
            "quot" => Some('"'),
            "apos" | "#39" => Some('\''),
            "nbsp" => Some(' '),
            _ if entity.starts_with("#x") || entity.starts_with("#X") => {
                u32::from_str_radix(&entity[2..], 16).ok().and_then(char::from_u32)
            }
            _ if entity.starts_with('#') => entity[1..].parse::<u32>().ok().and_then(char::from_u32),
            _ => None,
        };
        match decoded {
            Some(ch) => {
                result.push(ch);
                rest = &tail[end + 1..];
            }
            None => {
                result.push('&');
                rest = &tail[1..];
            }
        }
    }
    result.push_str(rest);
    result
}

fn collapse_whitespace(value: &str) -> String {
    let mut lines: Vec<String> = Vec::new();
    for raw_line in value.split('\n') {
        let line = raw_line.split_whitespace().collect::<Vec<_>>().join(" ");
        if line.is_empty() {
            if lines.last().map(|last| !last.is_empty()).unwrap_or(false) {
                lines.push(String::new());
            }
        } else {
            lines.push(line);
        }
    }
    lines.join("\n").trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn html_to_text_drops_scripts_and_keeps_paragraphs() {
        let html = "<p>Hello&nbsp;<b>world</b> &amp; friends</p><script>alert('x')</script><p>Second&#33;</p>";
        assert_eq!(html_to_text(html), "Hello world & friends\n\nSecond!");
    }

    #[test]
    fn plain_less_than_signs_are_kept() {
        assert_eq!(html_to_text("a < b and 3 <4"), "a < b and 3 <4");
        assert_eq!(html_to_text("x <b>bold</b> y"), "x bold y");
        assert_eq!(html_to_text("<"), "<");
        assert_eq!(html_to_text("日本 < 語 <p>段落</p>"), "日本 < 語\n段落");
    }

    #[test]
    fn markdown_render_converts_html_and_reports_truncation() {
        let html = "<h2>Title</h2><p>Body text that is long enough</p>";
        let full = render_body(html, BodyFormat::Markdown, 10_000);
        assert!(full.body.contains("Title"));
        assert!(full.body.contains("Body text"));
        assert!(!full.truncated);

        let cut = render_body(html, BodyFormat::Markdown, 8);
        assert!(cut.truncated);
        assert!(cut.body.ends_with('…'));
        assert!(cut.total_chars > 8);
    }

    #[test]
    fn truncation_respects_multibyte_characters() {
        let (cut, truncated) = truncate_chars("日本語のテキスト", 3);
        assert!(truncated);
        assert_eq!(cut, "日本語…");
    }

    #[test]
    fn summary_falls_back_to_content_and_caps_length() {
        let long = format!("<p>{}</p>", "word ".repeat(200));
        let summary = summarize("", &long);
        assert!(summary.chars().count() <= SUMMARY_MAX_CHARS + 1);
        assert!(summary.starts_with("word word"));
        assert_eq!(summarize("<p>Short</p>", &long), "Short");
    }

    #[test]
    fn format_parse_accepts_known_values_only() {
        assert_eq!(BodyFormat::parse(None).unwrap(), BodyFormat::Markdown);
        assert_eq!(BodyFormat::parse(Some("text")).unwrap(), BodyFormat::Text);
        assert!(BodyFormat::parse(Some("html")).is_err());
    }
}
