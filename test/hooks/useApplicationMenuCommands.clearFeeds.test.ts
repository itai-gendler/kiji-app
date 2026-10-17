import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  getAllFeeds: vi.fn(),
  deleteFeeds: vi.fn(),
  getAllTags: vi.fn(),
  deleteTag: vi.fn(),
  indicatorShow: vi.fn(),
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

vi.mock('@/services/ui/confirmDialogService', () => ({
  confirmDialog: vi.fn().mockResolvedValue(true),
}));

vi.mock('@/services/ui/sidebarIndicatorService', () => ({
  sidebarIndicatorService: { show: mocks.indicatorShow, clear: vi.fn() },
}));

import { useApplicationMenuCommands } from '@/hooks/useApplicationMenuCommands';
import { feedLibraryMutationBus } from '@/services/ui/feedLibraryMutationBus';
import { sidebarIndicatorFailed } from '@/services/ui/sidebarIndicatorText';

type MenuCommandHandler = (command: { type: string }) => void;

describe('useApplicationMenuCommands clearFeeds partial failure', () => {
  let menuHandler: MenuCommandHandler | null = null;
  const originalKijiApi = window.kijiAPI;

  beforeEach(() => {
    menuHandler = null;
    (window as unknown as { kijiAPI: unknown }).kijiAPI = {
      onAppMenuCommand: (handler: MenuCommandHandler) => {
        menuHandler = handler;
        return () => {};
      },
    };
    mocks.getAllFeeds.mockResolvedValue([
      { id: 'f1', title: 'One', url: 'https://one.test/rss', tags: ['News'] },
      { id: 'f2', title: 'Two', url: 'https://two.test/rss', tags: [] },
    ]);
    mocks.getAllTags.mockResolvedValue([
      { name: 'News', feedIds: ['f1'], createdAt: '2026-01-01T00:00:00.000Z' },
      { name: 'Tech', feedIds: [], createdAt: '2026-01-01T00:00:00.000Z' },
    ]);
    mocks.deleteFeeds.mockResolvedValue(2);
  });

  afterEach(() => {
    cleanup();
    (window as unknown as { kijiAPI: unknown }).kijiAPI = originalKijiApi;
  });

  const renderAndClear = async () => {
    const clearFeedSelection = vi.fn();
    const refreshTotalFeeds = vi.fn().mockResolvedValue(undefined);
    const notifyFeedLibraryChanged = vi.fn();
    renderHook(() => useApplicationMenuCommands({
      activeArticleHash: null,
      requestCloseArticle: vi.fn(),
      selectedSmartView: null,
      selectSmartView: vi.fn().mockResolvedValue(undefined),
      clearFeedSelection,
      selectFeed: vi.fn().mockResolvedValue(undefined),
      selectTag: vi.fn().mockResolvedValue(undefined),
      refreshTotalFeeds,
      notifyFeedLibraryChanged,
      updateArticleInList: vi.fn(),
      reloadCurrentSourceFromStore: vi.fn().mockResolvedValue(undefined),
      theme: 'system' as never,
      setTheme: vi.fn(),
    }));
    expect(menuHandler).not.toBeNull();
    await act(async () => {
      menuHandler!({ type: 'clearFeeds' });
      for (let i = 0; i < 20; i += 1) {
        await Promise.resolve();
      }
    });
    return { clearFeedSelection, refreshTotalFeeds, notifyFeedLibraryChanged };
  };

  it('still publishes hydrate and clears selection when a station delete rejects', async () => {
    const hydrate = vi.spyOn(feedLibraryMutationBus, 'publishLibraryHydrated');
    mocks.deleteTag.mockImplementation(async (name: string) => {
      if (name === 'News') throw new Error('locked');
    });

    const { clearFeedSelection, refreshTotalFeeds, notifyFeedLibraryChanged } = await renderAndClear();

    expect(mocks.deleteFeeds).toHaveBeenCalledWith(['f1', 'f2']);
    // Remaining tag deletes still attempted after the failure.
    expect(mocks.deleteTag).toHaveBeenCalledWith('Tech');
    expect(hydrate).toHaveBeenCalledTimes(1);
    const payload = hydrate.mock.calls[0][0];
    expect(payload.unstationed).toEqual([]);
    expect(payload.stations.map((station) => station.name)).toEqual(['News']);
    expect(payload.stations[0].feedIds).toEqual([]);
    expect(clearFeedSelection).toHaveBeenCalledTimes(1);
    expect(refreshTotalFeeds).toHaveBeenCalledTimes(1);
    expect(notifyFeedLibraryChanged).toHaveBeenCalledTimes(1);
    // Failure is still reported.
    expect(mocks.indicatorShow.mock.calls.at(-1)?.[0]).toBe(
      sidebarIndicatorFailed('clearing', { subject: 'feeds' }),
    );
  });

  it('publishes an empty library on full success', async () => {
    const hydrate = vi.spyOn(feedLibraryMutationBus, 'publishLibraryHydrated');
    mocks.deleteTag.mockResolvedValue(undefined);

    const { clearFeedSelection } = await renderAndClear();

    expect(hydrate).toHaveBeenCalledWith({ stations: [], unstationed: [] });
    expect(clearFeedSelection).toHaveBeenCalledTimes(1);
  });
});
