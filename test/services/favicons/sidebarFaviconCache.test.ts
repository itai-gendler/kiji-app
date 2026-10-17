import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getFavicons: vi.fn(),
}));

vi.mock('@/stores/feedStore', () => ({
  getFavicons: mocks.getFavicons,
}));

import {
  applySidebarFavicons,
  getSidebarFaviconCacheSizeForTests,
  hydrateSidebarFavicons,
  resetSidebarFaviconCacheForTests,
  SIDEBAR_FAVICON_CACHE_MAX_ENTRIES,
} from '@/services/favicons/sidebarFaviconCache';
import { feedLibraryMutationBus } from '@/services/ui/feedLibraryMutationBus';
import {
  getRobustnessSnapshot,
  resetRobustnessMetricsForTests,
} from '@/services/diagnostics/robustnessMetrics';

const stored = (id: string) => ({ id, faviconStored: true });
const blobFor = (id: string) => `data:image/png;base64,${id}`;

const serveStoredRows = () => {
  mocks.getFavicons.mockImplementation(async (ids: string[]) => ids.map((id) => ({
    id,
    favicon: blobFor(id),
    faviconHasTransparency: true,
  })));
};

describe('sidebarFaviconCache', () => {
  beforeEach(() => {
    resetSidebarFaviconCacheForTests();
    resetRobustnessMetricsForTests();
    feedLibraryMutationBus.resetForTests();
    mocks.getFavicons.mockReset();
    serveStoredRows();
  });

  afterEach(() => {
    resetSidebarFaviconCacheForTests();
  });

  it('coalesces rows hydrated in the same tick into one deduped IPC', async () => {
    const [first, second] = await Promise.all([
      hydrateSidebarFavicons([stored('a'), stored('b')]),
      hydrateSidebarFavicons([stored('b'), stored('c')]),
    ]);

    expect(mocks.getFavicons).toHaveBeenCalledTimes(1);
    expect(mocks.getFavicons.mock.calls[0][0]).toEqual(['a', 'b', 'c']);
    expect(first.get('a')?.favicon).toBe(blobFor('a'));
    expect(second.get('b')?.favicon).toBe(blobFor('b'));
    expect(second.get('c')?.faviconHasTransparency).toBe(true);

    const snapshot = getRobustnessSnapshot();
    expect(snapshot.counters['sidebarFavicons.batchRequests']).toBe(1);
    expect(snapshot.counters['sidebarFavicons.rowsHydrated']).toBe(3);
    expect(snapshot.durations['sidebarFavicons.batchMs']?.count).toBe(1);
  });

  it('joins in-flight ids instead of issuing another IPC, and serves cached ids without IPC', async () => {
    let release!: () => void;
    mocks.getFavicons.mockImplementationOnce((ids: string[]) => new Promise((resolve) => {
      release = () => resolve(ids.map((id) => ({ id, favicon: blobFor(id) })));
    }));

    const firstPending = hydrateSidebarFavicons([stored('a')]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.getFavicons).toHaveBeenCalledTimes(1);

    const joined = hydrateSidebarFavicons([stored('a')]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(mocks.getFavicons).toHaveBeenCalledTimes(1);

    release();
    expect((await firstPending).get('a')?.favicon).toBe(blobFor('a'));
    expect((await joined).get('a')?.favicon).toBe(blobFor('a'));

    const cached = await hydrateSidebarFavicons([stored('a')]);
    expect(cached.get('a')?.favicon).toBe(blobFor('a'));
    expect(mocks.getFavicons).toHaveBeenCalledTimes(1);
  });

  it('skips rows without a stored favicon, with an emoji, or already carrying a favicon', async () => {
    const hydrated = await hydrateSidebarFavicons([
      { id: 'none', faviconStored: false },
      { id: 'unknown' },
      { id: 'emoji', faviconStored: true, emoji: '🔥' },
      { id: 'painted', faviconStored: true, favicon: blobFor('painted') },
    ]);

    expect(hydrated.size).toBe(0);
    expect(mocks.getFavicons).not.toHaveBeenCalled();

    await hydrateSidebarFavicons([{ id: 'emoji', faviconStored: true, emoji: '🔥' }, stored('ok')]);
    expect(mocks.getFavicons).toHaveBeenCalledTimes(1);
    expect(mocks.getFavicons.mock.calls[0][0]).toEqual(['ok']);
  });

  it('remembers stored-but-missing rows so remounts do not re-ask', async () => {
    mocks.getFavicons.mockResolvedValueOnce([]);
    expect((await hydrateSidebarFavicons([stored('gone')])).size).toBe(0);
    expect((await hydrateSidebarFavicons([stored('gone')])).size).toBe(0);
    expect(mocks.getFavicons).toHaveBeenCalledTimes(1);
  });

  it('caps resident entries with LRU eviction', async () => {
    const total = SIDEBAR_FAVICON_CACHE_MAX_ENTRIES + 10;
    const rows = Array.from({ length: total }, (_, index) => stored(`feed-${index}`));
    const hydrated = await hydrateSidebarFavicons(rows);

    expect(hydrated.size).toBe(total);
    expect(getSidebarFaviconCacheSizeForTests()).toBe(SIDEBAR_FAVICON_CACHE_MAX_ENTRIES);

    // Newest stays resident; the oldest was evicted and needs a fresh batch.
    await hydrateSidebarFavicons([stored(`feed-${total - 1}`)]);
    expect(mocks.getFavicons).toHaveBeenCalledTimes(1);
    await hydrateSidebarFavicons([stored('feed-0')]);
    expect(mocks.getFavicons).toHaveBeenCalledTimes(2);
    expect(mocks.getFavicons.mock.calls[1][0]).toEqual(['feed-0']);
    expect(getSidebarFaviconCacheSizeForTests()).toBe(SIDEBAR_FAVICON_CACHE_MAX_ENTRIES);
  });

  it('updates entries on favicon patches and drops them on clear, emoji, or delete', async () => {
    await hydrateSidebarFavicons([stored('a'), stored('b'), stored('c')]);
    expect(mocks.getFavicons).toHaveBeenCalledTimes(1);

    feedLibraryMutationBus.publishFeedPatched('a', {
      favicon: 'data:image/png;base64,NEW',
      faviconHasTransparency: false,
    });
    const patched = await hydrateSidebarFavicons([stored('a')]);
    expect(patched.get('a')?.favicon).toBe('data:image/png;base64,NEW');
    expect(patched.get('a')?.faviconHasTransparency).toBe(false);
    expect(mocks.getFavicons).toHaveBeenCalledTimes(1);

    // Unrelated patches leave the entry alone.
    feedLibraryMutationBus.publishFeedPatched('b', { title: 'Renamed' });
    await hydrateSidebarFavicons([stored('b')]);
    expect(mocks.getFavicons).toHaveBeenCalledTimes(1);

    feedLibraryMutationBus.publishFeedPatched('a', { favicon: undefined });
    feedLibraryMutationBus.publishFeedPatched('b', { emoji: '🔥' });
    feedLibraryMutationBus.publishFeedDeleted('c');
    await hydrateSidebarFavicons([stored('a'), stored('b'), stored('c')]);
    expect(mocks.getFavicons).toHaveBeenCalledTimes(2);
    expect(mocks.getFavicons.mock.calls[1][0]).toEqual(['a', 'b', 'c']);
  });

  it('does not let an in-flight result overwrite a newer favicon patch', async () => {
    let release!: () => void;
    mocks.getFavicons.mockImplementationOnce(() => new Promise((resolve) => {
      release = () => resolve([{ id: 'a', favicon: 'data:image/png;base64,OLD' }]);
    }));

    const pending = hydrateSidebarFavicons([stored('a')]);
    await new Promise((resolve) => setTimeout(resolve, 0));
    feedLibraryMutationBus.publishFeedPatched('a', { favicon: 'data:image/png;base64,NEW' });
    release();

    expect((await pending).get('a')?.favicon).toBe('data:image/png;base64,NEW');
    const cached = await hydrateSidebarFavicons([stored('a')]);
    expect(cached.get('a')?.favicon).toBe('data:image/png;base64,NEW');
    expect(mocks.getFavicons).toHaveBeenCalledTimes(1);
  });

  it('applySidebarFavicons keeps identity when nothing changes', () => {
    const rows = [{ id: 'a', faviconStored: true }, { id: 'b', faviconStored: true, emoji: '🔥' }];
    expect(applySidebarFavicons(rows, new Map())).toBe(rows);
    const next = applySidebarFavicons(rows, new Map([
      ['a', { favicon: blobFor('a') }],
      ['b', { favicon: blobFor('b') }],
    ]));
    expect(next).not.toBe(rows);
    expect(next[0].favicon).toBe(blobFor('a'));
    expect(next[1]).toBe(rows[1]);
  });
});
