import { feedsManager, type Feed } from '@/services/feeds/feedsManager';
import { tagsManager } from '@/services/tags/tagsManager';
import { withNonLibraryImportLock } from './libraryReorderQueue';
import type {
  OpmlImportEntry,
  OpmlImportResult,
  OpmlImportNavigationTarget,
  OpmlImportedFeedRef,
} from './opmlImportService';

const OPML_IMPORT_ENTRY_CONCURRENCY = 8;

const runWithBoundedConcurrency = async (
  count: number,
  task: (index: number) => Promise<void>,
): Promise<void> => {
  let cursor = 0;
  const workerCount = Math.min(OPML_IMPORT_ENTRY_CONCURRENCY, count);
  await Promise.all(Array.from({ length: workerCount }, async () => {
    while (cursor < count) {
      const index = cursor;
      cursor += 1;
      await task(index);
    }
  }));
};

const normalizeFeedUrl = (url?: string): string | null => {
  if (!url) return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    const parsed = new URL(trimmed);
    parsed.hash = '';

    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      parsed.pathname = parsed.pathname.replace(/\/+$/, '');
    }

    return parsed.toString();
  } catch {
    const fallback = trimmed.replace(/#.*$/, '').replace(/\/+$/, '');
    return fallback || null;
  }
};

