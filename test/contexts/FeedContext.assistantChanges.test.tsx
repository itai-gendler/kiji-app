import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { FeedProvider, useFeed } from '@/contexts/FeedContext';
import type { Article } from '@/types/article';
import type { ArticleQuery } from '@/types/articleQuery';
import { tagsManager } from '@/services/tags/tagsManager';
import { feedsManager } from '@/services/feeds/feedsManager';
import { feedsFetcher } from '@/services/feeds/feedsFetcher';
import { savedArticlesService } from '@/services/saved/savedArticlesService';
import * as articleStore from '@/stores/articleStore';
import * as feedStore from '@/stores/feedStore';
import { convertFeedItemsToArticles } from '@/services/articles/articleConverter';
import { clearTagFeedIdsCacheForTests } from '@/services/tags/tagFeedIdsCache';
import { clearFeedMetadataCacheForTests } from '@/services/feeds/feedMetadataCache';
import { feedNetworkDataResult } from '../helpers/feedNetworkFetchMock';
import { feedLibraryMutationBus } from '@/services/ui/feedLibraryMutationBus';
import { dispatchAssistantLibraryChange } from '@/services/assistant/assistantLibraryChanges';

vi.mock('@/stores/articleStore', () => ({
  beginSearch: vi.fn().mockResolvedValue('1'),
  cancelSearch: vi.fn().mockResolvedValue(undefined),
  query: vi.fn(),
  store: vi.fn(),
  getUnreadCount: vi.fn(),
  getArticleCount: vi.fn(),
  syncFeedCountsBatch: vi.fn(),
}));

vi.mock('@/stores/feedStore', () => {
  const getAll = vi.fn();
  return {
    getCount: vi.fn(),
    getById: vi.fn(),
    getAll,
    listSidebarSnapshot: vi.fn(async () => ({
      feeds: await getAll(),
      stations: [],
    })),
    tags: {
      listWithFeedIds: vi.fn().mockResolvedValue([]),
      listFeedIds: vi.fn().mockResolvedValue([]),
    },
  };
});

vi.mock('@/services/feeds/feedsFetcher', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/feeds/feedsFetcher')>();
  return {
    ...actual,
    feedsFetcher: {
      fetchFeed: vi.fn(),
      fetchFeedNetworkWithCache: vi.fn(),
      fetchFeedWithCache: vi.fn(),
    },
  };
});

vi.mock('@/services/feeds/feedsManager', () => ({
  feedsManager: {
    getAllFeeds: vi.fn(),
    getFeedById: vi.fn(),
    getFeedByUrl: vi.fn(),
    updateFeed: vi.fn(),
  },
}));

vi.mock('@/services/tags/tagsManager', () => ({
  tagsManager: {
    getFeedsByTag: vi.fn(),
  },
}));

vi.mock('@/services/scheduler/nativeSchedulerCycle', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/services/scheduler/nativeSchedulerCycle')>();
  return {
    ...actual,
    isNativeFeedIngestionEnabled: () => false,
  };
});

vi.mock('@/services/articles/articleConverter', () => ({
  convertFeedItemsToArticles: vi.fn(),
}));

vi.mock('@/services/saved/savedArticlesService', () => ({
  savedArticlesService: {
    querySavedViewArticles: vi.fn(),
    enrichSavedViewArticlesMeta: vi.fn(),
    getSavedViewArticle: vi.fn(),
  },
}));

