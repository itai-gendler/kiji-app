import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Feed } from '@/services/feeds/types';
import type { Tag } from '@/types/tag';

const mocks = vi.hoisted(() => ({
  listSidebarSnapshot: vi.fn(),
  getFavicons: vi.fn(),
  getAll: vi.fn(),
  getAllTags: vi.fn(),
  getFeedById: vi.fn(),
}));

vi.mock('@/stores/feedStore', () => ({
  listSidebarSnapshot: mocks.listSidebarSnapshot,
  getFavicons: mocks.getFavicons,
  getAll: mocks.getAll,
}));

vi.mock('@/services/tags/tagsManager', () => ({
  tagsManager: { getAllTags: mocks.getAllTags },
}));

vi.mock('@/services/feeds/feedsManager', () => ({
  feedsManager: { getFeedById: mocks.getFeedById },
}));

vi.mock('@/services/feeds/opmlWorkflowService', () => ({
  opmlWorkflowService: { scheduleMissingFaviconsAfterStationSelection: vi.fn() },
}));

vi.mock('@/contexts/FeedContext', () => ({
  useFeedNavigation: () => ({
    selectedTag: null,
    selectTag: vi.fn(),
    selectedFeedId: null,
    selectFeed: vi.fn().mockResolvedValue(undefined),
    clearFeedSelection: vi.fn(),
    openFeedEditView: vi.fn(),
  }),
  useFeedUIActions: () => ({ refreshTotalFeeds: vi.fn().mockResolvedValue(undefined) }),
  useFeedFaviconRefreshed: () => null,
}));

vi.mock('@/components/Sidebar/AddFeedModal', () => ({ AddFeedModal: () => null }));
vi.mock('@/components/Sidebar/TagEditModal', () => ({ TagEditModal: () => null }));

import { FeedList } from '@/components/Sidebar/FeedList';
import { TagManager } from '@/components/Sidebar/TagManager';
import { clearFeedMetadataCacheForTests } from '@/services/feeds/feedMetadataCache';
import { resetSidebarFaviconCacheForTests } from '@/services/favicons/sidebarFaviconCache';
import { feedLibraryMutationBus } from '@/services/ui/feedLibraryMutationBus';

const blobFor = (id: string) => `data:image/png;base64,${id}`;

// Slim snapshot rows: `faviconStored` only, never the blob.
const slim = (id: string, title: string, tags: string[], faviconStored: boolean): Feed => ({
  id,
  title,
  url: `https://${id}.example/feed`,
  tags,
  faviconStored,
});

const daily: Tag = { name: 'Daily', feedIds: ['s1', 's2'], createdAt: '2026-01-01T00:00:00.000Z' };
const tech: Tag = { name: 'Tech', feedIds: ['s3'], createdAt: '2026-01-01T00:00:00.000Z' };

const catalog = [
  slim('u1', 'Unstationed Stored', [], true),
  slim('u2', 'Unstationed Bare', [], false),
  slim('s1', 'Station Stored', ['Daily'], true),
  slim('s2', 'Station Bare', ['Daily'], false),
  slim('s3', 'Collapsed Stored', ['Tech'], true),
];

const setup = () => {
  mocks.listSidebarSnapshot.mockResolvedValue({ feeds: catalog, stations: [daily, tech] });
  mocks.getAllTags.mockResolvedValue([daily, tech]);
  mocks.getFavicons.mockImplementation(async (ids: string[]) => ids
    .filter((id) => catalog.find((feed) => feed.id === id)?.faviconStored)
    .map((id) => ({ id, favicon: blobFor(id), faviconHasTransparency: false })));
};

const faviconSrc = (title: string): string | null => {
  const row = screen.getByText(title).closest('li');
  return row?.querySelector('img.favicon-image')?.getAttribute('src') ?? null;
};

describe('sidebar favicon hydration from the slim snapshot', () => {
  afterEach(() => {
    cleanup();
    resetSidebarFaviconCacheForTests();
    clearFeedMetadataCacheForTests();
    feedLibraryMutationBus.resetForTests();
    vi.clearAllMocks();
  });

  it('FeedList paints stored favicons for unstationed rows after hydration', async () => {
    setup();
    render(<FeedList showAddModal={false} onCloseAddModal={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Unstationed Stored')).toBeTruthy();
    });
    await waitFor(() => {
      expect(faviconSrc('Unstationed Stored')).toBe(blobFor('u1'));
    });
    expect(faviconSrc('Unstationed Bare')).toBeNull();

    expect(mocks.getFavicons).toHaveBeenCalledTimes(1);
    expect(mocks.getFavicons.mock.calls[0][0]).toEqual(['u1']);
    expect(mocks.getAll).not.toHaveBeenCalled();
    expect(mocks.getFeedById).not.toHaveBeenCalled();
  });

  it('TagManager hydrates nested rows only for expanded stations', async () => {
    setup();
    const { container } = render(<TagManager />);

    await waitFor(() => {
      expect(screen.getByText('Daily')).toBeTruthy();
    });
    expect(mocks.getFavicons).not.toHaveBeenCalled();

    const expand = container.querySelector('[data-station-name="Daily"] [aria-label="Expand station"]');
    fireEvent.click(expand as HTMLElement);

    await waitFor(() => {
      expect(screen.getByText('Station Stored')).toBeTruthy();
    });
    await waitFor(() => {
      expect(faviconSrc('Station Stored')).toBe(blobFor('s1'));
    });
    expect(faviconSrc('Station Bare')).toBeNull();

    expect(mocks.getFavicons).toHaveBeenCalledTimes(1);
    expect(mocks.getFavicons.mock.calls[0][0]).toEqual(['s1']);
    expect(mocks.getAll).not.toHaveBeenCalled();
    expect(mocks.getFeedById).not.toHaveBeenCalled();
  });

  it('keeps favicon patches working after hydration', async () => {
    setup();
    render(<FeedList showAddModal={false} onCloseAddModal={vi.fn()} />);

    await waitFor(() => {
      expect(faviconSrc('Unstationed Stored')).toBe(blobFor('u1'));
    });

    feedLibraryMutationBus.publishFeedPatched('u2', { favicon: 'data:image/png;base64,PATCHED' });
    await waitFor(() => {
      expect(faviconSrc('Unstationed Bare')).toBe('data:image/png;base64,PATCHED');
    });
    expect(mocks.getFavicons).toHaveBeenCalledTimes(1);
  });
});
