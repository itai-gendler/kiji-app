import { describe, expect, it } from 'vitest';
import {
  applyLibraryMessage,
  buildStationsByFeedId,
  describeFeedStatus,
  filterFeeds,
  nextStationName,
  planStationDeleteWithFeeds,
  reorderById,
  sortFeeds,
  validateStationName,
  type ManageFeedsLibrary,
} from '@/components/ManageFeedsWindow/manageFeedsModel';
import type { Feed } from '@/services/feeds/feedsManager';
import type { Tag } from '@/types/tag';

const NOW = new Date('2026-10-19T12:00:00Z').getTime();

const feed = (id: string, overrides: Partial<Feed> = {}): Feed => ({
  id,
  title: id,
  url: `https://${id}.test/rss`,
  tags: [],
  ...overrides,
});

const station = (name: string, feedIds: string[], overrides: Partial<Tag> = {}): Tag => ({
  name,
  feedIds,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('manageFeedsModel', () => {
  it('describes feed status in plain language without internals', () => {
    const failing = describeFeedStatus(feed('a', {
      consecutiveFailures: 3,
      lastFailedFetchAt: new Date(NOW - 5 * 60_000),
      lastFetched: new Date(NOW - 2 * 3_600_000),
    }), NOW);
    expect(failing.health).toBe('failing');
    expect(failing.label).toBe('Can’t update');
    expect(failing.detail).toContain('3 times in a row');
    expect(failing.detail).toContain('5 min ago');
    expect(failing.detail).toContain('Last updated 2 h ago');
    expect(failing.detail).not.toMatch(/error|status code|timeout|http/i);

    expect(describeFeedStatus(feed('b', { lastFetched: new Date(NOW - 30_000) }), NOW).label).toBe('Updated just now');
    expect(describeFeedStatus(feed('c'), NOW)).toMatchObject({ health: 'new', label: 'Not updated yet' });
  });

  it('filters by search text, station names, attention and unstationed', () => {
    const feeds = [
      feed('alpha', { title: 'Alpha Daily' }),
      feed('beta', { title: 'Beta', consecutiveFailures: 2 }),
      feed('gamma', { title: 'Gamma' }),
    ];
    const byFeed = buildStationsByFeedId([station('Design', ['gamma'])]);
    expect(filterFeeds(feeds, 'all', 'daily', byFeed).map((entry) => entry.id)).toEqual(['alpha']);
    expect(filterFeeds(feeds, 'all', 'design', byFeed).map((entry) => entry.id)).toEqual(['gamma']);
    expect(filterFeeds(feeds, 'attention', '', byFeed).map((entry) => entry.id)).toEqual(['beta']);
    expect(filterFeeds(feeds, 'unstationed', '', byFeed).map((entry) => entry.id)).toEqual(['alpha', 'beta']);
  });

  it('sorts by recency, name, articles and status with a stable name tiebreak', () => {
    const feeds = [
      feed('b', { title: 'Bravo', createdAt: new Date(NOW - 1000), articleCount: 5 }),
      feed('a', { title: 'alpha', createdAt: new Date(NOW - 5000), articleCount: 50, consecutiveFailures: 1 }),
      feed('c', { title: 'Charlie', createdAt: new Date(NOW), articleCount: 5 }),
    ];
    expect(sortFeeds(feeds, 'recent').map((entry) => entry.id)).toEqual(['c', 'b', 'a']);
    expect(sortFeeds(feeds, 'name').map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
    expect(sortFeeds(feeds, 'articles').map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
    expect(sortFeeds(feeds, 'status').map((entry) => entry.id)).toEqual(['a', 'b', 'c']);
  });

  it('plans station-with-feeds deletes: only-here feeds go, shared feeds are unlinked', () => {
    const stations = [station('News', ['only', 'shared']), station('Tech', ['shared'])];
    expect(planStationDeleteWithFeeds(stations[0], buildStationsByFeedId(stations))).toEqual({
      feedsToDelete: ['only'],
      feedsToUnlink: ['shared'],
    });
  });

  it('names and validates stations case-insensitively', () => {
    expect(nextStationName([])).toBe('New Station');
    expect(nextStationName([{ name: 'new station' }, { name: 'New Station 2' }])).toBe('New Station 3');
    expect(validateStationName('  ', [])).toBe('empty');
    expect(validateStationName('news', [{ name: 'News' }])).toBe('taken');
    expect(validateStationName('News', [{ name: 'News' }], 'News')).toBeNull();
  });

  it('reorders by id before or after the drop target', () => {
    expect(reorderById(['a', 'b', 'c'], 'a', 'c', 'after', (id) => id)).toEqual(['b', 'c', 'a']);
    expect(reorderById(['a', 'b', 'c'], 'c', 'a', 'before', (id) => id)).toEqual(['c', 'a', 'b']);
  });

  describe('applyLibraryMessage', () => {
    const base: ManageFeedsLibrary = {
      feeds: [feed('one', { tags: ['News'] }), feed('two')],
      stations: [station('News', ['one'], { sortOrder: 0 }), station('Tech', [], { sortOrder: 1 })],
      libraryItems: [],
    };

    it('applies every delete in a burst (no collapse to the latest one)', () => {
      let library = base;
      library = applyLibraryMessage(library, { kind: 'feedDeleted', feedId: 'one' }).library;
      library = applyLibraryMessage(library, { kind: 'feedDeleted', feedId: 'two' }).library;
      expect(library.feeds).toEqual([]);
      expect(library.stations.find((entry) => entry.name === 'News')?.feedIds).toEqual([]);
    });

    it('renames a station in place and keeps its feeds', () => {
      const { library } = applyLibraryMessage(base, {
        kind: 'stationPatched',
        previousName: 'News',
        station: { name: 'World', createdAt: base.stations[0].createdAt, sortOrder: 0 },
      });
      expect(library.stations.map((entry) => entry.name)).toEqual(['World', 'Tech']);
      expect(library.stations[0].feedIds).toEqual(['one']);
      expect(library.feeds[0].tags).toEqual(['World']);
    });

    it('adds a new station from a patch and reorders stations', () => {
      const created = applyLibraryMessage(base, {
        kind: 'stationPatched',
        previousName: 'Design',
        station: { name: 'Design', createdAt: '2026-10-19T00:00:00.000Z', sortOrder: 2, feedIds: [] },
      }).library;
      expect(created.stations.map((entry) => entry.name)).toEqual(['News', 'Tech', 'Design']);
      const reordered = applyLibraryMessage(created, {
        kind: 'stationsReordered',
        stations: [{ name: 'Design', sortOrder: 0 }, { name: 'News', sortOrder: 1 }, { name: 'Tech', sortOrder: 2 }],
      }).library;
      expect(reordered.stations.map((entry) => entry.name)).toEqual(['Design', 'News', 'Tech']);
    });

    it('patches counts and titles, adds feeds into their stations, and reloads on hydrates', () => {
      let library = applyLibraryMessage(base, {
        kind: 'feedsCountsUpdated',
        feeds: [{ feedId: 'two', unreadCount: 3, articleCount: 9 }],
      }).library;
      expect(library.feeds[1]).toMatchObject({ unreadCount: 3, articleCount: 9 });
      library = applyLibraryMessage(library, { kind: 'feedPatched', feedId: 'two', changes: { title: 'Renamed' } }).library;
      expect(library.feeds[1].title).toBe('Renamed');
      library = applyLibraryMessage(library, { kind: 'feedsAdded', feeds: [feed('three', { tags: ['Tech'] })] }).library;
      expect(library.stations.find((entry) => entry.name === 'Tech')?.feedIds).toEqual(['three']);
      expect(applyLibraryMessage(library, { kind: 'libraryHydrated', stations: [], unstationed: [] }).reload).toBe(true);
    });
  });
});