vi.mock('@/services/logger', () => ({
  logger: {
    setPersistToFile: vi.fn(),
    getLogsPath: vi.fn().mockResolvedValue(null),
    info: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const createArticle = (
  hash: string,
  feedId: string,
  overrides: Partial<Article> = {},
): Article => ({
  hash,
  title: `Article ${hash}`,
  description: `Description ${hash}`,
  content: `<p>${hash}</p>`,
  fetchedDate: '2026-02-25T00:00:00.000Z',
  feedId,
  feedUrl: `https://${feedId}.example.com/rss.xml`,
  read: true,
  starred: false,
  saved: false,
  feedTitle: `Feed ${feedId}`,
  publishedDate: '2026-02-25T00:00:00.000Z',
  lastReadAt: '2026-09-10T12:00:00.000Z',
  ...overrides,
});

const waitForExpectation = async (
  expectation: () => void,
  timeoutMs = 1500,
  intervalMs = 10,
) => {
  const startedAt = Date.now();
  let latestError: unknown;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      expectation();
      return;
    } catch (error) {
      latestError = error;
    }

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    });
  }

  throw latestError;
};

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('FeedContext assistant library changes', () => {
  let latestContext: ReturnType<typeof useFeed> | null = null;
  let root: Root;
  let container: HTMLDivElement;

  const Probe: React.FC = () => {
    latestContext = useFeed();
    return null;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    clearTagFeedIdsCacheForTests();
    clearFeedMetadataCacheForTests();
    latestContext = null;
    vi.stubGlobal('requestIdleCallback', (callback: IdleRequestCallback) => {
      const id = window.setTimeout(() => {
        callback({
          didTimeout: false,
          timeRemaining: () => 50,
        } as IdleDeadline);
      }, 0);
      return id as unknown as number;
    });
    (feedStore.getCount as vi.Mock).mockReset().mockResolvedValue(0);
    (feedStore.getById as vi.Mock).mockReset().mockResolvedValue(null);
    (feedStore.getAll as vi.Mock).mockReset().mockResolvedValue([]);
    (feedStore.tags.listWithFeedIds as vi.Mock).mockReset().mockResolvedValue([]);
    (feedStore.tags.listFeedIds as vi.Mock).mockReset().mockResolvedValue([]);
    (articleStore.query as vi.Mock).mockReset().mockResolvedValue({ articles: [], total: 0 });
    (articleStore.store as vi.Mock).mockReset().mockResolvedValue(0);
    (articleStore.getUnreadCount as vi.Mock).mockReset().mockResolvedValue(0);
    (articleStore.getArticleCount as vi.Mock).mockReset().mockResolvedValue(0);
    (articleStore.syncFeedCountsBatch as vi.Mock).mockReset().mockResolvedValue([]);
    (feedsManager.getFeedById as vi.Mock).mockReset().mockResolvedValue(null);
    (feedsManager.getAllFeeds as vi.Mock).mockReset().mockResolvedValue([]);
    (feedsManager.getFeedByUrl as vi.Mock).mockReset().mockResolvedValue(null);
    (feedsManager.updateFeed as vi.Mock).mockReset().mockResolvedValue(undefined);
    (feedsFetcher.fetchFeedNetworkWithCache as vi.Mock).mockReset().mockResolvedValue(feedNetworkDataResult());
    (convertFeedItemsToArticles as vi.Mock).mockReset().mockResolvedValue([]);
    (savedArticlesService.querySavedViewArticles as vi.Mock).mockReset().mockResolvedValue({ articles: [], total: 0 });
    (savedArticlesService.enrichSavedViewArticlesMeta as vi.Mock).mockReset().mockImplementation(
      (articles: Article[]) => Promise.resolve(articles),
    );
    (tagsManager.getFeedsByTag as vi.Mock).mockReset().mockResolvedValue([]);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  const renderProvider = async () => {
    act(() => {
      root.render(
        <FeedProvider>
          <Probe />
        </FeedProvider>,
      );
    });
    await waitForExpectation(() => expect(latestContext).not.toBeNull());
  };

  const unreadRows = () => [
    createArticle('hash-u1', 'feed-1', { read: false, lastReadAt: undefined }),
    createArticle('hash-u2', 'feed-1', { read: false, lastReadAt: undefined }),
  ];

  const showUnread = async () => {
    (articleStore.query as vi.Mock).mockImplementation((query: ArticleQuery) => (
      query.filter?.read === false
        ? Promise.resolve({ articles: unreadRows(), total: 2 })
        : Promise.resolve({ articles: [], total: 0 })
    ));
    await renderProvider();
    await act(async () => {
      await latestContext!.selectSmartView('unread');
    });
    await waitForExpectation(() => {
      expect(latestContext!.articles.map((article) => article.hash)).toEqual(['hash-u1', 'hash-u2']);
    });
  };

  it('applies native read changes and publishes counts without writing them again', async () => {
    const publishCounts = vi.spyOn(feedLibraryMutationBus, 'publishFeedsCountsUpdated');
    await showUnread();
    (articleStore.syncFeedCountsBatch as vi.Mock).mockClear();
    (feedsManager.updateFeed as vi.Mock).mockClear();

    await act(async () => {
      dispatchAssistantLibraryChange({
        articles: [{ hash: 'hash-u1', read: true }, { hash: 'hash-u2', starred: true }],
        feedCounts: [{ feedId: 'feed-1', unreadCount: 1, articleCount: 2 }],
        savedArticleIds: [],
      });
      await Promise.resolve();
    });

    await waitForExpectation(() => {
      expect(latestContext!.articles.map((article) => article.hash)).toEqual(['hash-u2']);
    });
    expect(latestContext!.articles[0].starred).toBe(true);
    expect(publishCounts).toHaveBeenCalledWith([{ feedId: 'feed-1', unreadCount: 1, articleCount: 2 }]);
    // One writer per field: native persisted read state and counts.
    expect(articleStore.syncFeedCountsBatch).not.toHaveBeenCalled();
    expect(feedsManager.updateFeed).not.toHaveBeenCalled();
    publishCounts.mockRestore();
  });

  it('leaves the row of the open article to the article view', async () => {
    await showUnread();
    act(() => {
      latestContext!.setActiveArticle('hash-u1');
      latestContext!.setArticleViewOverlayPhase('open');
    });

    await act(async () => {
      dispatchAssistantLibraryChange({ articles: [{ hash: 'hash-u1', read: true }, { hash: 'hash-u2', read: true }] });
      await Promise.resolve();
    });

    await waitForExpectation(() => {
      expect(latestContext!.articles.map((article) => article.hash)).toEqual(['hash-u1']);
    });
  });

  it('inserts a snapshot an assistant saved at the top of Saved', async () => {
    const existing = createArticle('hash-s1', 'feed-1', { saved: true, savedArticleId: 's1' });
    const created = createArticle('hash-new', 'feed-1', { saved: true, savedArticleId: 's-new' });
    (savedArticlesService.querySavedViewArticles as vi.Mock).mockResolvedValue({ articles: [existing], total: 1 });
    (savedArticlesService.getSavedViewArticle as vi.Mock).mockResolvedValue(created);

    await renderProvider();
    await act(async () => {
      await latestContext!.selectSmartView('saved');
    });
    await waitForExpectation(() => {
      expect(latestContext!.articles.map((article) => article.hash)).toEqual(['hash-s1']);
    });

    // A flag repair (no new snapshot) never inserts a row.
    await act(async () => {
      dispatchAssistantLibraryChange({ articles: [{ hash: 'hash-other', saved: true, savedArticleId: 's-old' }] });
      await Promise.resolve();
    });
    expect(savedArticlesService.getSavedViewArticle).not.toHaveBeenCalled();

    await act(async () => {
      dispatchAssistantLibraryChange({
        articles: [{ hash: 'hash-new', saved: true, savedArticleId: 's-new' }],
        savedArticleIds: ['s-new'],
      });
      await Promise.resolve();
    });

    await waitForExpectation(() => {
      expect(latestContext!.articles.map((article) => article.hash)).toEqual(['hash-new', 'hash-s1']);
    });
    expect(latestContext!.articlesTotalCount).toBe(2);
    expect(savedArticlesService.getSavedViewArticle).toHaveBeenCalledWith('s-new');
  });

  it('does not insert into other views when an assistant saves', async () => {
    await showUnread();
    await act(async () => {
      dispatchAssistantLibraryChange({
        articles: [{ hash: 'hash-u2', saved: true, savedArticleId: 's-new' }],
        savedArticleIds: ['s-new'],
      });
      await Promise.resolve();
    });
    await waitForExpectation(() => {
      expect(latestContext!.articles.find((article) => article.hash === 'hash-u2')?.savedArticleId).toBe('s-new');
    });
    expect(savedArticlesService.getSavedViewArticle).not.toHaveBeenCalled();
    expect(latestContext!.articles.map((article) => article.hash)).toEqual(['hash-u1', 'hash-u2']);
  });
});
