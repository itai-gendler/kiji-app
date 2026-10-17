import JSZip from 'jszip';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  getRobustnessSnapshot,
  resetRobustnessMetricsForTests,
} from '@/services/diagnostics/robustnessMetrics';
import { HELPER_TASK_KIND, type SavedArticlesImportTaskResult } from '@/services/tasks/helperTaskContracts';
import { runHelperTask } from '@/services/tasks/taskOperations';

const markdown = (title: string, body: string) => `# ${title}\nSource: unknown\n\n---\n\n${body}`;

/** Builds a ZIP the way src-tauri saved/export_service.rs does: rows and .md files in the same order. */
const buildRustStyleExport = async (
  rows: Array<{ csvTitle: string; url: string; fileName: string; body: string }>,
): Promise<Uint8Array> => {
  const zip = new JSZip();
  let csv = 'title,url,time_added,tags\n';
  for (const row of rows) {
    csv += `"${row.csvTitle.replace(/"/g, '""')}","${row.url}",1700000000,""\n`;
    zip.file(`articles/${row.fileName}`, markdown(row.csvTitle, row.body));
  }
  zip.file('pocket.csv', csv);
  return zip.generateAsync({ type: 'uint8array' });
};

const importZip = async (zipArrayBuffer: Uint8Array) => (
  await runHelperTask({
    taskId: 'zip-import',
    kind: HELPER_TASK_KIND.SAVED_ARTICLES_IMPORT,
    payload: { zipArrayBuffer },
  })
) as SavedArticlesImportTaskResult;

describe('saved articles ZIP import', () => {
  beforeEach(() => {
    resetRobustnessMetricsForTests();
  });

  it('maps duplicate titles to the exporter -N files in row order', async () => {
    const zipArrayBuffer = await buildRustStyleExport([
      { csvTitle: 'Untitled', url: 'https://a.example/1', fileName: 'Untitled.md', body: 'first body' },
      { csvTitle: 'Untitled', url: 'https://a.example/2', fileName: 'Untitled-2.md', body: 'second body' },
      { csvTitle: 'Other', url: 'https://a.example/3', fileName: 'Other.md', body: 'other body' },
      { csvTitle: 'Untitled', url: 'https://a.example/4', fileName: 'Untitled-3.md', body: 'third body' },
    ]);

    const { articles } = await importZip(zipArrayBuffer);

    expect(articles.map((article) => [article.url, article.content])).toEqual([
      ['https://a.example/1', 'first body'],
      ['https://a.example/2', 'second body'],
      ['https://a.example/3', 'other body'],
      ['https://a.example/4', 'third body'],
    ]);
  });

  it('uses the Rust sanitizer names, including the empty-title default', async () => {
    const zipArrayBuffer = await buildRustStyleExport([
      // Rust: Some("") -> normalize "" -> sanitize -> "untitled".
      { csvTitle: '', url: 'https://b.example/1', fileName: 'untitled.md', body: 'empty title body' },
      // Rust keeps a trailing ellipsis character and leading quote; TS sanitizeTitle strips them.
      { csvTitle: "'Quoted' thoughts…", url: 'https://b.example/2', fileName: "'Quoted' thoughts….md", body: 'quoted body' },
      { csvTitle: 'What: now?', url: 'https://b.example/3', fileName: 'What_ now_.md', body: 'reserved chars body' },
    ]);

    const { articles } = await importZip(zipArrayBuffer);

    expect(articles.map((article) => article.content)).toEqual([
      'empty title body',
      'quoted body',
      'reserved chars body',
    ]);
  });

  it('falls back to the base file for legacy renderer exports that overwrote duplicates', async () => {
    const zip = new JSZip();
    // Legacy TS export wrote every duplicate title to the same `<title>.md`.
    zip.file(
      'pocket.csv',
      'title,url,time_added,tags,status\n"Dup","https://c.example/1",1,,"unread"\n"Dup","https://c.example/2",1,,"unread"\n',
    );
    zip.file('articles/Dup.md', markdown('Dup', 'last written body'));

    const { articles } = await importZip(await zip.generateAsync({ type: 'uint8array' }));

    expect(articles.map((article) => article.content)).toEqual(['last written body', 'last written body']);
  });

  it('records exporter-name hits, legacy fallbacks and missing markdown files', async () => {
    const zip = new JSZip();
    zip.file(
      'pocket.csv',
      [
        'title,url,time_added,tags,status',
        // Exporter name `Dup.md` exists.
        '"Dup","https://d.example/1",1,,"unread"',
        // Exporter name `Dup-2.md` is absent; legacy name `Dup.md` resolves.
        '"Dup","https://d.example/2",1,,"unread"',
        // Neither name exists.
        '"No file","https://d.example/3",1,,"unread"',
        '',
      ].join('\n'),
    );
    zip.file('articles/Dup.md', markdown('Dup', 'dup body'));

    const { articles } = await importZip(await zip.generateAsync({ type: 'uint8array' }));

    expect(articles.map((article) => article.content)).toEqual(['dup body', 'dup body', undefined]);
    expect(getRobustnessSnapshot().counters).toMatchObject({
      'savedZip.markdownMatched': 1,
      'savedZip.markdownLegacyFallback': 1,
      'savedZip.markdownMissing': 1,
    });
  });
});

describe('saved articles CSV parsing (RFC 4180)', () => {
  it('keeps the URL when a quoted Pocket title contains a quote followed by a comma', async () => {
    const zip = new JSZip();
    zip.file(
      'pocket.csv',
      [
        'title,url,time_added,tags,status',
        '"He said ""stop"", then left","https://e.example/1",1700000000,"a|b","unread"',
        '"Line one\r\nline two, continued","https://e.example/2",1700000001,,"archive"',
        'Plain title with spaces,https://e.example/3,1700000002,,unread',
        '',
      ].join('\r\n'),
    );

    const { articles } = await importZip(await zip.generateAsync({ type: 'uint8array' }));

    expect(articles.map(({ title, url, timeAdded, tags, status }) => ({ title, url, timeAdded, tags, status })))
      .toEqual([
        {
          title: 'He said "stop", then left',
          url: 'https://e.example/1',
          timeAdded: 1700000000,
          tags: ['a', 'b'],
          status: 'unread',
        },
        {
          title: 'Line one\r\nline two, continued',
          url: 'https://e.example/2',
          timeAdded: 1700000001,
          tags: [],
          status: 'archive',
        },
        {
          title: 'Plain title with spaces',
          url: 'https://e.example/3',
          timeAdded: 1700000002,
          tags: [],
          status: 'unread',
        },
      ]);
  });

  it('reads the url column of a generic CSV with quoted commas and quotes', async () => {
    const result = await runHelperTask({
      taskId: 'csv-parse',
      kind: HELPER_TASK_KIND.SAVED_ARTICLES_CSV_PARSE,
      payload: {
        csvText: 'Title,URL\n"A ""quoted"", title","https://f.example/1"\n"Two\nlines","https://f.example/2"\nNo quotes here,https://f.example/3\n',
      },
    }) as { urls: string[] };

    expect(result.urls).toEqual(['https://f.example/1', 'https://f.example/2', 'https://f.example/3']);
  });
});
