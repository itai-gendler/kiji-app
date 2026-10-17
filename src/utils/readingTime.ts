/** Words per minute for space-separated scripts. */
const WORDS_PER_MINUTE = 230;
/** Characters per minute for CJK scripts (no word spacing). */
const CJK_CHARS_PER_MINUTE = 500;

const CJK_CHAR_PATTERN = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;
const WORD_PATTERN = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

/**
 * Estimated reading time in whole minutes (minimum 1) for article HTML.
 * Returns 0 when the content has no readable text.
 */
export function estimateReadingMinutes(html: string): number {
  if (!html) return 0;

  const text = html
    .replace(/<(script|style|pre|code)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[#a-z0-9]+;/gi, ' ');

  const cjkChars = text.match(CJK_CHAR_PATTERN)?.length ?? 0;
  const words = text.replace(CJK_CHAR_PATTERN, ' ').match(WORD_PATTERN)?.length ?? 0;
  if (cjkChars === 0 && words === 0) return 0;

  return Math.max(1, Math.round(words / WORDS_PER_MINUTE + cjkChars / CJK_CHARS_PER_MINUTE));
}

/** "Oct 17, 2026" in the user's locale; empty for missing or invalid dates. */
export function formatArticleDate(dateString: string | undefined): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}
