import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { AddFeedModal } from '@/components/Sidebar/AddFeedModal';
import { feedsManager } from '@/services/feeds/feedsManager';
import { feedsFetcher } from '@/services/feeds/feedsFetcher';
import { storeParsedFeedContent } from '@/services/feeds/feedRefreshPipeline';
import { faviconFetcher } from '@/services/favicons/faviconFetcher';
import * as articleStore from '@/stores/articleStore';
import { logger } from '@/services/logger';

vi.mock('@/contexts/FeedContext', () => ({
  useFeedUIActions: () => ({
    refreshTotalFeeds: vi.fn(),
    notifyFeedLibraryChanged: vi.fn(),
  }),
  useFeedNavigation: () => ({
    selectFeed: vi.fn(),
    selectTag: vi.fn(),
  }),
}));

vi.mock('@/services/feeds/feedsManager', () => ({
  feedsManager: {
    getFeedByUrl: vi.fn(),
    generateId: vi.fn(() => 'feed-new'),
    addFeed: vi.fn(),
    updateFeed: vi.fn(),
  },
}));

vi.mock('@/services/feeds/feedsFetcher', () => ({
  feedsFetcher: {
    fetchFeedWithCache: vi.fn(),
  },
}));

vi.mock('@/services/feeds/feedRefreshPipeline', () => ({
  storeParsedFeedContent: vi.fn(),
}));

vi.mock('@/services/favicons/faviconFetcher', () => ({
  faviconFetcher: {
    fetchFavicon: vi.fn(),
  },
}));

vi.mock('@/stores/articleStore', () => ({
  syncFeedCountsBatch: vi.fn(),
}));

vi.mock('@/services/logger', () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const FEED_URL = 'https://example.com/rss.xml';
const RSS = '<rss><channel><title>Example Feed</title><item><title>One</title></item></channel></rss>';
const addedFeed = { id: 'feed-new', url: FEED_URL, title: 'Example Feed', tags: [] };

describe('AddFeedModal add feed', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.mocked(feedsManager.getFeedByUrl).mockResolvedValue(null);
    vi.mocked(feedsManager.addFeed).mockResolvedValue(addedFeed as never);
    vi.mocked(feedsManager.updateFeed).mockResolvedValue(null);
    vi.mocked(feedsFetcher.fetchFeedWithCache).mockResolvedValue({
      notModified: false,
      data: RSS,
      items: [{ title: 'One' }],
      etag: 'etag-1',
      lastModified: undefined,
    } as never);
    vi.mocked(faviconFetcher.fetchFavicon).mockResolvedValue('data:image/png;base64,AAAA');
    vi.mocked(storeParsedFeedContent).mockResolvedValue({ insertedCount: 1, articles: [] } as never);
    vi.mocked(articleStore.syncFeedCountsBatch).mockResolvedValue([
      { feedId: 'feed-new', unreadCount: 1, articleCount: 1 },
    ] as never);
  });

  afterEach(() => {
    cleanup();
  });

  const submit = (onFeedAdded: ReturnType<typeof vi.fn>, onClose: ReturnType<typeof vi.fn>) => {
    render(<AddFeedModal isOpen onClose={onClose} onFeedAdded={onFeedAdded} />);
    fireEvent.change(screen.getByLabelText('Feed URL or OPML link'), { target: { value: FEED_URL } });
    fireEvent.click(screen.getByRole('button', { name: 'Add Feed' }));
  };

  it('stores initial articles, then selects the new feed and closes', async () => {
    const onFeedAdded = vi.fn();
    const onClose = vi.fn();
    submit(onFeedAdded, onClose);

    await waitFor(() => {
      expect(onFeedAdded).toHaveBeenCalledWith('feed-new', FEED_URL, 'Example Feed');
    });
    expect(onClose).toHaveBeenCalled();
    expect(storeParsedFeedContent).toHaveBeenCalledWith(expect.objectContaining({ feedId: 'feed-new' }));
    expect(feedsManager.updateFeed).toHaveBeenCalledWith('feed-new', expect.objectContaining({
      etag: 'etag-1',
      articleCount: 1,
      unreadCount: 1,
    }));
  });

  it('keeps the new subscription when initial article storage fails', async () => {
    vi.mocked(storeParsedFeedContent).mockRejectedValueOnce(new Error('database is locked'));
    const onFeedAdded = vi.fn();
    const onClose = vi.fn();
    submit(onFeedAdded, onClose);

    await waitFor(() => {
      expect(onFeedAdded).toHaveBeenCalledWith('feed-new', FEED_URL, 'Example Feed');
    });
    expect(onClose).toHaveBeenCalled();
    expect(screen.queryByText('database is locked')).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      'AddFeedModal',
      'Initial article storage failed after adding feed',
      expect.objectContaining({ feedId: 'feed-new' }),
    );
    // lastFetched stays unset so selecting the feed refetches its articles.
    expect(feedsManager.updateFeed).not.toHaveBeenCalledWith('feed-new', expect.objectContaining({
      lastFetched: expect.any(Date),
    }));
    // Favicon persistence still runs after a storage failure.
    expect(feedsManager.updateFeed).toHaveBeenCalledWith('feed-new', expect.objectContaining({
      favicon: 'data:image/png;base64,AAAA',
    }));
  });

  it('keeps the new subscription when the favicon update fails', async () => {
    vi.mocked(feedsManager.updateFeed).mockImplementation(async (_id, updates) => {
      if ('favicon' in (updates as object)) {
        throw new Error('ipc closed');
      }
      return null;
    });
    const onFeedAdded = vi.fn();
    const onClose = vi.fn();
    submit(onFeedAdded, onClose);

    await waitFor(() => {
      expect(onFeedAdded).toHaveBeenCalledWith('feed-new', FEED_URL, 'Example Feed');
    });
    expect(onClose).toHaveBeenCalled();
    expect(logger.warn).toHaveBeenCalledWith(
      'AddFeedModal',
      'Favicon update failed after adding feed',
      expect.objectContaining({ feedId: 'feed-new' }),
    );
  });

  it('still reports a fetch failure before anything is added', async () => {
    vi.mocked(feedsFetcher.fetchFeedWithCache).mockRejectedValueOnce(new Error('Feed request timed out.'));
    const onFeedAdded = vi.fn();
    const onClose = vi.fn();
    submit(onFeedAdded, onClose);

    expect(await screen.findByText('Feed request timed out.')).toBeTruthy();
    expect(feedsManager.addFeed).not.toHaveBeenCalled();
    expect(onFeedAdded).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});
