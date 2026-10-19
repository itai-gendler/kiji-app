import { emitTo, listen } from '@tauri-apps/api/event';
import type { Feed } from '@/services/feeds/feedsManager';
import { logger } from '@/services/logger';
import { createDeferredUnsubscribe } from '@/services/tauri/tauriEventSubscription';
import {
  feedLibraryMutationBus,
  type FeedLibraryMutationMessage,
} from '@/services/ui/feedLibraryMutationBus';

/**
 * Keeps the main window and Manage Feeds on one library. Each webview has its own
 * `feedLibraryMutationBus`; the bridge relays every local publish to the peer window, and the
 * peer applies it with `applyRemote` (so it is never relayed back). Writes are already in
 * SQLite when a publish happens, so the receiver only updates its UI and caches.
 */
export const FEED_LIBRARY_MUTATION_EVENT = 'feed-library:mutation';

/** Main → Manage Feeds: a refresh cycle ended, so feed status (failures, last update) moved. */
export const FEED_LIBRARY_STATUS_CHANGED_EVENT = 'feed-library:status-changed';

export const MAIN_WINDOW_LABEL = 'main';
export const MANAGE_FEEDS_WINDOW_LABEL = 'manage-feeds';

interface FeedLibraryMutationEnvelope {
  source: string;
  message: FeedLibraryMutationMessage;
}

const FEED_DATE_FIELDS = ['createdAt', 'lastFetched', 'lastFailedFetchAt', 'lastFaviconRefresh'] as const;

/**
 * Favicon data URLs can be large; rows over the wire carry `faviconStored` and the receiver
 * hydrates icons through its batched favicon cache. Single-feed favicon patches still carry
 * the icon so a refreshed favicon shows at once.
 */
const toWireFeed = (feed: Feed): Feed => {
  if (!feed.favicon) {
    return feed;
  }
  const { favicon: _favicon, ...rest } = feed;
  return { ...rest, faviconStored: true };
};

const fromWireFeed = (feed: Feed): Feed => {
  const next: Feed = { ...feed, tags: Array.isArray(feed.tags) ? feed.tags : [] };
  for (const field of FEED_DATE_FIELDS) {
    const value = next[field] as unknown;
    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      next[field] = Number.isNaN(date.getTime()) ? undefined : date;
    }
  }
  return next;
};

export const toWireMutation = (message: FeedLibraryMutationMessage): FeedLibraryMutationMessage => {
  switch (message.kind) {
    case 'feedsAdded':
    case 'unstationedHydrated':
      return { ...message, feeds: message.feeds.map(toWireFeed) };
    case 'libraryHydrated':
      return { ...message, unstationed: message.unstationed.map(toWireFeed) };
    default:
      return message;
  }
};

export const fromWireMutation = (message: FeedLibraryMutationMessage): FeedLibraryMutationMessage => {
  switch (message.kind) {
    case 'feedsAdded':
    case 'unstationedHydrated':
      return { ...message, feeds: message.feeds.map(fromWireFeed) };
    case 'libraryHydrated':
      return { ...message, unstationed: message.unstationed.map(fromWireFeed) };
    default:
      return message;
  }
};

const isMutationEnvelope = (payload: unknown): payload is FeedLibraryMutationEnvelope => (
  typeof payload === 'object'
  && payload !== null
  && typeof (payload as { source?: unknown }).source === 'string'
  && typeof (payload as { message?: { kind?: unknown } }).message?.kind === 'string'
);

interface FeedLibraryWindowBridgeOptions {
  selfLabel: string;
  peerLabel: string;
  /** Runs after a peer mutation was applied to this window's bus. */
  onRemoteMutation?: (message: FeedLibraryMutationMessage) => void;
}

/** Install the relay for this window. Returns a teardown that stops both directions. */
export function installFeedLibraryWindowBridge({
  selfLabel,
  peerLabel,
  onRemoteMutation,
}: FeedLibraryWindowBridgeOptions): () => void {
  const relay = (message: FeedLibraryMutationMessage): void => {
    const envelope: FeedLibraryMutationEnvelope = { source: selfLabel, message: toWireMutation(message) };
    void emitTo(peerLabel, FEED_LIBRARY_MUTATION_EVENT, envelope).catch((error: unknown) => {
      logger.warn('FeedLibraryBridge', 'Failed to relay library change to the other window', {
        error,
        kind: message.kind,
        peerLabel,
      });
    });
  };
  feedLibraryMutationBus.setOutboundRelay(relay);

  const unsubscribe = createDeferredUnsubscribe(
    listen<unknown>(FEED_LIBRARY_MUTATION_EVENT, (event) => {
      const payload = event.payload;
      if (!isMutationEnvelope(payload) || payload.source === selfLabel) {
        return;
      }
      try {
        const message = fromWireMutation(payload.message);
        feedLibraryMutationBus.applyRemote(message);
        onRemoteMutation?.(message);
      } catch (error) {
        logger.error('FeedLibraryBridge', 'Failed to apply library change from the other window', {
          error,
          kind: payload.message.kind,
        });
      }
    }),
  );

  return () => {
    unsubscribe();
    if (feedLibraryMutationBus.getOutboundRelay() === relay) {
      feedLibraryMutationBus.setOutboundRelay(null);
    }
  };
}
