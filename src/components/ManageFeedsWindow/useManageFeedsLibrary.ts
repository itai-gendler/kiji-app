import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { recordRobustnessEvent } from '@/services/diagnostics/robustnessMetrics';
import { feedsManager, type Feed } from '@/services/feeds/feedsManager';
import {
  persistSmartViewSettings,
  persistStationOrder,
} from '@/services/feeds/libraryOrderPersist';
import {
  enqueueLibraryReorder,
  isLibraryReorderSuperseded,
  isLibraryReorderSupersededByImport,
} from '@/services/feeds/libraryReorderQueue';
import { logger } from '@/services/logger';
import { settingsManager } from '@/services/settings';
import { tagsManager } from '@/services/tags/tagsManager';
import { createDeferredUnsubscribe } from '@/services/tauri/tauriEventSubscription';
import { appToastService } from '@/services/ui/appToastService';
import {
  feedLibraryMutationBus,
  type FeedLibraryFeedPatchChanges,
} from '@/services/ui/feedLibraryMutationBus';
import { FEED_LIBRARY_STATUS_CHANGED_EVENT } from '@/services/ui/feedLibraryWindowBridge';
import * as feedStore from '@/stores/feedStore';
import type { Tag } from '@/types/tag';
import { isValidUrl } from '@/utils/urlValidator';
import {
  applyLibraryMessage,
  buildLibraryItems,
  buildStationsByFeedId,
  EMPTY_LIBRARY,
  nextStationName,
  planStationDeleteWithFeeds,
  sortStations,
  validateStationName,
  type LibraryItemRow,
  type ManageFeedsLibrary,
} from './manageFeedsModel';

export type LibraryLoadStatus = 'loading' | 'ready' | 'error';

export interface FeedEdits {
  title?: string;
  url?: string;
  /** '' clears the emoji and shows the site icon again. */
  emoji?: string;
}

export interface ManageFeedsLibraryApi extends ManageFeedsLibrary {
  status: LibraryLoadStatus;
  stationsByFeedId: ReadonlyMap<string, string[]>;
  reload: () => void;
  updateFeed: (feedId: string, edits: FeedEdits) => Promise<boolean>;
  setFeedStations: (feedId: string, stationNames: string[]) => Promise<boolean>;
  addFeedsToStation: (feedIds: string[], stationName: string) => Promise<boolean>;
  removeFeedsFromStation: (feedIds: string[], stationName: string) => Promise<boolean>;
  setStationFeeds: (stationName: string, feedIds: string[]) => Promise<boolean>;
  deleteFeeds: (feedIds: string[]) => Promise<boolean>;
  createStation: () => Promise<string | null>;
  renameStation: (currentName: string, nextName: string) => Promise<boolean>;
  setStationEmoji: (stationName: string, emoji: string) => Promise<boolean>;
  reorderStations: (stationNames: string[]) => Promise<void>;
  deleteStation: (stationName: string, options: { withFeeds: boolean }) => Promise<boolean>;
  setLibraryItems: (items: LibraryItemRow[]) => Promise<void>;
}

/** Plain-language copy for failures; technical detail goes to the log only. */
export const MANAGE_FEEDS_ERRORS = {
  load: 'Couldn’t load your feeds. Try again.',
  saveFeed: 'Couldn’t save the feed. Try again.',
  invalidUrl: 'Enter a full web address, starting with http:// or https://.',
  duplicateUrl: 'You already follow a feed at this address.',
  stations: 'Couldn’t update stations. Try again.',
  deleteFeeds: 'Couldn’t delete the feeds. Try again.',
  createStation: 'Couldn’t create a station. Try again.',
  renameStation: 'Couldn’t rename the station. Try again.',
  stationNameTaken: 'A station with that name already exists.',
  stationOrder: 'Couldn’t save the station order. Try again.',
  deleteStation: 'Couldn’t delete the station. Try again.',
  deleteStationPartial: 'The feeds were deleted, but the station couldn’t be removed. Try again.',
  libraryItems: 'Couldn’t save the sidebar items. Try again.',
} as const;

