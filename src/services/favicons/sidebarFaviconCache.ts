import * as feedStore from '@/stores/feedStore';
import type { Feed } from '@/services/feeds/types';
import { logger } from '@/services/logger';
import {
  recordRobustnessDuration,
  recordRobustnessEvent,
} from '@/services/diagnostics/robustnessMetrics';
import {
  feedLibraryMutationBus,
  type FeedLibraryFeedDeleted,
  type FeedLibraryFeedPatchChanges,
  type FeedLibraryFeedPatched,
} from '@/services/ui/feedLibraryMutationBus';

/**
 * Sidebar rows are built from the slim `feeds_library_sidebar_snapshot` (no blobs),
 * so favicons are hydrated after first paint through `feeds_get_favicons`.
 * Rows mounted in the same tick share one IPC; in-flight ids are deduped; the
 * resident set is an LRU capped at SIDEBAR_FAVICON_CACHE_MAX_ENTRIES (a `null`
 * entry remembers "stored flag set but no blob" so remounts do not re-ask).
 * One bus subscription keeps entries in step with favicon/emoji patches and deletes.
 */
export const SIDEBAR_FAVICON_CACHE_MAX_ENTRIES = 300;

export type SidebarFaviconEntry = Required<Pick<Feed, 'favicon'>> &
  Pick<Feed, 'faviconHasTransparency' | 'faviconBgLight' | 'faviconBgDark'>;

export type SidebarFaviconCandidate = Pick<Feed, 'id' | 'favicon' | 'faviconStored' | 'emoji'>;

interface Deferred {
  promise: Promise<SidebarFaviconEntry | null>;
  resolve: (entry: SidebarFaviconEntry | null) => void;
}

const FAVICON_PATCH_FIELDS: Array<keyof FeedLibraryFeedPatchChanges> = [
  'favicon',
  'faviconHasTransparency',
  'faviconBgLight',
  'faviconBgDark',
  'emoji',
];

const entries = new Map<string, SidebarFaviconEntry | null>();
const queued = new Map<string, Deferred>();
const inFlight = new Map<string, Deferred>();
// Ids patched/deleted while their batch was in flight: the IPC result is stale.
const staleInFlight = new Set<string>();
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let unsubscribe: (() => void) | null = null;
let lastPatched: FeedLibraryFeedPatched | null = null;
let lastDeleted: FeedLibraryFeedDeleted | null = null;

export const needsSidebarFavicon = (row: SidebarFaviconCandidate): boolean => (
  !row.favicon && !row.emoji && row.faviconStored === true
);

const remember = (id: string, entry: SidebarFaviconEntry | null): void => {
  entries.delete(id);
  entries.set(id, entry);
  while (entries.size > SIDEBAR_FAVICON_CACHE_MAX_ENTRIES) {
    const oldest = entries.keys().next().value;
    if (oldest === undefined) {
      break;
    }
    entries.delete(oldest);
  }
};

const forget = (id: string): void => {
  entries.delete(id);
  if (inFlight.has(id)) {
    staleInFlight.add(id);
  }
};

const applyPatch = (feedId: string, changes: FeedLibraryFeedPatchChanges): void => {
  if (!FAVICON_PATCH_FIELDS.some((field) => field in changes)) {
    return;
  }
  if (inFlight.has(feedId)) {
    staleInFlight.add(feedId);
  }
  if ('emoji' in changes) {
    // Emoji set → row never shows the blob; emoji cleared → re-read on next hydrate.
    forget(feedId);
    return;
  }
  if ('favicon' in changes) {
    if (typeof changes.favicon === 'string' && changes.favicon.length > 0) {
      remember(feedId, {
        favicon: changes.favicon,
        faviconHasTransparency: changes.faviconHasTransparency,
        faviconBgLight: changes.faviconBgLight,
        faviconBgDark: changes.faviconBgDark,
      });
    } else {
      forget(feedId);
    }
    return;
  }
  const existing = entries.get(feedId);
  if (existing) {
    remember(feedId, {
      favicon: existing.favicon,
      faviconHasTransparency: 'faviconHasTransparency' in changes
        ? changes.faviconHasTransparency
        : existing.faviconHasTransparency,
      faviconBgLight: 'faviconBgLight' in changes ? changes.faviconBgLight : existing.faviconBgLight,
      faviconBgDark: 'faviconBgDark' in changes ? changes.faviconBgDark : existing.faviconBgDark,
    });
  }
};

const ensureSubscription = (): void => {
  if (unsubscribe) {
    return;
  }
  lastPatched = feedLibraryMutationBus.getFeedPatched();
  lastDeleted = feedLibraryMutationBus.getFeedDeleted();
  unsubscribe = feedLibraryMutationBus.subscribe(() => {
    const patched = feedLibraryMutationBus.getFeedPatched();
    if (patched && patched !== lastPatched) {
      lastPatched = patched;
      applyPatch(patched.feedId, patched.changes);
    }
    const deleted = feedLibraryMutationBus.getFeedDeleted();
    if (deleted && deleted !== lastDeleted) {
      lastDeleted = deleted;
      forget(deleted.feedId);
    }
  });
};

