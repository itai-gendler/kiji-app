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
import {
  fetchOpmlTextFromUrl,
  importOpmlTextIntoLibrary,
  navigateAfterOpmlImport,
  openOpmlFileForImport,
} from '@/services/feeds/opmlUiWorkflow';
import { savedArticlesIOService } from '@/services/saved/savedArticlesIOService';
import { appToastService } from '@/services/ui/appToastService';

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

vi.mock('@/services/feeds/opmlUiWorkflow', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/feeds/opmlUiWorkflow')>();
  return {
    ...actual,
    fetchOpmlTextFromUrl: vi.fn(),
    importOpmlTextIntoLibrary: vi.fn(),
    navigateAfterOpmlImport: vi.fn(),
    openOpmlFileForImport: vi.fn(),
  };
});

vi.mock('@/services/saved/savedArticlesIOService', () => ({
  savedArticlesIOService: {
    importSavedArticles: vi.fn(),
  },
}));

vi.mock('@/services/ui/appToastService', () => ({
  appToastService: { show: vi.fn() },
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
const OPML_URL = 'https://example.com/list.opml';
const OPML = `<?xml version="1.0"?><opml version="2.0"><head><title>List</title></head><body>
  <outline text="Tech"><outline type="rss" text="A" xmlUrl="https://a.example/feed"/><outline type="rss" text="B" xmlUrl="https://b.example/feed"/></outline>
</body></opml>`;
const opmlImportResult = {
  summary: { total: 2, imported: 2, skippedDuplicate: 0, invalid: 0, failed: 0 },
  createdFeeds: [],
  navigationTarget: { type: 'station', stationName: 'Tech' },
};

const linkInput = () => screen.getByLabelText('Feed or website link');

const renderModal = (onFeedAdded = vi.fn(), onClose = vi.fn()) => {
  render(<AddFeedModal isOpen onClose={onClose} onFeedAdded={onFeedAdded} />);
  return { onFeedAdded, onClose };
};

const lookUp = (value: string) => {
  fireEvent.change(linkInput(), { target: { value } });
  fireEvent.keyDown(linkInput(), { key: 'Enter' });
};

describe('AddFeedModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
    vi.mocked(fetchOpmlTextFromUrl).mockResolvedValue(OPML);
    vi.mocked(importOpmlTextIntoLibrary).mockResolvedValue(opmlImportResult as never);
    vi.mocked(navigateAfterOpmlImport).mockResolvedValue(undefined);
    vi.mocked(savedArticlesIOService.importSavedArticles).mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
  });

  describe('add from a link', () => {
    const addAndWait = async () => {
      const handlers = renderModal();
      lookUp(FEED_URL);
      expect(await screen.findByText('Example Feed')).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Add feed' }));
      return handlers;
    };

    it('shows a preview of the feed before subscribing', async () => {
      renderModal();
      lookUp(FEED_URL);

      expect(await screen.findByText('Example Feed')).toBeTruthy();
      expect(screen.getByText('example.com · 1 article')).toBeTruthy();
      expect(screen.getByRole('list', { name: 'Latest articles' }).textContent).toContain('One');
      expect(feedsManager.addFeed).not.toHaveBeenCalled();
    });

    it('looks the link up on its own shortly after pasting', async () => {
      renderModal();
      fireEvent.change(linkInput(), { target: { value: FEED_URL } });

      expect(await screen.findByText('Example Feed', {}, { timeout: 2000 })).toBeTruthy();
      expect(feedsFetcher.fetchFeedWithCache).toHaveBeenCalledWith(FEED_URL);
    });

    it('adds https:// to a bare address', async () => {
      renderModal();
      lookUp('example.com/rss.xml');

      expect(await screen.findByText('Example Feed')).toBeTruthy();
      expect(feedsFetcher.fetchFeedWithCache).toHaveBeenCalledWith(FEED_URL);
    });

    it('stores initial articles from the preview fetch, then selects the new feed and closes', async () => {
      const { onFeedAdded, onClose } = await addAndWait();

      await waitFor(() => {
        expect(onFeedAdded).toHaveBeenCalledWith('feed-new', FEED_URL, 'Example Feed');
      });
      expect(onClose).toHaveBeenCalled();
      // The preview fetch is reused; adding does not fetch the feed again.
      expect(feedsFetcher.fetchFeedWithCache).toHaveBeenCalledTimes(1);
      expect(feedsManager.addFeed).toHaveBeenCalledWith(FEED_URL, 'Example Feed', expect.objectContaining({
        id: 'feed-new',
        skipMetadataFetch: true,
        skipFaviconRefresh: true,
      }));
      expect(storeParsedFeedContent).toHaveBeenCalledWith(expect.objectContaining({ feedId: 'feed-new' }));
      expect(feedsManager.updateFeed).toHaveBeenCalledWith('feed-new', expect.objectContaining({
        etag: 'etag-1',
        articleCount: 1,
        unreadCount: 1,
      }));
      expect(feedsManager.updateFeed).toHaveBeenCalledWith('feed-new', {
        favicon: 'data:image/png;base64,AAAA',
        faviconFetchFailed: false,
      });
    });

    it('keeps the new subscription when initial article storage fails', async () => {
      vi.mocked(storeParsedFeedContent).mockRejectedValueOnce(new Error('database is locked'));
      const { onFeedAdded, onClose } = await addAndWait();

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
      const { onFeedAdded, onClose } = await addAndWait();

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

    it('explains a failed lookup in plain words and adds nothing', async () => {
      vi.mocked(feedsFetcher.fetchFeedWithCache).mockRejectedValue(new Error('Feed request timed out.'));
      const { onFeedAdded, onClose } = renderModal();
      lookUp(FEED_URL);

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toBe('The site took too long to answer. Check your connection and try again.');
      expect(screen.queryByText('Feed request timed out.')).toBeNull();
      expect(screen.getByRole('button', { name: 'Try again' })).toBeTruthy();
      expect(feedsManager.addFeed).not.toHaveBeenCalled();
      expect(onFeedAdded).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('does not show raw parser errors for a page that is not a feed', async () => {
      vi.mocked(feedsFetcher.fetchFeedWithCache).mockRejectedValue(
        new Error('Failed to parse feed XML: error on line 1 at column 1'),
      );
      renderModal();
      lookUp(FEED_URL);

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toBe('There is no feed at this link. Try the site\'s RSS or Atom link instead.');
    });

    it('offers to show a feed that is already in the library', async () => {
      vi.mocked(feedsManager.getFeedByUrl).mockResolvedValue({
        id: 'feed-old', url: FEED_URL, title: 'Old Feed', tags: ['Tech'],
      } as never);
      const { onFeedAdded, onClose } = renderModal();
      lookUp(FEED_URL);

      expect(await screen.findByText('You already follow this feed in Tech.')).toBeTruthy();
      expect(feedsFetcher.fetchFeedWithCache).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Show feed' }));

      expect(onFeedAdded).toHaveBeenCalledWith('feed-old', FEED_URL, 'Old Feed');
      expect(onClose).toHaveBeenCalled();
      expect(feedsManager.addFeed).not.toHaveBeenCalled();
    });

    it('ignores a slow answer for a link that was replaced', async () => {
      let resolveFirst: (value: unknown) => void = () => {};
      vi.mocked(feedsFetcher.fetchFeedWithCache)
        .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }) as never)
        .mockResolvedValue({
          notModified: false,
          data: '<rss><channel><title>Second Feed</title></channel></rss>',
          items: [],
        } as never);
      renderModal();
      lookUp('https://first.example/feed');
      await waitFor(() => expect(feedsFetcher.fetchFeedWithCache).toHaveBeenCalledTimes(1));

      lookUp('https://second.example/feed');
      expect(await screen.findByText('Second Feed')).toBeTruthy();
      resolveFirst({ notModified: false, data: RSS, items: [{ title: 'One' }] });
      await new Promise((resolve) => setTimeout(resolve, 0));

      expect(screen.queryByText('Example Feed')).toBeNull();
      expect(screen.getByText('Second Feed')).toBeTruthy();
    });

    it('previews and imports a feed list link with the same import path', async () => {
      const { onClose } = renderModal();
      lookUp(OPML_URL);

      expect(await screen.findByText('2 feeds ready to import. Folders become stations.')).toBeTruthy();
      expect(importOpmlTextIntoLibrary).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: 'Import 2 feeds' }));

      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(fetchOpmlTextFromUrl).toHaveBeenCalledWith(OPML_URL);
      expect(importOpmlTextIntoLibrary).toHaveBeenCalledWith(OPML, expect.objectContaining({ url: OPML_URL }));
      expect(navigateAfterOpmlImport).toHaveBeenCalledWith(opmlImportResult, expect.any(Object));
      expect(appToastService.show).toHaveBeenCalledWith('Imported 2 feeds. Skipped 0 duplicates, 0 invalid, 0 failed.');
      expect(feedsManager.addFeed).not.toHaveBeenCalled();
    });
  });

  describe('add from a file', () => {
    const openFileTab = () => {
      fireEvent.click(screen.getByRole('tab', { name: 'From a file' }));
    };

    it('switches tabs with the arrow keys', () => {
      renderModal();
      const linkTab = screen.getByRole('tab', { name: 'From a link' });
      expect(linkTab.getAttribute('aria-selected')).toBe('true');

      fireEvent.keyDown(linkTab, { key: 'ArrowRight' });

      const fileTab = screen.getByRole('tab', { name: 'From a file' });
      expect(fileTab.getAttribute('aria-selected')).toBe('true');
      expect(document.activeElement).toBe(fileTab);
      expect(screen.getByRole('button', { name: /Feed list/ })).toBeTruthy();
    });

    it('imports a feed list file, then navigates, reports and closes', async () => {
      vi.mocked(openOpmlFileForImport).mockResolvedValue({ opmlText: OPML, fileName: 'Feeds.opml' });
      const { onClose } = renderModal();
      openFileTab();
      fireEvent.click(screen.getByRole('button', { name: /Feed list/ }));

      await waitFor(() => expect(onClose).toHaveBeenCalled());
      expect(importOpmlTextIntoLibrary).toHaveBeenCalledWith(OPML, expect.objectContaining({ fileName: 'Feeds.opml' }));
      expect(navigateAfterOpmlImport).toHaveBeenCalledWith(opmlImportResult, expect.any(Object));
      expect(appToastService.show).toHaveBeenCalled();
    });

    it('stays open when the file picker is cancelled', async () => {
      vi.mocked(openOpmlFileForImport).mockResolvedValue(null);
      const { onClose } = renderModal();
      openFileTab();
      const option = screen.getByRole('button', { name: /Feed list/ });
      fireEvent.click(option);

      await waitFor(() => expect((option as HTMLButtonElement).disabled).toBe(false));
      expect(importOpmlTextIntoLibrary).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
    });

    it('explains an unreadable file in plain words', async () => {
      vi.mocked(openOpmlFileForImport).mockResolvedValue({ opmlText: 'nope', fileName: 'x.opml' });
      vi.mocked(importOpmlTextIntoLibrary).mockRejectedValue(new Error('XML parse error: junk'));
      const { onClose } = renderModal();
      openFileTab();
      fireEvent.click(screen.getByRole('button', { name: /Feed list/ }));

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toBe(
        'That file is not a feed list KiJi can read. Choose an .opml file exported from another reader.',
      );
      expect(onClose).not.toHaveBeenCalled();
    });

    it('hands saved articles files to the saved-articles import and closes', async () => {
      const { onClose } = renderModal();
      openFileTab();
      const file = new File(['url\nhttps://a.example/post'], 'links.csv', { type: 'text/csv' });
      fireEvent.change(screen.getByTestId('add-feed-saved-file-input'), { target: { files: [file] } });

      expect(onClose).toHaveBeenCalled();
      expect(savedArticlesIOService.importSavedArticles).toHaveBeenCalledWith(file);
    });
  });
});
