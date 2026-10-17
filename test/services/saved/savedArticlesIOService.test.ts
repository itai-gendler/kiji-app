import { beforeEach, describe, expect, it, vi } from 'vitest';

const insertBatch = vi.hoisted(() => vi.fn());
const runTask = vi.hoisted(() => vi.fn());
const publish = vi.hoisted(() => vi.fn());
const recordRobustnessEvent = vi.hoisted(() => vi.fn());

vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }));
vi.mock('@/lib/tauriClient', () => ({ tauriClient: { saved: { insertBatch } } }));
vi.mock('@/services/tasks/helperTaskClient', () => ({ helperTaskClient: { runTask } }));
vi.mock('@/services/ui/userMessageBus', () => ({ userMessageBus: { publish } }));
vi.mock('@/services/diagnostics/robustnessMetrics', () => ({ recordRobustnessEvent }));
vi.mock('@/services/ui/confirmDialogService', () => ({ confirmDialog: vi.fn() }));
vi.mock('@/services/settings', () => ({
  settingsManager: { getSettings: vi.fn(async () => ({ contentParser: undefined })) },
}));
vi.mock('@/services/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

import {
  formatSavedImportOutcome,
  savedArticlesIOService,
} from '@/services/saved/savedArticlesIOService';
import { HELPER_TASK_KIND } from '@/services/tasks/helperTaskContracts';

const fakeFile = (name: string, text = ''): File => ({
  name,
  text: async () => text,
  arrayBuffer: async () => new ArrayBuffer(0),
}) as unknown as File;

const zipArticle = (url: string) => ({
  title: `Title ${url}`,
  url,
  timeAdded: 1700000000,
  tags: [],
  status: 'unread',
  content: 'body',
});

const urlMetadata = (url: string) => ({
  url,
  title: url,
  author: null,
  datePublished: null,
  content: 'body',
  excerpt: null,
  leadImageUrl: null,
  domain: 'example.com',
});

describe('savedArticlesIOService.importSavedArticles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports rows the batch insert skipped as already saved (ZIP)', async () => {
    runTask.mockResolvedValueOnce({
      articles: [zipArticle('https://a.example/1'), zipArticle('https://a.example/2'), zipArticle('https://a.example/3')],
    });
    // Rust inserted one row; the other two were already saved.
    insertBatch.mockResolvedValueOnce(1);

    const outcome = await savedArticlesIOService.importSavedArticles(fakeFile('export.zip'));

    expect(outcome).toEqual({ imported: 1, skippedExisting: 2 });
    expect(insertBatch).toHaveBeenCalledTimes(1);
    expect(recordRobustnessEvent).toHaveBeenCalledWith('savedImport.skippedExisting', 2);
    expect(publish).toHaveBeenCalledWith('export-progress', '1 imported, 2 already saved', { durationMs: 6000 });
  });

  it('sums inserted and skipped counts across CSV chunks with one insert per chunk', async () => {
    const urls = Array.from({ length: 25 }, (_, index) => `https://b.example/${index}`);
    runTask.mockImplementation(async (request: { kind: string; payload: { urls?: string[] } }) => {
      if (request.kind === HELPER_TASK_KIND.SAVED_ARTICLES_CSV_PARSE) {
        return { urls };
      }
      return { results: (request.payload.urls ?? []).map(urlMetadata) };
    });
    insertBatch.mockResolvedValueOnce(15).mockResolvedValueOnce(5);

    const outcome = await savedArticlesIOService.importSavedArticles(fakeFile('links.csv', 'url\n'));

    expect(insertBatch).toHaveBeenCalledTimes(2);
    expect(insertBatch.mock.calls.map(([request]) => request.articles.length)).toEqual([20, 5]);
    expect(outcome).toEqual({ imported: 20, skippedExisting: 5 });
    expect(publish).toHaveBeenCalledWith('export-progress', '20 imported, 5 already saved', { durationMs: 6000 });
  });

  it('omits the already-saved clause when nothing was skipped', () => {
    expect(formatSavedImportOutcome({ imported: 4, skippedExisting: 0 })).toBe('4 imported');
  });
});
