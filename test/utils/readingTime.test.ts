import { describe, expect, it } from 'vitest';

import { estimateReadingMinutes, formatArticleDate } from '@/utils/readingTime';

describe('estimateReadingMinutes', () => {
  it('returns 0 for empty or text-free content', () => {
    expect(estimateReadingMinutes('')).toBe(0);
    expect(estimateReadingMinutes('<p><img src="a.jpg"></p>')).toBe(0);
  });

  it('rounds up to at least one minute for short text', () => {
    expect(estimateReadingMinutes('<p>Hello world</p>')).toBe(1);
  });

  it('counts words outside tags and ignores code blocks', () => {
    const words = Array.from({ length: 690 }, () => 'word').join(' ');
    const code = `<pre>${Array.from({ length: 2000 }, () => 'x').join(' ')}</pre>`;
    expect(estimateReadingMinutes(`<p>${words}</p>${code}`)).toBe(3);
  });

  it('decodes numeric entities before counting (CJK stored as &#NNNNN;)', () => {
    const encoded = Array.from('读'.repeat(1500)).map((char) => `&#${char.codePointAt(0)};`).join('');
    expect(estimateReadingMinutes(`<p>${encoded}</p>`)).toBe(3);
    expect(estimateReadingMinutes(`<p>${'&#x8BFB;'.repeat(1500)}</p>`)).toBe(3);
  });

  it('counts CJK characters at a per-character rate', () => {
    expect(estimateReadingMinutes(`<p>${'读'.repeat(1500)}</p>`)).toBe(3);
  });
});

describe('formatArticleDate', () => {
  it('returns empty for missing or invalid dates', () => {
    expect(formatArticleDate(undefined)).toBe('');
    expect(formatArticleDate('not a date')).toBe('');
  });

  it('formats valid dates', () => {
    expect(formatArticleDate('2026-10-17T12:00:00Z')).toMatch(/2026/);
  });
});