const flush = async (): Promise<void> => {
  flushTimer = null;
  if (queued.size === 0) {
    return;
  }
  const batch = new Map(queued);
  queued.clear();
  for (const [id, deferred] of batch) {
    inFlight.set(id, deferred);
  }

  recordRobustnessEvent('sidebarFavicons.batchRequests');
  const startedAt = performance.now();
  let rows: feedStore.FeedFavicon[] = [];
  let failed = false;
  try {
    rows = await feedStore.getFavicons([...batch.keys()]);
  } catch (error) {
    failed = true;
    logger.warn('SidebarFavicons', 'Failed to hydrate sidebar favicons', { error, count: batch.size });
  } finally {
    recordRobustnessDuration('sidebarFavicons.batchMs', performance.now() - startedAt);
  }

  const byId = new Map<string, SidebarFaviconEntry>();
  for (const row of rows) {
    byId.set(row.id, {
      favicon: row.favicon,
      faviconHasTransparency: row.faviconHasTransparency,
      faviconBgLight: row.faviconBgLight,
      faviconBgDark: row.faviconBgDark,
    });
  }
  recordRobustnessEvent('sidebarFavicons.rowsHydrated', byId.size);

  for (const [id, deferred] of batch) {
    inFlight.delete(id);
    if (staleInFlight.delete(id)) {
      deferred.resolve(entries.get(id) ?? null);
      continue;
    }
    const entry = byId.get(id) ?? null;
    if (!failed) {
      remember(id, entry);
    }
    deferred.resolve(entry);
  }
};

const enqueue = (id: string): Deferred => {
  let resolve!: Deferred['resolve'];
  const promise = new Promise<SidebarFaviconEntry | null>((done) => {
    resolve = done;
  });
  const deferred = { promise, resolve };
  queued.set(id, deferred);
  if (flushTimer === null) {
    // One timer per tick: every row list that hydrates before it fires shares the IPC.
    flushTimer = setTimeout(() => {
      void flush();
    }, 0);
  }
  return deferred;
};

/**
 * Favicons for rows whose slim record says `faviconStored` (no emoji, no favicon yet).
 * Cached ids resolve without IPC; the rest join the next coalesced batch.
 */
export async function hydrateSidebarFavicons(
  rows: readonly SidebarFaviconCandidate[],
): Promise<Map<string, SidebarFaviconEntry>> {
  ensureSubscription();
  const hydrated = new Map<string, SidebarFaviconEntry>();
  const waits: Array<Promise<void>> = [];
  for (const row of rows) {
    if (!needsSidebarFavicon(row) || hydrated.has(row.id)) {
      continue;
    }
    if (entries.has(row.id)) {
      const entry = entries.get(row.id) ?? null;
      remember(row.id, entry);
      if (entry) {
        hydrated.set(row.id, entry);
      }
      continue;
    }
    const pending = inFlight.get(row.id) ?? queued.get(row.id) ?? enqueue(row.id);
    waits.push(pending.promise.then((entry) => {
      if (entry) {
        hydrated.set(row.id, entry);
      }
    }));
  }
  if (waits.length > 0) {
    await Promise.all(waits);
  }
  return hydrated;
}

/** Merge hydrated favicons into rows still missing one; returns `rows` when nothing changed. */
export function applySidebarFavicons<T extends SidebarFaviconCandidate & Partial<SidebarFaviconEntry>>(
  rows: T[],
  hydrated: ReadonlyMap<string, SidebarFaviconEntry>,
): T[] {
  let changed = false;
  const next = rows.map((row) => {
    const entry = hydrated.get(row.id);
    if (!entry || row.favicon || row.emoji) {
      return row;
    }
    changed = true;
    return {
      ...row,
      favicon: entry.favicon,
      faviconHasTransparency: entry.faviconHasTransparency ?? row.faviconHasTransparency,
      faviconBgLight: entry.faviconBgLight ?? row.faviconBgLight,
      faviconBgDark: entry.faviconBgDark ?? row.faviconBgDark,
    };
  });
  return changed ? next : rows;
}

/** Full-row refresh paths (e.g. favicon refreshed) keep the cache in step. */
export function rememberSidebarFavicon(feed: Pick<Feed, 'id'> & Partial<SidebarFaviconEntry>): void {
  if (!entries.has(feed.id) && !inFlight.has(feed.id)) {
    return;
  }
  if (inFlight.has(feed.id)) {
    staleInFlight.add(feed.id);
  }
  if (feed.favicon) {
    remember(feed.id, {
      favicon: feed.favicon,
      faviconHasTransparency: feed.faviconHasTransparency,
      faviconBgLight: feed.faviconBgLight,
      faviconBgDark: feed.faviconBgDark,
    });
  } else {
    entries.delete(feed.id);
  }
}

export function getSidebarFaviconCacheSizeForTests(): number {
  return entries.size;
}

/** Test-only: drop entries, pending batches, and the bus subscription. */
export function resetSidebarFaviconCacheForTests(): void {
  if (flushTimer !== null) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  for (const deferred of [...queued.values(), ...inFlight.values()]) {
    deferred.resolve(null);
  }
  entries.clear();
  queued.clear();
  inFlight.clear();
  staleInFlight.clear();
  unsubscribe?.();
  unsubscribe = null;
  lastPatched = null;
  lastDeleted = null;
}