const fail = (copy: string, context: string, error?: unknown): false => {
  logger.error('ManageFeeds', context, { error });
  appToastService.show(copy);
  return false;
};

/** Membership writes for one station run in its queue lane; retry once if a reorder superseded it. */
const runInStationLane = async (stationName: string, work: () => Promise<void>): Promise<void> => {
  const run = () => enqueueLibraryReorder(`nested:${stationName}`, async () => {
    await work();
  });
  try {
    await run();
  } catch (error) {
    if (isLibraryReorderSuperseded(error) && !isLibraryReorderSupersededByImport(error)) {
      await run();
      return;
    }
    throw error;
  }
};

const publishStationFromDb = (station: Tag, previousName = station.name): void => {
  feedLibraryMutationBus.publishStationPatched(previousName, {
    name: station.name,
    emoji: station.emoji,
    createdAt: station.createdAt,
    sortOrder: station.sortOrder,
    feedIds: station.feedIds,
  });
};

/**
 * Library state and every management action for the Manage Feeds window.
 *
 * Reads use the slim catalog (`feeds_library_sidebar_snapshot`, no favicon blobs); icons hydrate
 * per row. Every change, local or relayed from the main window, arrives as a bus message and is
 * applied in order by `applyLibraryMessage`, so this window and the main sidebar run the same
 * mutation path. Actions persist first, then publish; the bridge relays the publish to the main
 * window.
 */