export const applyOpmlImportEntries = async (
  entries: OpmlImportEntry[],
): Promise<OpmlImportResult> => withNonLibraryImportLock(async () => {
  const [existingFeeds, existingTags] = await Promise.all([
    feedsManager.getAllFeeds(),
    tagsManager.getAllTags(),
  ]);
  const feedByNormalizedUrl = new Map(
    existingFeeds.flatMap((feed) => {
      const normalizedUrl = normalizeFeedUrl(feed.url);
      return normalizedUrl ? [[normalizedUrl, feed] as const] : [];
    }),
  );

  let invalid = 0;
  let skippedDuplicate = 0;
  let imported = 0;
  let failed = 0;
  const importedFeeds: OpmlImportedFeedRef[] = [];
  let firstImportedFeedNavigation: Extract<OpmlImportNavigationTarget, { type: 'feed' }> | null = null;

  // Pass 1 — classify every entry without touching the DB, so the file order that the
  // reorder post-pass depends on is fixed before any concurrent work runs.
  type PlannedEntry = {
    entry: OpmlImportEntry;
    createIndex: number | null;
    existingFeedId: string | null;
  };
  const planned: PlannedEntry[] = [];
  const creations: OpmlImportEntry[] = [];
  const createIndexByUrl = new Map<string, number>();

  for (const entry of entries) {
    const normalizedUrl = normalizeFeedUrl(entry.url);
    if (!normalizedUrl) {
      invalid += 1;
      continue;
    }

    const existing = feedByNormalizedUrl.get(normalizedUrl) ?? null;
    if (existing) {
      skippedDuplicate += 1;
      planned.push({ entry, createIndex: null, existingFeedId: existing.id });
      continue;
    }

    const knownIndex = createIndexByUrl.get(normalizedUrl);
    if (knownIndex !== undefined) {
      skippedDuplicate += 1;
      planned.push({ entry, createIndex: knownIndex, existingFeedId: null });
      continue;
    }

    const createIndex = creations.length;
    creations.push(entry);
    createIndexByUrl.set(normalizedUrl, createIndex);
    planned.push({ entry, createIndex, existingFeedId: null });
  }

  // Pass 2 — feed creation costs several IPC round-trips each; run it with bounded
  // concurrency rather than one feed at a time. The untagged sort-order base is
  // computed once from the library snapshot above (same formula as
  // feedsManager.addFeed) so each insert skips a full-library getAllFeeds read.
  const untaggedSortOrderBase = existingFeeds
    .filter((feed) => !feed.tags || feed.tags.length === 0)
    .reduce((max, feed) => Math.max(max, feed.sortOrder ?? 0), -1) + 1;
  const createdFeeds: Array<Feed | null> = new Array(creations.length).fill(null);
  await runWithBoundedConcurrency(creations.length, async (index) => {
    try {
      const created = await feedsManager.addFeedWithoutMetadata(
        creations[index].url,
        creations[index].title,
        { sortOrder: untaggedSortOrderBase + index },
      );
      createdFeeds[index] = created;
    } catch {
      createdFeeds[index] = null;
    }
  });

  const createdFeedById = new Map<string, Feed>();
  createdFeeds.forEach((feed, index) => {
    if (!feed) {
      return;
    }

    imported += 1;
    importedFeeds.push({ id: feed.id, url: feed.url });
    createdFeedById.set(feed.id, feed);
    if (!firstImportedFeedNavigation) {
      firstImportedFeedNavigation = {
        type: 'feed',
        feedId: feed.id,
        feedUrl: feed.url,
        feedTitle: feed.title || creations[index].title || feed.url,
      };
    }
  });

  // Pass 3a — resolve ids and collect file order synchronously (Sets keep insertion order).
  const stationOrderInFile = new Set<string>();
  const membershipInFile = new Map<string, Set<string>>();
  const unstationedIdsInFile = new Set<string>();
  const importedStationsInFile = new Set<string>();
  const stationEmojiHandled = new Set<string>();
  const sideEffects: Array<{
    feedId: string;
    entry: OpmlImportEntry;
    syncStationEmoji: boolean;
  }> = [];

  for (const item of planned) {
    const feedId = item.createIndex === null
      ? item.existingFeedId
      : createdFeeds[item.createIndex]?.id ?? null;
    if (!feedId) {
      failed += 1;
      continue;
    }

    const { entry } = item;
    if (entry.station) {
      stationOrderInFile.add(entry.station);
      importedStationsInFile.add(entry.station);
      const members = membershipInFile.get(entry.station) ?? new Set<string>();
      members.add(feedId);
      membershipInFile.set(entry.station, members);
    } else {
      unstationedIdsInFile.add(feedId);
    }

    const syncStationEmoji = Boolean(
      entry.station && entry.stationEmoji && !stationEmojiHandled.has(entry.station),
    );
    if (syncStationEmoji && entry.station) {
      stationEmojiHandled.add(entry.station);
    }

    if (entry.emoji || entry.station) {
      sideEffects.push({ feedId, entry, syncStationEmoji });
    }
  }

  // Pass 3b — emoji and station attachment; membership order is fixed by the post-pass
  // below, so these writes do not have to run in file order. Feed rows are already
  // committed here, so a failed write is a partial failure, not an import failure.
  let partialFailures = 0;
  const appliedEmojiByFeedId = new Map<string, string>();
  const appliedStationsByFeedId = new Map<string, string[]>();
  await runWithBoundedConcurrency(sideEffects.length, async (index) => {
    const { feedId, entry, syncStationEmoji } = sideEffects[index];
    try {
      if (entry.emoji) {
        await feedsManager.updateFeed(feedId, { emoji: entry.emoji });
        appliedEmojiByFeedId.set(feedId, entry.emoji);
      }

      if (entry.station) {
        await tagsManager.addTagToFeed(feedId, entry.station);
        const stations = appliedStationsByFeedId.get(feedId) ?? [];
        stations.push(entry.station);
        appliedStationsByFeedId.set(feedId, stations);
        if (syncStationEmoji && entry.stationEmoji) {
          await tagsManager.updateTag(entry.station, { emoji: entry.stationEmoji });
        }
      }
    } catch {
      partialFailures += 1;
    }
  });

  const importedStations = [...importedStationsInFile];
  const existingStationNames = existingTags.map((tag) => tag.name);
  const nextStationOrder = [
    ...stationOrderInFile,
    ...existingStationNames.filter((name) => !stationOrderInFile.has(name)),
  ];
  if (nextStationOrder.length > 0) {
    try {
      await tagsManager.reorderStations(nextStationOrder);
    } catch {
      // Newly created stations may not be listed yet; hydrate reloads.
    }
  }

  // Post-pass reorders are best-effort: the feeds are committed, so a failed read
  // here must not reject the import (hydrateLibraryAfterImport reloads order).
  let currentTags: Awaited<ReturnType<typeof tagsManager.getAllTags>> | null = null;
  if (membershipInFile.size > 0) {
    try {
      currentTags = await tagsManager.getAllTags();
    } catch {
      currentTags = null;
    }
  }
  const tagByName = new Map((currentTags ?? []).map((tag) => [tag.name, tag]));
  for (const [stationName, fileFeedIds] of currentTags ? membershipInFile : []) {
    const currentIds = tagByName.get(stationName)?.feedIds ?? [];
    const extras = currentIds.filter((feedId) => !fileFeedIds.has(feedId));
    try {
      await tagsManager.reorderMembership(stationName, [...fileFeedIds, ...extras]);
    } catch {
      // Membership may still be settling for a newly created station.
    }
  }

  let allFeedsAfterImport: Feed[] | null = null;
  if (unstationedIdsInFile.size > 0) {
    try {
      allFeedsAfterImport = await feedsManager.getAllFeeds();
    } catch {
      allFeedsAfterImport = null;
    }
  }
  if (allFeedsAfterImport) {
    const allFeeds = allFeedsAfterImport;
    const currentUntagged = allFeeds
      .filter((candidate) => !candidate.tags || candidate.tags.length === 0)
      .map((candidate) => candidate.id);
    const currentUntaggedSet = new Set(currentUntagged);
    const extras = currentUntagged.filter((feedId) => !unstationedIdsInFile.has(feedId));
    const nextUntagged = [
      ...[...unstationedIdsInFile].filter((feedId) => currentUntaggedSet.has(feedId)),
      ...extras,
    ];
    if (nextUntagged.length > 0) {
      try {
        await feedsManager.reorderUnstationed(nextUntagged);
      } catch {
        // Ignore if the unstationed set changed mid-import.
      }
    }
  }

  const navigationTarget: OpmlImportNavigationTarget | undefined = importedStations.length > 0
    ? { type: 'station', stationName: importedStations[0] }
    : firstImportedFeedNavigation ?? undefined;

  // Reflect this import's own writes on the created rows so consumers of
  // `createdFeeds` see station membership and emoji without a per-feed re-read.
  const publishedFeeds = importedFeeds.flatMap(({ id }) => {
    const feed = createdFeedById.get(id);
    if (!feed) return [];
    const emoji = appliedEmojiByFeedId.get(id);
    const stations = appliedStationsByFeedId.get(id);
    return [{
      ...feed,
      ...(emoji ? { emoji } : {}),
      tags: stations ? [...new Set([...(feed.tags ?? []), ...stations])] : feed.tags ?? [],
    }];
  });

  return {
    summary: {
      total: entries.length,
      imported,
      skippedDuplicate,
      invalid,
      failed,
      partialFailures,
    },
    importedFeeds,
    createdFeeds: publishedFeeds,
    navigationTarget,
  };
});
