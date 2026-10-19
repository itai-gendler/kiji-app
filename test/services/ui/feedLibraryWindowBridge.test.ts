import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const eventMocks = vi.hoisted(() => {
  const listeners = new Map<string, (event: { payload: unknown }) => void>();
  return {
    listeners,
    emitTo: vi.fn(async () => {}),
    listen: vi.fn(async (name: string, handler: (event: { payload: unknown }) => void) => {
      listeners.set(name, handler);
      return () => {
        listeners.delete(name);
      };
    }),
  };
});

vi.mock('@tauri-apps/api/event', () => ({
  emitTo: eventMocks.emitTo,
  listen: eventMocks.listen,
}));

vi.mock('@/services/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { feedLibraryMutationBus } from '@/services/ui/feedLibraryMutationBus';
import {
  FEED_LIBRARY_MUTATION_EVENT,
  installFeedLibraryWindowBridge,
} from '@/services/ui/feedLibraryWindowBridge';

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

const deliver = (payload: unknown) => {
  const handler = eventMocks.listeners.get(FEED_LIBRARY_MUTATION_EVENT);
  if (!handler) throw new Error('bridge is not listening');
  handler({ payload });
};

describe('feedLibraryWindowBridge', () => {
  let teardown: (() => void) | null = null;

  beforeEach(() => {
    feedLibraryMutationBus.resetForTests();
    eventMocks.emitTo.mockClear();
    eventMocks.listeners.clear();
  });

  afterEach(() => {
    teardown?.();
    teardown = null;
  });

  it('relays local publishes to the peer window only', async () => {
    teardown = installFeedLibraryWindowBridge({ selfLabel: 'manage-feeds', peerLabel: 'main' });
    await flush();

    feedLibraryMutationBus.publishFeedDeleted('feed-1');
    feedLibraryMutationBus.publishStationPatched('News', { name: 'World', createdAt: '2026-01-01', sortOrder: 0 });

    expect(eventMocks.emitTo).toHaveBeenNthCalledWith(1, 'main', FEED_LIBRARY_MUTATION_EVENT, {
      source: 'manage-feeds',
      message: { kind: 'feedDeleted', feedId: 'feed-1' },
    });
    expect(eventMocks.emitTo).toHaveBeenNthCalledWith(2, 'main', FEED_LIBRARY_MUTATION_EVENT, {
      source: 'manage-feeds',
      message: {
        kind: 'stationPatched',
        previousName: 'News',
        station: { name: 'World', createdAt: '2026-01-01', sortOrder: 0 },
      },
    });
  });

  it('applies peer mutations to this window without echoing them back', async () => {
    const onRemoteMutation = vi.fn();
    teardown = installFeedLibraryWindowBridge({ selfLabel: 'main', peerLabel: 'manage-feeds', onRemoteMutation });
    await flush();
    const seen: string[] = [];
    const unsubscribe = feedLibraryMutationBus.subscribeMessages((message, origin) => {
      seen.push(`${message.kind}:${origin}`);
    });

    deliver({ source: 'manage-feeds', message: { kind: 'feedDeleted', feedId: 'feed-9' } });
    deliver({ source: 'manage-feeds', message: { kind: 'feedDeleted', feedId: 'feed-10' } });

    expect(feedLibraryMutationBus.getFeedDeleted()?.feedId).toBe('feed-10');
    expect(seen).toEqual(['feedDeleted:remote', 'feedDeleted:remote']);
    expect(onRemoteMutation).toHaveBeenCalledTimes(2);
    expect(eventMocks.emitTo).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('ignores its own envelopes and malformed payloads', async () => {
    teardown = installFeedLibraryWindowBridge({ selfLabel: 'main', peerLabel: 'manage-feeds' });
    await flush();
    deliver({ source: 'main', message: { kind: 'feedDeleted', feedId: 'loop' } });
    deliver({ nope: true });
    expect(feedLibraryMutationBus.getFeedDeleted()).toBeNull();
  });

  it('strips favicon blobs from feed lists and revives dates on arrival', async () => {
    teardown = installFeedLibraryWindowBridge({ selfLabel: 'main', peerLabel: 'manage-feeds' });
    await flush();

    feedLibraryMutationBus.publishFeedsAdded([{
      id: 'feed-2',
      title: 'Two',
      url: 'https://two.test/rss',
      tags: [],
      favicon: 'data:image/png;base64,AAAA',
      createdAt: new Date('2026-10-01T00:00:00Z'),
    }]);
    const envelope = eventMocks.emitTo.mock.calls[0]?.[2] as { message: { feeds: Array<Record<string, unknown>> } };
    expect(envelope.message.feeds[0].favicon).toBeUndefined();
    expect(envelope.message.feeds[0].faviconStored).toBe(true);

    // Over IPC, dates arrive as strings.
    const wire = JSON.parse(JSON.stringify({ source: 'manage-feeds', message: envelope.message }));
    feedLibraryMutationBus.resetForTests();
    deliver(wire);
    const added = feedLibraryMutationBus.getFeedsAdded()?.feeds[0];
    expect(added?.createdAt).toBeInstanceOf(Date);
    expect(added?.createdAt?.toISOString()).toBe('2026-10-01T00:00:00.000Z');
  });

  it('stops relaying after teardown', async () => {
    teardown = installFeedLibraryWindowBridge({ selfLabel: 'main', peerLabel: 'manage-feeds' });
    await flush();
    teardown();
    teardown = null;
    feedLibraryMutationBus.publishFeedDeleted('after');
    expect(eventMocks.emitTo).not.toHaveBeenCalled();
    expect(eventMocks.listeners.has(FEED_LIBRARY_MUTATION_EVENT)).toBe(false);
  });
});
