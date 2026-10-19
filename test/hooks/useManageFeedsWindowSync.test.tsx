import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act, cleanup, render } from '@testing-library/react';

const mocks = vi.hoisted(() => {
  const listeners = new Map<string, (event: { payload: unknown }) => void>();
  return {
    listeners,
    schedulerListeners: new Set<(event: { type: string }) => void>(),
    emitTo: vi.fn(async () => {}),
    listen: vi.fn(async (name: string, handler: (event: { payload: unknown }) => void) => {
      listeners.set(name, handler);
      return () => {
        listeners.delete(name);
      };
    }),
    navigation: {
      selectedFeedId: null as string | null,
      selectedTag: null as string | null,
      selectedSmartView: null as string | null,
      clearFeedSelection: vi.fn(),
      selectTag: vi.fn(async () => {}),
    },
    reloadCurrentSourceFromStore: vi.fn(async () => {}),
    refreshTotalFeeds: vi.fn(async () => {}),
    overlayPhase: 'closed' as 'closed' | 'opening' | 'open' | 'closing',
  };
});

vi.mock('@tauri-apps/api/event', () => ({ emitTo: mocks.emitTo, listen: mocks.listen }));
vi.mock('@/services/logger', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));
vi.mock('@/services/scheduler/feedSchedulerService', () => ({
  feedScheduler: {
    on: (listener: (event: { type: string }) => void) => {
      mocks.schedulerListeners.add(listener);
      return () => mocks.schedulerListeners.delete(listener);
    },
  },
}));
vi.mock('@/contexts/FeedContext', () => ({
  useFeedNavigation: () => mocks.navigation,
  useFeedCollectionActions: () => ({ reloadCurrentSourceFromStore: mocks.reloadCurrentSourceFromStore }),
  useFeedUIActions: () => ({ refreshTotalFeeds: mocks.refreshTotalFeeds }),
  useFeedOverlay: () => ({ articleViewOverlayPhase: mocks.overlayPhase }),
}));

import {
  MANAGE_FEEDS_LIST_RELOAD_DELAY_MS,
  useManageFeedsWindowSync,
} from '@/hooks/useManageFeedsWindowSync';
import { feedLibraryMutationBus } from '@/services/ui/feedLibraryMutationBus';

const Host: React.FC = () => {
  useManageFeedsWindowSync();
  return null;
};

const fromManageFeeds = (message: unknown) => {
  mocks.listeners.get('feed-library:mutation')?.({ payload: { source: 'manage-feeds', message } });
};

const mount = async () => {
  const view = render(<Host />);
  await act(async () => {
    await Promise.resolve();
  });
  return view;
};

