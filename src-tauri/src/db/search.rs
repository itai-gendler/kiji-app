pub fn create_fts_prefix_query(search_text: &str) -> Option<String> {
    let tokens = search_text
        .split(|character: char| !character.is_alphanumeric())
        .filter(|token| !token.is_empty())
        // FTS5 treats bare uppercase words such as AND, OR, NOT, and NEAR as
        // operators. Quote every user token so all input remains a literal
        // prefix term instead of occasionally becoming invalid FTS syntax.
        .map(|token| format!("\"{}\"*", token.replace('"', "\"\"")))
        .collect::<Vec<_>>();

    if tokens.is_empty() {
        None
    } else {
        Some(tokens.join(" AND "))
    }
}

#[cfg(test)]
mod tests {
    use super::create_fts_prefix_query;

    #[test]
    fn quotes_fts_operator_words_as_literal_prefixes() {
        assert_eq!(
            create_fts_prefix_query("AND OR NOT NEAR"),
            Some("\"AND\"* AND \"OR\"* AND \"NOT\"* AND \"NEAR\"*".to_string())
        );
    }

    #[test]
    fn keeps_unicode_tokens_and_discards_punctuation_only_input() {
        assert_eq!(
            create_fts_prefix_query("KiJi 日本語"),
            Some("\"KiJi\"* AND \"日本語\"*".to_string())
        );
        assert_eq!(create_fts_prefix_query("---"), None);
    }
}
