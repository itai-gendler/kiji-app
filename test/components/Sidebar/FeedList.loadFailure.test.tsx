import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  getAllFeedMetadataCached: vi.fn(),
  warn: vi.fn(),
}));

vi.mock('@/services/feeds/feedMetadataCache', () => ({
  getAllFeedMetadataCached: mocks.getAllFeedMetadataCached,
}));

vi.mock('@/services/logger', () => ({
  logger: {
    warn: mocks.warn,
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@/contexts/FeedContext', () => ({
  useFeedNavigation: () => ({
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

describe('FeedList startup load failure', () => {
  afterEach(() => {
    cleanup();
  });

  it('logs a warning instead of leaking an unhandled rejection', async () => {
    const failure = new Error('ipc closed');
    mocks.getAllFeedMetadataCached.mockRejectedValue(failure);
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);

    try {
      render(<FeedList showAddModal={false} onCloseAddModal={vi.fn()} />);
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 250));
      });

      expect(mocks.getAllFeedMetadataCached).toHaveBeenCalledTimes(1);
      expect(mocks.warn).toHaveBeenCalledWith('FeedList', 'Failed to load unstationed feeds', { error: failure });
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });
});