describe('useManageFeedsWindowSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    feedLibraryMutationBus.resetForTests();
    mocks.navigation.selectedFeedId = null;
    mocks.navigation.selectedTag = null;
    mocks.navigation.selectedSmartView = null;
    mocks.overlayPhase = 'closed';
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.clearAllMocks();
    mocks.listeners.clear();
    mocks.schedulerListeners.clear();
  });

  it('clears the selection when Manage Feeds deletes the selected feed', async () => {
    mocks.navigation.selectedFeedId = 'feed-1';
    await mount();
    act(() => fromManageFeeds({ kind: 'feedDeleted', feedId: 'feed-1' }));
    expect(mocks.navigation.clearFeedSelection).toHaveBeenCalledTimes(1);
    expect(mocks.refreshTotalFeeds).toHaveBeenCalledTimes(1);
    // The sidebar sees the delete through this window's bus.
    expect(feedLibraryMutationBus.getFeedDeleted()?.feedId).toBe('feed-1');
  });

  it('follows the selected station when it is renamed there', async () => {
    mocks.navigation.selectedTag = 'News';
    await mount();
    act(() => fromManageFeeds({
      kind: 'stationPatched',
      previousName: 'News',
      station: { name: 'World', createdAt: '2026-01-01', sortOrder: 0 },
    }));
    expect(mocks.navigation.selectTag).toHaveBeenCalledWith('World');
    expect(mocks.reloadCurrentSourceFromStore).not.toHaveBeenCalled();
  });

  it('reloads the visible list once for a burst of edits', async () => {
    mocks.navigation.selectedSmartView = 'all';
    await mount();
    act(() => {
      fromManageFeeds({ kind: 'feedDeleted', feedId: 'a' });
      fromManageFeeds({ kind: 'feedDeleted', feedId: 'b' });
      fromManageFeeds({ kind: 'feedPatched', feedId: 'c', changes: { title: 'New name' } });
    });
    expect(mocks.reloadCurrentSourceFromStore).not.toHaveBeenCalled();
    await act(async () => {
      vi.advanceTimersByTime(MANAGE_FEEDS_LIST_RELOAD_DELAY_MS);
    });
    expect(mocks.reloadCurrentSourceFromStore).toHaveBeenCalledTimes(1);
  });

  it('ignores edits that do not change article rows', async () => {
    await mount();
    act(() => {
      fromManageFeeds({ kind: 'stationsReordered', stations: [{ name: 'News', sortOrder: 0 }] });
      fromManageFeeds({ kind: 'smartViewsPatched', smartViews: [] });
      fromManageFeeds({ kind: 'feedPatched', feedId: 'c', changes: { tags: ['News'] } });
    });
    await act(async () => {
      vi.advanceTimersByTime(MANAGE_FEEDS_LIST_RELOAD_DELAY_MS * 2);
    });
    expect(mocks.reloadCurrentSourceFromStore).not.toHaveBeenCalled();
  });

  it('waits for an open article to close before reloading the list', async () => {
    mocks.overlayPhase = 'open';
    const view = await mount();
    act(() => fromManageFeeds({ kind: 'feedDeleted', feedId: 'a' }));
    await act(async () => {
      vi.advanceTimersByTime(MANAGE_FEEDS_LIST_RELOAD_DELAY_MS * 2);
    });
    expect(mocks.reloadCurrentSourceFromStore).not.toHaveBeenCalled();

    mocks.overlayPhase = 'closed';
    view.rerender(<Host />);
    expect(mocks.reloadCurrentSourceFromStore).toHaveBeenCalledTimes(1);
  });

  it('re-stashes a failed reload for the next library change', async () => {
    mocks.reloadCurrentSourceFromStore.mockRejectedValueOnce(new Error('ipc closed'));
    await mount();
    act(() => fromManageFeeds({ kind: 'stationDeleted', stationName: 'Other', affectedFeedIds: [] }));
    await act(async () => {
      vi.advanceTimersByTime(MANAGE_FEEDS_LIST_RELOAD_DELAY_MS);
    });
    expect(mocks.reloadCurrentSourceFromStore).toHaveBeenCalledTimes(1);
    act(() => fromManageFeeds({ kind: 'feedPatched', feedId: 'x', changes: { emoji: '🚀' } }));
    await act(async () => {
      vi.advanceTimersByTime(MANAGE_FEEDS_LIST_RELOAD_DELAY_MS);
    });
    expect(mocks.reloadCurrentSourceFromStore).toHaveBeenCalledTimes(2);
  });

  it('relays main-window library changes and finished refresh cycles to Manage Feeds', async () => {
    await mount();
    feedLibraryMutationBus.publishFeedsCountsUpdated([{ feedId: 'a', unreadCount: 1, articleCount: 3 }]);
    expect(mocks.emitTo).toHaveBeenCalledWith('manage-feeds', 'feed-library:mutation', {
      source: 'main',
      message: { kind: 'feedsCountsUpdated', feeds: [{ feedId: 'a', unreadCount: 1, articleCount: 3 }] },
    });
    for (const listener of mocks.schedulerListeners) listener({ type: 'cycle-complete' });
    expect(mocks.emitTo).toHaveBeenCalledWith('manage-feeds', 'feed-library:status-changed', null);
  });
});
