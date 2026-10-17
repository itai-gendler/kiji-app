import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  getAllFeeds: vi.fn(),
  deleteFeeds: vi.fn(),
  getAllTags: vi.fn(),
  deleteTag: vi.fn(),
  clearFeedSelection: vi.fn(),
  toastShow: vi.fn(),
}));

vi.mock('@/contexts/FeedContext', () => ({
  useFeedNavigation: () => ({
    selectedFeedId: 'feed-only-news',
    selectedTag: null,
    selectedSmartView: null,
    clearFeedSelection: mocks.clearFeedSelection,
    feedEditTarget: null,
    clearFeedEditTarget: vi.fn(),
    selectFeed: vi.fn().mockResolvedValue(undefined),
    selectTag: vi.fn().mockResolvedValue(undefined),
  }),
  useFeedUIActions: () => ({
    refreshTotalFeeds: vi.fn().mockResolvedValue(undefined),
    notifyFeedLibraryChanged: vi.fn(),
  }),
  useFeedFaviconRefreshed: () => null,
}));

vi.mock('@/services/feeds/feedsManager', () => ({
  feedsManager: {
    getAllFeeds: mocks.getAllFeeds,
    deleteFeeds: mocks.deleteFeeds,
  },
}));

vi.mock('@/services/tags/tagsManager', () => ({
  tagsManager: {
    getAllTags: mocks.getAllTags,
    deleteTag: mocks.deleteTag,
  },
}));

vi.mock('@/services/settings', () => ({
  settingsManager: {
    getSmartViews: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/services/ui/appToastService', () => ({
  appToastService: { show: mocks.toastShow },
}));

// The mutation bus is a module singleton whose last snapshots replay on mount;
// load fresh module instances per test so cases cannot leak into each other.
const loadFreshModules = async () => {
  vi.resetModules();
  const { FeedEditView } = await import('@/components/MainArea/FeedEditView');
  const { feedLibraryMutationBus } = await import('@/services/ui/feedLibraryMutationBus');
  return { FeedEditView, feedLibraryMutationBus };
};

const feeds = [
  { id: 'feed-only-news', title: 'Only News', url: 'https://one.test/rss', tags: ['News'], unreadCount: 0 },
  { id: 'feed-shared', title: 'Shared', url: 'https://two.test/rss', tags: ['News', 'Tech'], unreadCount: 0 },
];
const stations = [
  { name: 'News', feedIds: ['feed-only-news', 'feed-shared'], createdAt: '2026-01-02T00:00:00.000Z' },
  { name: 'Tech', feedIds: ['feed-shared'], createdAt: '2026-01-01T00:00:00.000Z' },
];

describe('FeedEditView delete station with feeds partial failure', () => {
  beforeEach(() => {
    mocks.getAllFeeds.mockImplementation(async () => structuredClone(feeds));
    mocks.getAllTags.mockImplementation(async () => structuredClone(stations));
    mocks.deleteFeeds.mockResolvedValue(1);
  });

  afterEach(() => {
    cleanup();
  });

  it('publishes the committed feed deletion even when the station delete rejects', async () => {
    mocks.deleteTag.mockRejectedValue(new Error('station delete failed'));
    const { FeedEditView, feedLibraryMutationBus } = await loadFreshModules();
    const publishFeedDeleted = vi.spyOn(feedLibraryMutationBus, 'publishFeedDeleted');
    const publishStationPatched = vi.spyOn(feedLibraryMutationBus, 'publishStationPatched');
    const publishStationDeleted = vi.spyOn(feedLibraryMutationBus, 'publishStationDeleted');

    render(<FeedEditView />);
    const deleteStationButton = await screen.findByLabelText('Delete station News');
    fireEvent.click(deleteStationButton);
    await act(async () => {
      fireEvent.click(await screen.findByText('Delete Station and Feeds'));
    });

    await waitFor(() => expect(mocks.toastShow).toHaveBeenCalledWith('station delete failed'));
    expect(mocks.deleteFeeds).toHaveBeenCalledWith(['feed-only-news']);
    expect(mocks.clearFeedSelection).toHaveBeenCalledTimes(1);
    expect(publishFeedDeleted).toHaveBeenCalledWith('feed-only-news');
    // Station still exists in SQLite: patch its membership, do not announce deletion.
    expect(publishStationDeleted).not.toHaveBeenCalled();
    expect(publishStationPatched).toHaveBeenCalledWith('News', expect.objectContaining({
      name: 'News',
      feedIds: ['feed-shared'],
    }));
  });

  it('publishes feed and station deletion on success', async () => {
    mocks.deleteTag.mockResolvedValue(undefined);
    const { FeedEditView, feedLibraryMutationBus } = await loadFreshModules();
    const publishFeedDeleted = vi.spyOn(feedLibraryMutationBus, 'publishFeedDeleted');
    const publishStationDeleted = vi.spyOn(feedLibraryMutationBus, 'publishStationDeleted');

    render(<FeedEditView />);
    fireEvent.click(await screen.findByLabelText('Delete station News'));
    await act(async () => {
      fireEvent.click(await screen.findByText('Delete Station and Feeds'));
    });

    await waitFor(() => expect(publishStationDeleted).toHaveBeenCalledWith(
      'News',
      ['feed-only-news', 'feed-shared'],
    ));
    expect(publishFeedDeleted).toHaveBeenCalledWith('feed-only-news');
    expect(mocks.toastShow).not.toHaveBeenCalled();
  });
});
