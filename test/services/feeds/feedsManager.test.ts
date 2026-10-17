import { beforeEach, describe, expect, it, vi } from 'vitest';
import { feedsManager } from '@/services/feeds/feedsManager';
import * as feedStore from '@/stores/feedStore';
import * as articleStore from '@/stores/articleStore';
import type { Feed } from '@/services/feeds/types';

vi.mock('@/stores/feedStore', () => ({
  getAll: vi.fn(),
  getById: vi.fn(),
  getByUrl: vi.fn(),
  add: vi.fn(),
  update: vi.fn(),
}));

vi.mock('@/stores/articleStore', () => ({
  updateFeedMeta: vi.fn(),
}));

vi.mock('@/services/favicons/faviconFetcher', () => ({
  faviconFetcher: { fetchFavicon: vi.fn() },
}));

describe('feedsManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(feedStore.getByUrl).mockResolvedValue(null);
    vi.mocked(feedStore.getById).mockResolvedValue(null);
    vi.mocked(feedStore.add).mockResolvedValue(undefined);
    vi.mocked(feedStore.update).mockResolvedValue(undefined);
    vi.mocked(articleStore.updateFeedMeta).mockResolvedValue(undefined);
  });

  describe('addFeed sortOrder', () => {
    it('uses a provided sortOrder without reading the whole library', async () => {
      const feed = await feedsManager.addFeedWithoutMetadata('https://a.example/rss', 'A', { sortOrder: 7 });

      expect(feedStore.getAll).not.toHaveBeenCalled();
      expect(feedStore.add).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 7 }));
      expect(feed.sortOrder).toBe(7);
    });

    it('keeps computing the next untagged slot from the library when sortOrder is omitted', async () => {
      vi.mocked(feedStore.getAll).mockResolvedValue([
        { id: 'u1', url: 'https://u1/', title: 'u1', tags: [], sortOrder: 3 },
        { id: 't1', url: 'https://t1/', title: 't1', tags: ['Tech'], sortOrder: 99 },
      ] as Feed[]);

      await feedsManager.addFeedWithoutMetadata('https://b.example/rss', 'B');

      expect(feedStore.getAll).toHaveBeenCalledTimes(1);
      expect(feedStore.add).toHaveBeenCalledWith(expect.objectContaining({ sortOrder: 4 }));
    });
  });

  describe('clearStoredFavicon', () => {
    it('sends explicit null for article favicon metadata so the clear survives JSON serialization', async () => {
      vi.mocked(feedStore.getById).mockResolvedValue({
        id: 'f1',
        url: 'https://f1/',
        title: 'f1',
        tags: [],
        favicon: 'data:image/png;base64,AA',
      } as Feed);

      await feedsManager.clearStoredFavicon('f1');

      const [feedId, meta] = vi.mocked(articleStore.updateFeedMeta).mock.calls[0];
      expect(feedId).toBe('f1');
      expect(meta).toEqual({
        feedFavicon: null,
        feedFaviconHasTransparency: null,
        feedFaviconBgLight: null,
        feedFaviconBgDark: null,
      });
      // What actually crosses the IPC boundary:
      expect(JSON.parse(JSON.stringify(meta))).toEqual({
        feedFavicon: null,
        feedFaviconHasTransparency: null,
        feedFaviconBgLight: null,
        feedFaviconBgDark: null,
      });
      expect(feedStore.update).toHaveBeenCalledWith('f1', expect.objectContaining({
        favicon: undefined,
        faviconFetchFailed: true,
      }));
    });
  });
});
