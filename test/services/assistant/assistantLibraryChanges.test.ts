import { afterEach, describe, expect, it, vi } from 'vitest';

const { recordRobustnessEvent, warn } = vi.hoisted(() => ({ recordRobustnessEvent: vi.fn(), warn: vi.fn() }));
vi.mock('@/services/diagnostics/robustnessMetrics', () => ({ recordRobustnessEvent }));
vi.mock('@/services/logger', () => ({ logger: { warn, info: vi.fn(), error: vi.fn(), debug: vi.fn() } }));
vi.mock('@tauri-apps/api/event', () => ({ listen: vi.fn() }));

import {
  dispatchAssistantLibraryChange,
  parseAssistantLibraryChange,
  subscribeAssistantLibraryChanges,
  toArticleListUpdate,
} from '@/services/assistant/assistantLibraryChanges';

describe('assistantLibraryChanges', () => {
  const unsubscribers: Array<() => void> = [];
  afterEach(() => {
    unsubscribers.splice(0).forEach((unsubscribe) => unsubscribe());
    vi.clearAllMocks();
  });

  it('keeps only well-formed entries from the native payload', () => {
    expect(parseAssistantLibraryChange(null)).toBeNull();
    expect(parseAssistantLibraryChange({ articles: [] })).toBeNull();
    expect(parseAssistantLibraryChange({
      articles: [{ hash: 'a', read: true, starred: 'yes' }, { read: true }, { hash: '' }],
      feedCounts: [{ feedId: 'f', unreadCount: 1, articleCount: 2 }, { feedId: 'g', unreadCount: '1' }],
      savedArticleIds: ['s1', 7],
    })).toEqual({
      articles: [{ hash: 'a', read: true }],
      feedCounts: [{ feedId: 'f', unreadCount: 1, articleCount: 2 }],
      savedArticleIds: ['s1'],
    });
  });

  it('maps changes to list-row updates', () => {
    expect(toArticleListUpdate({ hash: 'a', read: false })).toEqual({ read: false });
    expect(toArticleListUpdate({ hash: 'a', saved: true, savedArticleId: 's1' })).toEqual({ saved: true, savedArticleId: 's1' });
    expect(toArticleListUpdate({ hash: 'a', starred: true })).toEqual({ starred: true });
  });

  it('delivers to every subscriber even when one fails, and stops after unsubscribe', async () => {
    const failing = vi.fn(() => { throw new Error('boom'); });
    const rejecting = vi.fn(() => Promise.reject(new Error('later')));
    const working = vi.fn();
    unsubscribers.push(subscribeAssistantLibraryChanges(failing));
    unsubscribers.push(subscribeAssistantLibraryChanges(rejecting));
    const unsubscribeWorking = subscribeAssistantLibraryChanges(working);

    dispatchAssistantLibraryChange({ articles: [{ hash: 'a', read: true }] });
    await Promise.resolve();
    await Promise.resolve();
    expect(working).toHaveBeenCalledWith({ articles: [{ hash: 'a', read: true }], feedCounts: [], savedArticleIds: [] });
    expect(recordRobustnessEvent).toHaveBeenCalledTimes(2);
    expect(recordRobustnessEvent).toHaveBeenCalledWith('assistant.libraryChangeFailed');
    expect(warn).toHaveBeenCalledWith('AssistantLibraryChanges', 'Applying an assistant change failed', expect.anything());

    unsubscribeWorking();
    dispatchAssistantLibraryChange({ articles: [{ hash: 'b', read: true }] });
    expect(working).toHaveBeenCalledTimes(1);
  });
});