export function useManageFeedsLibrary(): ManageFeedsLibraryApi {
  const [library, setLibrary] = useState<ManageFeedsLibrary>(EMPTY_LIBRARY);
  const [status, setStatus] = useState<LibraryLoadStatus>('loading');
  const libraryRef = useRef(library);
  libraryRef.current = library;

  const loadGenerationRef = useRef(0);
  const loadInFlightRef = useRef(false);
  const reloadQueuedRef = useRef(false);
  const mountedRef = useRef(true);

  const load = useCallback(async (): Promise<void> => {
    if (loadInFlightRef.current) {
      reloadQueuedRef.current = true;
      return;
    }
    loadInFlightRef.current = true;
    reloadQueuedRef.current = false;
    const generation = ++loadGenerationRef.current;
    try {
      const [snapshot, smartViews] = await Promise.all([
        feedStore.listSidebarSnapshot(),
        settingsManager.getSmartViews(),
      ]);
      if (!mountedRef.current) return;
      if (generation !== loadGenerationRef.current) {
        // A change landed while this read was in flight; its result may predate it.
        reloadQueuedRef.current = true;
        return;
      }
      setLibrary({
        feeds: snapshot.feeds,
        stations: sortStations(snapshot.stations),
        libraryItems: buildLibraryItems(smartViews),
      });
      setStatus('ready');
    } catch (error) {
      logger.error('ManageFeeds', 'Failed to load the feed library', { error });
      if (mountedRef.current && libraryRef.current === EMPTY_LIBRARY) {
        setStatus('error');
      }
    } finally {
      loadInFlightRef.current = false;
      if (mountedRef.current && reloadQueuedRef.current) {
        void load();
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void load();

    const unsubscribeMessages = feedLibraryMutationBus.subscribeMessages((message) => {
      if (loadInFlightRef.current) {
        loadGenerationRef.current += 1;
      }
      const result = applyLibraryMessage(libraryRef.current, message);
      if (result.library !== libraryRef.current) {
        libraryRef.current = result.library;
        setLibrary(result.library);
      }
      if (result.reload) {
        void load();
      }
    });

    // A finished refresh cycle in the main window moved feed status (failures, last update).
    const unsubscribeStatus = createDeferredUnsubscribe(
      listen(FEED_LIBRARY_STATUS_CHANGED_EVENT, () => {
        void load();
      }),
    );

    return () => {
      mountedRef.current = false;
      unsubscribeMessages();
      unsubscribeStatus();
    };
  }, [load]);

  const stationsByFeedId = useMemo(() => buildStationsByFeedId(library.stations), [library.stations]);

  const reload = useCallback(() => {
    setStatus((current) => (current === 'error' ? 'loading' : current));
    void load();
  }, [load]);

  const updateFeed = useCallback(async (feedId: string, edits: FeedEdits): Promise<boolean> => {
    const current = libraryRef.current.feeds.find((feed) => feed.id === feedId);
    if (!current) return false;

    const updates: Partial<Feed> = {};
    const title = edits.title?.trim();
    if (title && title !== current.title) updates.title = title;

    const url = edits.url?.trim();
    if (url && url !== current.url) {
      if (!isValidUrl(url)) {
        appToastService.show(MANAGE_FEEDS_ERRORS.invalidUrl);
        return false;
      }
      try {
        const existing = await feedsManager.getFeedByUrl(url);
        if (existing && existing.id !== feedId) {
          appToastService.show(MANAGE_FEEDS_ERRORS.duplicateUrl);
          return false;
        }
      } catch (error) {
        return fail(MANAGE_FEEDS_ERRORS.saveFeed, 'Failed to check a feed address', error);
      }
      updates.url = url;
    }

    if (edits.emoji !== undefined && edits.emoji !== (current.emoji ?? '')) {
      updates.emoji = edits.emoji;
    }

    if (Object.keys(updates).length === 0) return true;

    try {
      const updated = await feedsManager.updateFeed(feedId, updates);
      if (!updated) {
        return fail(MANAGE_FEEDS_ERRORS.saveFeed, 'Feed update returned no row', { feedId });
      }
      const changes: FeedLibraryFeedPatchChanges = {};
      if (updates.title !== undefined) changes.title = updated.title;
      if (updates.url !== undefined) changes.url = updated.url;
      if (updates.emoji !== undefined) changes.emoji = updated.emoji;
      feedLibraryMutationBus.publishFeedPatched(feedId, changes);
      return true;
    } catch (error) {
      return fail(MANAGE_FEEDS_ERRORS.saveFeed, 'Failed to update a feed', error);
    }
  }, []);

  /**
   * Attach/detach `feedIds` for one station, then publish the station row as SQLite has it and a
   * `tags` patch for each changed feed. Writes go one at a time (no unbounded Promise.all).
   */
  const writeStationMembership = useCallback(async (
    stationName: string,
    attach: string[],
    detach: string[],
  ): Promise<void> => {
    if (attach.length === 0 && detach.length === 0) return;
    await runInStationLane(stationName, async () => {
      for (const feedId of attach) {
        await tagsManager.addTagToFeed(feedId, stationName);
      }
      for (const feedId of detach) {
        await tagsManager.removeTagFromFeed(feedId, stationName);
      }
    });
    const stations = await tagsManager.getAllTags();
    const persisted = stations.find((station) => station.name === stationName);
    if (persisted) publishStationFromDb(persisted);
    const byFeed = buildStationsByFeedId(stations);
    for (const feedId of [...attach, ...detach]) {
      feedLibraryMutationBus.publishFeedPatched(feedId, { tags: byFeed.get(feedId) ?? [] });
    }
  }, []);

  const setFeedStations = useCallback(async (feedId: string, stationNames: string[]): Promise<boolean> => {
    const current = new Set(buildStationsByFeedId(libraryRef.current.stations).get(feedId) ?? []);
    const next = new Set(stationNames);
    try {
      for (const station of libraryRef.current.stations) {
        const had = current.has(station.name);
        const wants = next.has(station.name);
        if (had === wants) continue;
        await writeStationMembership(station.name, wants ? [feedId] : [], wants ? [] : [feedId]);
      }
      return true;
    } catch (error) {
      void load();
      return fail(MANAGE_FEEDS_ERRORS.stations, 'Failed to update feed stations', error);
    }
  }, [load, writeStationMembership]);

  const addFeedsToStation = useCallback(async (feedIds: string[], stationName: string): Promise<boolean> => {
    const station = libraryRef.current.stations.find((entry) => entry.name === stationName);
    if (!station) return false;
    const attach = feedIds.filter((feedId) => !station.feedIds.includes(feedId));
    try {
      await writeStationMembership(stationName, attach, []);
      return true;
    } catch (error) {
      void load();
      return fail(MANAGE_FEEDS_ERRORS.stations, 'Failed to add feeds to a station', error);
    }
  }, [load, writeStationMembership]);

  const removeFeedsFromStation = useCallback(async (feedIds: string[], stationName: string): Promise<boolean> => {
    const station = libraryRef.current.stations.find((entry) => entry.name === stationName);
    if (!station) return false;
    const detach = feedIds.filter((feedId) => station.feedIds.includes(feedId));
    try {
      await writeStationMembership(stationName, [], detach);
      return true;
    } catch (error) {
      void load();
      return fail(MANAGE_FEEDS_ERRORS.stations, 'Failed to remove feeds from a station', error);
    }
  }, [load, writeStationMembership]);

  const setStationFeeds = useCallback(async (stationName: string, feedIds: string[]): Promise<boolean> => {
    const station = libraryRef.current.stations.find((entry) => entry.name === stationName);
    if (!station) return false;
    const wanted = new Set(feedIds);
    const attach = feedIds.filter((feedId) => !station.feedIds.includes(feedId));
    const detach = station.feedIds.filter((feedId) => !wanted.has(feedId));
    try {
      await writeStationMembership(stationName, attach, detach);
      return true;
    } catch (error) {
      void load();
      return fail(MANAGE_FEEDS_ERRORS.stations, 'Failed to set station feeds', error);
    }
  }, [load, writeStationMembership]);

  const deleteFeeds = useCallback(async (feedIds: string[]): Promise<boolean> => {
    const ids = [...new Set(feedIds)];
    if (ids.length === 0) return true;
    const idSet = new Set(ids);
    const affectedStations = libraryRef.current.stations.filter((station) => (
      station.feedIds.some((feedId) => idSet.has(feedId))
    ));
    try {
      // One native call: feeds, their articles (saved ones stay) and memberships, in one transaction.
      await feedsManager.deleteFeeds(ids);
    } catch (error) {
      void load();
      return fail(MANAGE_FEEDS_ERRORS.deleteFeeds, 'Failed to delete feeds', error);
    }
    for (const station of affectedStations) {
      publishStationFromDb({ ...station, feedIds: station.feedIds.filter((feedId) => !idSet.has(feedId)) });
    }
    for (const feedId of ids) {
      feedLibraryMutationBus.publishFeedDeleted(feedId);
    }
    return true;
  }, [load]);

  const createStation = useCallback(async (): Promise<string | null> => {
    const stations = libraryRef.current.stations;
    const station: Tag = {
      name: nextStationName(stations),
      feedIds: [],
      createdAt: new Date().toISOString(),
      sortOrder: stations.reduce((max, entry) => Math.max(max, entry.sortOrder ?? -1), -1) + 1,
    };
    try {
      await tagsManager.saveTag(station);
      publishStationFromDb(station);
      return station.name;
    } catch (error) {
      fail(MANAGE_FEEDS_ERRORS.createStation, 'Failed to create a station', error);
      return null;
    }
  }, []);

  const renameStation = useCallback(async (currentName: string, nextName: string): Promise<boolean> => {
    const trimmed = nextName.trim();
    if (trimmed === currentName) return true;
    const problem = validateStationName(trimmed, libraryRef.current.stations, currentName);
    if (problem === 'empty') return false;
    if (problem === 'taken') {
      appToastService.show(MANAGE_FEEDS_ERRORS.stationNameTaken);
      return false;
    }
    const previous = libraryRef.current.stations.find((station) => station.name === currentName);
    if (!previous) return false;
    try {
      await tagsManager.renameTag(currentName, trimmed);
      publishStationFromDb({ ...previous, name: trimmed }, currentName);
      return true;
    } catch (error) {
      void load();
      return fail(MANAGE_FEEDS_ERRORS.renameStation, 'Failed to rename a station', error);
    }
  }, [load]);

  const setStationEmoji = useCallback(async (stationName: string, emoji: string): Promise<boolean> => {
    try {
      const updated = await tagsManager.updateTag(stationName, { emoji });
      if (!updated) {
        return fail(MANAGE_FEEDS_ERRORS.stations, 'Station emoji update returned no row', { stationName });
      }
      publishStationFromDb(updated);
      return true;
    } catch (error) {
      return fail(MANAGE_FEEDS_ERRORS.stations, 'Failed to update a station emoji', error);
    }
  }, []);

  const reorderStations = useCallback(async (stationNames: string[]): Promise<void> => {
    try {
      // Publishes stationsReordered; the message applies the new order here and in the sidebar.
      await persistStationOrder(stationNames);
    } catch (error) {
      if (isLibraryReorderSuperseded(error)) return;
      void load();
      fail(MANAGE_FEEDS_ERRORS.stationOrder, 'Failed to save the station order', error);
    }
  }, [load]);

  const deleteStation = useCallback(async (
    stationName: string,
    { withFeeds }: { withFeeds: boolean },
  ): Promise<boolean> => {
    const station = libraryRef.current.stations.find((entry) => entry.name === stationName);
    if (!station) return true;

    if (!withFeeds) {
      try {
        await tagsManager.deleteTag(stationName);
      } catch (error) {
        void load();
        return fail(MANAGE_FEEDS_ERRORS.deleteStation, 'Failed to delete a station', error);
      }
      feedLibraryMutationBus.publishStationDeleted(stationName, station.feedIds);
      return true;
    }

    const plan = planStationDeleteWithFeeds(station, buildStationsByFeedId(libraryRef.current.stations));
    if (plan.feedsToDelete.length > 0) {
      try {
        await feedsManager.deleteFeeds(plan.feedsToDelete);
      } catch (error) {
        void load();
        return fail(MANAGE_FEEDS_ERRORS.deleteStation, 'Failed to delete station feeds', error);
      }
    }

    // Feeds above are committed as deleted. A station delete failure must still publish those
    // deletions (sidebar rows, caches) before reporting; the station itself stays, minus them.
    let stationDeleteError: unknown = null;
    try {
      await tagsManager.deleteTag(stationName);
    } catch (error) {
      stationDeleteError = error;
    }

    const deleted = new Set(plan.feedsToDelete);
    for (const feedId of plan.feedsToDelete) {
      for (const other of libraryRef.current.stations) {
        if (other.name !== stationName && other.feedIds.includes(feedId)) {
          publishStationFromDb({ ...other, feedIds: other.feedIds.filter((id) => !deleted.has(id)) });
        }
      }
      feedLibraryMutationBus.publishFeedDeleted(feedId);
    }

    if (stationDeleteError !== null) {
      if (plan.feedsToDelete.length > 0) {
        recordRobustnessEvent('ui.deleteFlowPartialFailure');
        publishStationFromDb({ ...station, feedIds: station.feedIds.filter((feedId) => !deleted.has(feedId)) });
        return fail(MANAGE_FEEDS_ERRORS.deleteStationPartial, 'Station delete failed after its feeds were deleted', stationDeleteError);
      }
      void load();
      return fail(MANAGE_FEEDS_ERRORS.deleteStation, 'Failed to delete a station', stationDeleteError);
    }

    feedLibraryMutationBus.publishStationDeleted(stationName, station.feedIds);
    return true;
  }, [load]);

  const setLibraryItems = useCallback(async (items: LibraryItemRow[]): Promise<void> => {
    const smartViews = items.map(({ id, visible }, index) => ({ id, visible, sortOrder: index }));
    // Show the change at once; the publish after the write confirms it (and reaches the sidebar).
    const optimistic = { ...libraryRef.current, libraryItems: buildLibraryItems(smartViews) };
    libraryRef.current = optimistic;
    setLibrary(optimistic);
    try {
      await persistSmartViewSettings(smartViews);
    } catch (error) {
      if (isLibraryReorderSuperseded(error)) return;
      void load();
      fail(MANAGE_FEEDS_ERRORS.libraryItems, 'Failed to save sidebar library items', error);
    }
  }, [load]);

  return {
    ...library,
    status,
    stationsByFeedId,
    reload,
    updateFeed,
    setFeedStations,
    addFeedsToStation,
    removeFeedsFromStation,
    setStationFeeds,
    deleteFeeds,
    createStation,
    renameStation,
    setStationEmoji,
    reorderStations,
    deleteStation,
    setLibraryItems,
  };
}
