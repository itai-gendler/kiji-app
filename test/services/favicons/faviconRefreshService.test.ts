import { beforeEach, describe, expect, it, vi } from 'vitest';

const getFeedById = vi.hoisted(() => vi.fn());
const applyFaviconResult = vi.hoisted(() => vi.fn());
const clearStoredFavicon = vi.hoisted(() => vi.fn());
const updateFeed = vi.hoisted(() => vi.fn());
const fetchFavicon = vi.hoisted(() => vi.fn());
const isPlaceholderFaviconDataUrl = vi.hoisted(() => vi.fn());
const publishFeedPatched = vi.hoisted(() => vi.fn());

vi.mock('@/services/feeds/feedsManager', () => ({
  feedsManager: { getFeedById, applyFaviconResult, clearStoredFavicon, updateFeed },
}));
vi.mock('@/services/favicons/faviconFetcher', () => ({ faviconFetcher: { fetchFavicon } }));
vi.mock('@/services/favicons/faviconQuality', () => ({ isPlaceholderFaviconDataUrl }));
vi.mock('@/services/ui/feedLibraryMutationBus', () => ({ feedLibraryMutationBus: { publishFeedPatched } }));
vi.mock('@/services/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() } }));

import { maybeRefreshFavicon } from '@/services/favicons/faviconRefreshService';

describe('maybeRefreshFavicon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isPlaceholderFaviconDataUrl.mockResolvedValue(false);
    getFeedById.mockResolvedValue({ id: 'feed-1', url: 'https://a.example/rss', favicon: 'data:image/png;base64,old' });
  });

  it('publishes a feed patch when the refreshed favicon changed', async () => {
    fetchFavicon.mockResolvedValue('data:image/png;base64,new');
    applyFaviconResult.mockResolvedValue({
      id: 'feed-1',
      favicon: 'data:image/png;base64,new',
      faviconHasTransparency: true,
      faviconBgLight: '#fff',
      faviconBgDark: '#000',
    });
    const onChanged = vi.fn();

    await maybeRefreshFavicon('feed-1', 'https://a.example/rss', onChanged);

    expect(publishFeedPatched).toHaveBeenCalledWith('feed-1', {
      favicon: 'data:image/png;base64,new',
      faviconHasTransparency: true,
      faviconBgLight: '#fff',
      faviconBgDark: '#000',
    });
    expect(onChanged).toHaveBeenCalledTimes(1);
  });

  it('publishes a clear when a stored placeholder is replaced by another placeholder', async () => {
    isPlaceholderFaviconDataUrl.mockResolvedValue(true);
    fetchFavicon.mockResolvedValue('data:image/png;base64,placeholder');

    await maybeRefreshFavicon('feed-1', 'https://a.example/rss');

    expect(clearStoredFavicon).toHaveBeenCalledWith('feed-1');
    expect(publishFeedPatched).toHaveBeenCalledWith('feed-1', { favicon: undefined });
  });

  it('does not publish when the favicon is unchanged', async () => {
    fetchFavicon.mockResolvedValue('data:image/png;base64,old');

    await maybeRefreshFavicon('feed-1', 'https://a.example/rss');

    expect(publishFeedPatched).not.toHaveBeenCalled();
    expect(updateFeed).toHaveBeenCalledWith('feed-1', { lastFaviconRefresh: expect.any(Date) });
  });
});
