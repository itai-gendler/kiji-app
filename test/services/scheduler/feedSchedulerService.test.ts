import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const schedulerStart = vi.hoisted(() => vi.fn().mockResolvedValue("started"));
const schedulerStop = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const schedulerReconfigure = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const previewNativeCycle = vi.hoisted(() => vi.fn().mockResolvedValue({
  plan: { prioritized: [], skippedBackoffCount: 0, skippedSuppressedCount: 0 },
  queuedCount: 0,
  executedFeedCount: 0,
  changedFeeds: 0,
  notModifiedFeeds: 0,
  failedFeeds: 0,
  insertedArticles: 0,
  feedResults: [],
}));
const cancelNativeCycle = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const isNativeFeedIngestionEnabled = vi.hoisted(() => vi.fn(() => false));
const listen = vi.hoisted(() => vi.fn());
const eventHandlers = vi.hoisted(() => new Map<string, (event?: { payload?: unknown }) => void>());

const getSchedulerEventHandler = (
  event: string,
): ((event?: { payload?: unknown }) => void) | undefined => {
  return eventHandlers.get(event);
};
const getAll = vi.hoisted(() => vi.fn().mockResolvedValue([
  {
    id: "feed-1",
    title: "Feed 1",
    url: "https://feed-1.example.com/rss",
    tags: [],
    sortOrder: 0,
    updateFrequencyScore: 0.5,
    consecutiveFailures: 0,
  },
]));
const getById = vi.hoisted(() => vi.fn().mockResolvedValue({
  id: "feed-1",
  title: "Feed 1",
  url: "https://feed-1.example.com/rss",
  tags: [],
}));
const fetchFeedNetworkWithCache = vi.hoisted(() => vi.fn().mockResolvedValue({
  notModified: true,
  etag: "etag-1",
  lastModified: "date-1",
}));
const getSettings = vi.hoisted(() => vi.fn().mockResolvedValue({ backgroundUpdate: "every-5m" }));
const storeParsedFeedContent = vi.hoisted(() => vi.fn());
const syncFeedCountsBatch = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const publishFeedsCountsUpdated = vi.hoisted(() => vi.fn());

const getE2eConfig = vi.hoisted(() => vi.fn(() => ({ schedulerIntervalMs: 1 })));

vi.mock("@/services/e2e/e2eHarness", () => ({
  getE2eConfig,
}));

vi.mock("@/lib/tauriClient", () => ({
  tauriClient: {
    scheduler: {
      start: schedulerStart,
      stop: schedulerStop,
      reconfigure: schedulerReconfigure,
      previewNativeCycle,
      cancelNativeCycle,
    },
  },
}));

vi.mock("@/services/scheduler/nativeSchedulerCycle", async () => {
  const actual = await vi.importActual<typeof import("@/services/scheduler/nativeSchedulerCycle")>(
    "@/services/scheduler/nativeSchedulerCycle",
  );
  return {
    ...actual,
    isNativeFeedIngestionEnabled,
  };
});

vi.mock("@tauri-apps/api/event", () => ({
  listen,
}));

vi.mock("@/services/settings", () => ({
  settingsManager: {
    getSettings,
  },
}));

vi.mock("@/stores/feedStore", () => ({
  getAll,
  getById,
  update: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/stores/articleStore", () => ({
  store: vi.fn(),
  query: vi.fn(),
  getUnreadCount: vi.fn(),
  getArticleCount: vi.fn(),
  syncFeedCountsBatch,
}));

vi.mock("@/services/feeds/feedRefreshPipeline", () => ({
  storeParsedFeedContent,
}));

vi.mock("@/services/ui/feedLibraryMutationBus", () => ({
  feedLibraryMutationBus: {
    publishFeedsCountsUpdated,
  },
}));

vi.mock("@/services/feeds/feedsFetcher", () => ({
  feedsFetcher: {
    fetchFeedNetworkWithCache,
  },
}));

vi.mock("@/services/feeds/feedRefreshActivity", () => ({
  feedRefreshActivity: {
    track: vi.fn((_feedId: string, operation: () => Promise<unknown>) => operation()),
    beginQueuedFeeds: vi.fn(() => vi.fn()),
    getInteractiveRefreshScopeGeneration: vi.fn(() => 0),
    clearInteractiveRefreshDeferredTail: vi.fn(),
    noteInteractiveRefreshBackgroundBatch: vi.fn(),
    recordInteractiveRefreshFeedSettled: vi.fn(),
    getSnapshot: vi.fn(() => ({ interactiveRefreshScopeTotal: 0 })),
  },
}));

vi.mock("@/services/feeds/feedRefreshCoordinator", () => ({
  feedRefreshCoordinator: {
    run: vi.fn((_feedId: string, operation: () => Promise<unknown>) => operation()),
  },
}));

vi.mock("@/services/favicons/faviconRefreshService", () => ({
  maybeRefreshFavicon: vi.fn(),
}));

vi.mock("@/services/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { feedScheduler } from "@/services/scheduler/feedSchedulerService";
import * as feedStoreModule from "@/stores/feedStore";
import { logger as mockedLogger } from "@/services/logger";
import { resetNativeRefreshLockForTests } from "@/services/scheduler/nativeFeedRefresh";
import { resetWakeDedupeForTests } from "@/services/scheduler/schedulerWakeDedupe";
import {
  getRobustnessSnapshot,
  resetRobustnessMetricsForTests,
} from "@/services/diagnostics/robustnessMetrics";

describe("feedSchedulerService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetWakeDedupeForTests();
    resetNativeRefreshLockForTests();
    resetRobustnessMetricsForTests();
    getE2eConfig.mockReturnValue({ schedulerIntervalMs: 1 });
    isNativeFeedIngestionEnabled.mockReturnValue(false);
    getSettings.mockResolvedValue({ backgroundUpdate: "every-5m" });
    getAll.mockResolvedValue([
      {
        id: "feed-1",
        title: "Feed 1",
        url: "https://feed-1.example.com/rss",
        tags: [],
        sortOrder: 0,
        updateFrequencyScore: 0.5,
        consecutiveFailures: 0,
      },
    ]);
    getById.mockResolvedValue({
      id: "feed-1",
      title: "Feed 1",
      url: "https://feed-1.example.com/rss",
      tags: [],
    });
    fetchFeedNetworkWithCache.mockResolvedValue({
      notModified: true,
      etag: "etag-1",
      lastModified: "date-1",
    });
    listen.mockImplementation(async (event: string, handler: (event?: { payload?: unknown }) => void) => {
      eventHandlers.set(event, handler);
      return vi.fn();
    });
    eventHandlers.clear();
    schedulerStart.mockResolvedValue("started");
    cancelNativeCycle.mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await feedScheduler.stop();
    resetNativeRefreshLockForTests();
    previewNativeCycle.mockReset();
    previewNativeCycle.mockResolvedValue({
      plan: { prioritized: [], skippedBackoffCount: 0, skippedSuppressedCount: 0 },
      queuedCount: 0,
      executedFeedCount: 0,
      changedFeeds: 0,
      notModifiedFeeds: 0,
      failedFeeds: 0,
      insertedArticles: 0,
      feedResults: [],
    });
  });

  it("starts the native scheduler driver once and skips duplicate starts", async () => {
    await feedScheduler.start();
    await feedScheduler.start();

    expect(schedulerStart).toHaveBeenCalledTimes(1);
    expect(schedulerReconfigure).toHaveBeenCalledTimes(1);
    expect(listen).toHaveBeenCalledWith("scheduler:cycle-tick", expect.any(Function));
    expect(listen).toHaveBeenCalledWith("scheduler:system-sleep", expect.any(Function));
    expect(listen).toHaveBeenCalledWith("scheduler:system-resume", expect.any(Function));
  });

  it("stops native driver when lifecycle becomes stale during start", async () => {
    schedulerStart.mockImplementation(async () => {
      await feedScheduler.stop();
      return "started";
    });

    await feedScheduler.start();

    expect(schedulerStop).toHaveBeenCalled();
    expect(schedulerStart).toHaveBeenCalledTimes(1);
  });

  it("runs a refresh cycle when the native tick event fires", async () => {
    await feedScheduler.start();

    expect(listen).toHaveBeenCalledWith("scheduler:cycle-tick", expect.any(Function));
    const tickHandler = getSchedulerEventHandler("scheduler:cycle-tick");
    expect(tickHandler).toBeTypeOf("function");

    await tickHandler?.();
    await vi.waitFor(() => {
      expect(getAll).toHaveBeenCalledTimes(1);
    });

    expect(fetchFeedNetworkWithCache).toHaveBeenCalledWith(
      "https://feed-1.example.com/rss",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("defers overlapping native ticks and runs one follow-up cycle", async () => {
    let releaseRefresh!: () => void;
    fetchFeedNetworkWithCache.mockImplementation(() => new Promise((resolve) => {
      releaseRefresh = () => resolve({
        notModified: true,
        etag: "etag-1",
        lastModified: "date-1",
      });
    }));

    await feedScheduler.start();
    const tickHandler = getSchedulerEventHandler("scheduler:cycle-tick");

    const firstTick = tickHandler?.();
    await vi.waitFor(() => {
      expect(fetchFeedNetworkWithCache).toHaveBeenCalledTimes(1);
    });

    await tickHandler?.();
    await tickHandler?.();
    expect(fetchFeedNetworkWithCache).toHaveBeenCalledTimes(1);

    releaseRefresh();
    await firstTick;
    await vi.waitFor(() => {
      expect(getAll).toHaveBeenCalledTimes(2);
    }, { timeout: 5_000 });
  });

  it("defers boostMany during an active cycle and runs one follow-up cycle", async () => {
    let releaseRefresh!: () => void;
    fetchFeedNetworkWithCache.mockImplementation(() => new Promise((resolve) => {
      releaseRefresh = () => resolve({
        notModified: true,
        etag: "etag-1",
        lastModified: "date-1",
      });
    }));

    await feedScheduler.start();
    const tickHandler = getSchedulerEventHandler("scheduler:cycle-tick");

    const firstTick = tickHandler?.();
    await vi.waitFor(() => {
      expect(fetchFeedNetworkWithCache).toHaveBeenCalledTimes(1);
    });

    feedScheduler.boostMany(["feed-1"]);
    expect(getAll).toHaveBeenCalledTimes(1);

    releaseRefresh();
    await firstTick;
    await vi.waitFor(() => {
      expect(getAll).toHaveBeenCalledTimes(2);
    });
  });

  it("defers native ticks while station selection pauses the scheduler", async () => {
    await feedScheduler.start();
    const tickHandler = getSchedulerEventHandler("scheduler:cycle-tick");

    feedScheduler.pauseForStationSelection();
    await tickHandler?.();

    expect(getAll).not.toHaveBeenCalled();

    feedScheduler.resumeAfterStationSelection();
    await vi.waitFor(() => {
      expect(getAll).toHaveBeenCalledTimes(1);
    }, { timeout: 5_000 });
  });

  it("front-loads active station feeds when a native tick runs during station dwell", async () => {
    getAll.mockResolvedValue([
      {
        id: "feed-rest",
        title: "Rest",
        url: "https://feed-rest.example.com/rss",
        tags: [],
        sortOrder: 0,
        updateFrequencyScore: 1,
        consecutiveFailures: 0,
      },
      {
        id: "feed-station",
        title: "Station",
        url: "https://feed-station.example.com/rss",
        tags: ["Station"],
        sortOrder: 2,
        updateFrequencyScore: 0.1,
        consecutiveFailures: 0,
      },
    ]);
    getById.mockImplementation((feedId: string) => Promise.resolve({
      id: feedId,
      title: feedId,
      url: `https://${feedId}.example.com/rss`,
      tags: feedId === "feed-station" ? ["Station"] : [],
    }));

    await feedScheduler.start();
    const tickHandler = getSchedulerEventHandler("scheduler:cycle-tick");

    feedScheduler.setActiveStationFocus("tag:Station", ["feed-station"]);
    await tickHandler?.();
    await vi.waitFor(() => {
      expect(fetchFeedNetworkWithCache).toHaveBeenCalledTimes(2);
    });

    expect(fetchFeedNetworkWithCache.mock.calls[0]?.[0]).toBe("https://feed-station.example.com/rss");
  });

  it("suppresses foreground-refreshed station feeds for only the next cycle", async () => {
    await feedScheduler.start();
    const tickHandler = getSchedulerEventHandler("scheduler:cycle-tick");

    feedScheduler.suppressFeedsForNextCycle(["feed-1"]);
    await tickHandler?.();
    await vi.waitFor(() => {
      expect(getAll).toHaveBeenCalledTimes(1);
    });
    expect(fetchFeedNetworkWithCache).not.toHaveBeenCalled();

    await tickHandler?.();
    await vi.waitFor(() => {
      expect(fetchFeedNetworkWithCache).toHaveBeenCalledTimes(1);
    });
  });

  it("aborts an in-flight cycle when station selection pauses the scheduler", async () => {
    let releaseRefresh!: () => void;
    fetchFeedNetworkWithCache.mockImplementation(() => new Promise((resolve) => {
      releaseRefresh = () => resolve({
        notModified: true,
        etag: "etag-1",
        lastModified: "date-1",
      });
    }));

    await feedScheduler.start();
    const tickHandler = getSchedulerEventHandler("scheduler:cycle-tick");

    const firstTick = tickHandler?.();
    await vi.waitFor(() => {
      expect(fetchFeedNetworkWithCache).toHaveBeenCalledTimes(1);
    });

    feedScheduler.pauseForStationSelection();
    releaseRefresh();
    await firstTick;

    feedScheduler.resumeAfterStationSelection();
    await vi.waitFor(() => {
      expect(getAll).toHaveBeenCalledTimes(2);
    }, { timeout: 5_000 });
  });

  it("keeps the scheduler paused until nested station selections finish", async () => {
    await feedScheduler.start();
    const tickHandler = getSchedulerEventHandler("scheduler:cycle-tick");

    feedScheduler.pauseForStationSelection();
    feedScheduler.pauseForStationSelection();
    feedScheduler.resumeAfterStationSelection();

    await tickHandler?.();
    expect(getAll).not.toHaveBeenCalled();

    feedScheduler.resumeAfterStationSelection();
    await vi.waitFor(() => {
      expect(getAll).toHaveBeenCalledTimes(1);
    }, { timeout: 5_000 });
  });

  it("defers boostMany during station pause and runs one cycle after resume", async () => {
    await feedScheduler.start();

    feedScheduler.pauseForStationSelection();
    feedScheduler.boostMany(["feed-1"]);

    expect(getAll).not.toHaveBeenCalled();

    feedScheduler.resumeAfterStationSelection();
    await vi.waitFor(() => {
      expect(getAll).toHaveBeenCalledTimes(1);
    });
  });

  it("defers catchUpAfterResume during station pause and runs after resume", async () => {
    vi.useFakeTimers();

    try {
      await feedScheduler.start();
      const tickHandler = getSchedulerEventHandler("scheduler:cycle-tick");

      await tickHandler?.();
      await vi.waitFor(() => {
        expect(getAll).toHaveBeenCalledTimes(1);
      });

      vi.advanceTimersByTime(6 * 60_000);

      feedScheduler.pauseForStationSelection();
      await feedScheduler.catchUpAfterResume();
      expect(getAll).toHaveBeenCalledTimes(1);

      feedScheduler.resumeAfterStationSelection();
      await vi.waitFor(() => {
        expect(getAll).toHaveBeenCalledTimes(2);
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("releases station pause on background and runs deferred scheduler tick", async () => {
    await feedScheduler.start();
    const tickHandler = getSchedulerEventHandler("scheduler:cycle-tick");

    feedScheduler.pauseForStationSelection();
    await tickHandler?.();
    expect(getAll).not.toHaveBeenCalled();

    feedScheduler.releaseStationSelectionPause("background");
    await vi.waitFor(() => {
      expect(getAll).toHaveBeenCalledTimes(1);
    });

    feedScheduler.resumeAfterStationSelection();
  });

  it("auto-releases station pause after the max pause window", async () => {
    vi.useFakeTimers();

    try {
      await feedScheduler.start();

      feedScheduler.pauseForStationSelection();
      expect(getAll).not.toHaveBeenCalled();

      await vi.advanceTimersByTimeAsync(10 * 60_000 + 1);

      await vi.waitFor(() => {
        expect(getAll).toHaveBeenCalledTimes(1);
      });

      feedScheduler.resumeAfterStationSelection();
    } finally {
      vi.useRealTimers();
    }
  });

  it("registers global wake handlers for native eval ticks and power events", async () => {
    await feedScheduler.start();

    const globalScope = globalThis as Record<string, unknown>;
    expect(globalScope.__kijiSchedulerTick).toEqual(expect.any(Function));
    expect(globalScope.__kijiSchedulerSleep).toEqual(expect.any(Function));
    expect(globalScope.__kijiSchedulerResume).toEqual(expect.any(Function));
  });

  it("reconfigures the native driver during catch-up after resume", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    try {
      await feedScheduler.start();
      const tickHandler = getSchedulerEventHandler("scheduler:cycle-tick");
      await tickHandler?.();
      await vi.waitFor(() => {
        expect(getAll).toHaveBeenCalledTimes(1);
      });

      schedulerReconfigure.mockClear();
      await vi.advanceTimersByTimeAsync(6 * 60_000);

      await feedScheduler.catchUpAfterResume();

      expect(schedulerReconfigure).toHaveBeenCalledWith({ mode: "every-5m" });
      await vi.waitFor(() => {
        expect(getAll).toHaveBeenCalledTimes(2);
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("aborts a stuck cycle after repeated deferred native ticks", async () => {
    getE2eConfig.mockReturnValue(null);
    let releaseRefresh!: () => void;
    fetchFeedNetworkWithCache.mockImplementation((_url, options?: { signal?: AbortSignal }) => new Promise((resolve, reject) => {
      const onAbort = (): void => {
        reject(new DOMException("Aborted", "AbortError"));
      };
      options?.signal?.addEventListener("abort", onAbort, { once: true });
      releaseRefresh = () => {
        options?.signal?.removeEventListener("abort", onAbort);
        resolve({
          notModified: true,
          etag: "etag-1",
          lastModified: "date-1",
        });
      };
    }));

    await feedScheduler.start();
    const tickHandler = getSchedulerEventHandler("scheduler:cycle-tick");

    void tickHandler?.();
    await vi.waitFor(() => {
      expect(fetchFeedNetworkWithCache).toHaveBeenCalledTimes(1);
    });

    await tickHandler?.();
    await tickHandler?.();
    await tickHandler?.();
    expect(getAll).toHaveBeenCalledTimes(1);

    await tickHandler?.();
    await vi.waitFor(() => {
      expect(getAll).toHaveBeenCalledTimes(2);
    });
  });

  it("detects a system sleep gap via wall-clock heartbeat and aborts the stalled cycle", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    try {
      fetchFeedNetworkWithCache.mockImplementation((_url: string, options?: { signal?: AbortSignal }) => new Promise((resolve, reject) => {
        const onAbort = (): void => {
          reject(new DOMException("Aborted", "AbortError"));
        };
        options?.signal?.addEventListener("abort", onAbort, { once: true });
        void resolve;
      }));

      await feedScheduler.start();
      const tickHandler = getSchedulerEventHandler("scheduler:cycle-tick");

      void tickHandler?.();
      await vi.waitFor(() => {
        expect(fetchFeedNetworkWithCache).toHaveBeenCalledTimes(1);
      });
      expect(getAll).toHaveBeenCalledTimes(1);

      // Simulate system sleep: wall clock jumps 40 minutes while timers were
      // frozen, then the next heartbeat fires and sees the gap.
      vi.setSystemTime(Date.now() + 40 * 60_000);
      await vi.advanceTimersByTimeAsync(30_000);

      // Heartbeat → catch-up path → stale cycle aborted → catch-up cycle runs.
      await vi.waitFor(() => {
        expect(getAll).toHaveBeenCalledTimes(2);
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it("runs station-first catch-up after resume when a station is active", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    getAll.mockResolvedValue([
      {
        id: "feed-rest",
        title: "Rest",
        url: "https://feed-rest.example.com/rss",
        tags: [],
        sortOrder: 0,
        updateFrequencyScore: 1,
        consecutiveFailures: 0,
      },
      {
        id: "feed-station",
        title: "Station",
        url: "https://feed-station.example.com/rss",
        tags: ["Station"],
        sortOrder: 2,
        updateFrequencyScore: 0.1,
        consecutiveFailures: 0,
      },
    ]);
    getById.mockImplementation((feedId: string) => Promise.resolve({
      id: feedId,
      title: feedId,
      url: `https://${feedId}.example.com/rss`,
      tags: feedId === "feed-station" ? ["Station"] : [],
    }));

    try {
      await feedScheduler.start();
      const tickHandler = getSchedulerEventHandler("scheduler:cycle-tick");
      await tickHandler?.();
      await vi.waitFor(() => {
        expect(getAll).toHaveBeenCalledTimes(1);
      });

      feedScheduler.setActiveStationFocus("tag:Station", ["feed-station"]);
      fetchFeedNetworkWithCache.mockClear();
      getAll.mockClear();

      await vi.advanceTimersByTimeAsync(6 * 60_000);
      await feedScheduler.catchUpAfterResume();

      await vi.waitFor(() => {
        expect(fetchFeedNetworkWithCache).toHaveBeenCalledTimes(2);
      });
      expect(fetchFeedNetworkWithCache.mock.calls[0]?.[0]).toBe("https://feed-station.example.com/rss");
      expect(fetchFeedNetworkWithCache.mock.calls[1]?.[0]).toBe("https://feed-rest.example.com/rss");
      expect(getAll).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("retries catch-up within the interval after an all-failed cycle (overnight dark wake)", async () => {
    // Use wall-clock interval (not 1ms E2E) so a just-finished failed cycle is
    // not treated as overdue solely by the interval gate.
    getE2eConfig.mockReturnValue(null);
    getSettings.mockResolvedValue({ backgroundUpdate: "every-15m" });
    fetchFeedNetworkWithCache.mockRejectedValue(new Error("network down"));

    const cycleEvents: string[] = [];
    const unsubscribe = feedScheduler.on((event) => {
      cycleEvents.push(event.type);
    });

    try {
      await feedScheduler.start();
      const tickHandler = getSchedulerEventHandler("scheduler:cycle-tick");
      await tickHandler?.();
      await vi.waitFor(() => {
        expect(cycleEvents).toContain("cycle-complete");
      });

      fetchFeedNetworkWithCache.mockClear();
      getAll.mockClear();
      fetchFeedNetworkWithCache.mockResolvedValue({
        notModified: true,
        etag: "etag-1",
        lastModified: "date-1",
      });

      // No timer advance: interval is not overdue, but needsResumeCatchUp is set.
      await feedScheduler.catchUpAfterResume();

      await vi.waitFor(() => {
        expect(getAll).toHaveBeenCalledTimes(1);
      });
      expect(fetchFeedNetworkWithCache).toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });

  it("marks needsResumeCatchUp on sleep-gap heartbeat so short gaps after failures still catch up", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    getE2eConfig.mockReturnValue(null);
    getSettings.mockResolvedValue({ backgroundUpdate: "every-15m" });

    try {
      await feedScheduler.start();
      const tickHandler = getSchedulerEventHandler("scheduler:cycle-tick");
      await tickHandler?.();
      await vi.waitFor(() => {
        expect(getAll).toHaveBeenCalledTimes(1);
      });

      getAll.mockClear();
      fetchFeedNetworkWithCache.mockClear();

      // Wall clock jumps 5 minutes (less than 15m interval) — sleep gap ≥ 120s.
      vi.setSystemTime(Date.now() + 5 * 60_000);
      await vi.advanceTimersByTimeAsync(30_000);

      await vi.waitFor(() => {
        expect(getAll).toHaveBeenCalledTimes(1);
      });
      expect(fetchFeedNetworkWithCache).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it("aborts in-flight refresh on system sleep", async () => {
    let releaseRefresh!: () => void;
    fetchFeedNetworkWithCache.mockImplementation((_url, options?: { signal?: AbortSignal }) => new Promise((resolve, reject) => {
      const onAbort = (): void => {
        reject(new DOMException("Aborted", "AbortError"));
      };
      options?.signal?.addEventListener("abort", onAbort, { once: true });
      releaseRefresh = () => {
        options?.signal?.removeEventListener("abort", onAbort);
        resolve({
          notModified: true,
          etag: "etag-1",
          lastModified: "date-1",
        });
      };
    }));

    await feedScheduler.start();
    const tickHandler = getSchedulerEventHandler("scheduler:cycle-tick");
    const sleepHandler = getSchedulerEventHandler("scheduler:system-sleep");

    void tickHandler?.();
    await vi.waitFor(() => {
      expect(fetchFeedNetworkWithCache).toHaveBeenCalledTimes(1);
    });

    await sleepHandler?.();
    await tickHandler?.();

    await vi.waitFor(() => {
      expect(getAll).toHaveBeenCalledTimes(2);
    });
  });

  it("runs catch-up when the system resume event fires after an overdue interval", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    try {
      await feedScheduler.start();
      const tickHandler = getSchedulerEventHandler("scheduler:cycle-tick");
      const resumeHandler = getSchedulerEventHandler("scheduler:system-resume");

      await tickHandler?.();
      await vi.waitFor(() => {
        expect(getAll).toHaveBeenCalledTimes(1);
      });

      getAll.mockClear();
      await vi.advanceTimersByTimeAsync(6 * 60_000);

      await resumeHandler?.();

      await vi.waitFor(() => {
        expect(getAll).toHaveBeenCalledTimes(1);
      });
    } finally {
      vi.useRealTimers();
    }
  });

  describe("native eval wake delivery (simulates throttled webview)", () => {
    const getGlobalWakeHandler = (name: string): (() => void) => {
      const handler = (globalThis as Record<string, unknown>)[name];
      expect(handler).toEqual(expect.any(Function));
      return handler as () => void;
    };

    beforeEach(() => {
      listen.mockImplementation(async () => vi.fn());
      eventHandlers.clear();
    });

    it("runs a refresh cycle via __kijiSchedulerTick when Tauri listen never registers", async () => {
      await feedScheduler.start();

      expect(eventHandlers.has("scheduler:cycle-tick")).toBe(false);

      getGlobalWakeHandler("__kijiSchedulerTick")();

      await vi.waitFor(() => {
        expect(getAll).toHaveBeenCalledTimes(1);
      });
    });

    it("runs overdue catch-up via __kijiSchedulerResume when listen is unavailable", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });

      try {
        await feedScheduler.start();

        getGlobalWakeHandler("__kijiSchedulerTick")();
        await vi.waitFor(() => {
          expect(getAll).toHaveBeenCalledTimes(1);
        });

        getAll.mockClear();
        await vi.advanceTimersByTimeAsync(6 * 60_000);

        getGlobalWakeHandler("__kijiSchedulerResume")();

        await vi.waitFor(() => {
          expect(getAll).toHaveBeenCalledTimes(1);
        });
        expect(eventHandlers.has("scheduler:system-resume")).toBe(false);
      } finally {
        vi.useRealTimers();
      }
    });

    it("aborts in-flight refresh via __kijiSchedulerSleep when listen is unavailable", async () => {
      let releaseRefresh!: () => void;
      fetchFeedNetworkWithCache.mockImplementation((_url, options?: { signal?: AbortSignal }) => new Promise((resolve, reject) => {
        const onAbort = (): void => {
          reject(new DOMException("Aborted", "AbortError"));
        };
        options?.signal?.addEventListener("abort", onAbort, { once: true });
        releaseRefresh = () => {
          options?.signal?.removeEventListener("abort", onAbort);
          resolve({
            notModified: true,
            etag: "etag-1",
            lastModified: "date-1",
          });
        };
      }));

      await feedScheduler.start();

      void getGlobalWakeHandler("__kijiSchedulerTick")();
      await vi.waitFor(() => {
        expect(fetchFeedNetworkWithCache).toHaveBeenCalledTimes(1);
      });

      await getGlobalWakeHandler("__kijiSchedulerSleep")();
      getGlobalWakeHandler("__kijiSchedulerTick")();

      await vi.waitFor(() => {
        expect(getAll).toHaveBeenCalledTimes(2);
      });
      expect(eventHandlers.has("scheduler:system-sleep")).toBe(false);

      releaseRefresh();
    });

    it("removes eval wake globals when the scheduler lifecycle stops", async () => {
      await feedScheduler.start();
      expect((globalThis as Record<string, unknown>).__kijiSchedulerResume).toEqual(expect.any(Function));

      await feedScheduler.stop();

      const globalScope = globalThis as Record<string, unknown>;
      expect(globalScope.__kijiSchedulerTick).toBeUndefined();
      expect(globalScope.__kijiSchedulerSleep).toBeUndefined();
      expect(globalScope.__kijiSchedulerResume).toBeUndefined();
    });
  });

  describe("native feed ingestion cycle", () => {
    beforeEach(() => {
      getE2eConfig.mockReturnValue(null);
      isNativeFeedIngestionEnabled.mockReturnValue(true);
      previewNativeCycle.mockResolvedValue({
        plan: {
          prioritized: [{ feedId: "feed-1", score: 1 }],
          skippedBackoffCount: 0,
          skippedSuppressedCount: 0,
        },
        queuedCount: 1,
        executedFeedCount: 1,
        changedFeeds: 1,
        notModifiedFeeds: 0,
        failedFeeds: 0,
        insertedArticles: 2,
        feedResults: [{ feedId: "feed-1", status: "changed", insertedCount: 2 }],
      });
    });

    it("runs previewNativeCycle instead of renderer fetch/store on scheduler tick", async () => {
      await feedScheduler.start();

      getSchedulerEventHandler("scheduler:cycle-tick")?.();
      await vi.waitFor(() => {
        expect(previewNativeCycle).toHaveBeenCalledTimes(1);
      });

      expect(fetchFeedNetworkWithCache).not.toHaveBeenCalled();
      expect(storeParsedFeedContent).not.toHaveBeenCalled();
      expect(getAll).not.toHaveBeenCalled();
      expect(previewNativeCycle).toHaveBeenCalledWith(
        expect.objectContaining({
          execute: true,
          concurrency: expect.any(Number),
          cycleId: expect.stringMatching(/^native-\d+$/),
        }),
      );
    });

    it("scopes post-import refresh to boosted feed ids", async () => {
      await feedScheduler.start();

      feedScheduler.boostMany(["feed-1", "feed-2"]);
      await vi.waitFor(() => {
        expect(previewNativeCycle).toHaveBeenCalledTimes(1);
      });

      expect(previewNativeCycle).toHaveBeenCalledWith(
        expect.objectContaining({
          execute: true,
          options: expect.objectContaining({
            onlyFeedIds: ["feed-1", "feed-2"],
          }),
        }),
      );
      expect(
        (previewNativeCycle.mock.calls[0][0] as { options?: { bypassFailureBackoff?: boolean } })
          .options?.bypassFailureBackoff,
      ).not.toBe(true);
    });

    it("passes one-shot bypassFailureBackoff on the paused boostMany resume cycle", async () => {
      const stationFeedIds = Array.from({ length: 65 }, (_, index) => `feed-${index + 1}`);
      await feedScheduler.start();

      feedScheduler.pauseForStationSelection();
      feedScheduler.boostMany(stationFeedIds);

      expect(previewNativeCycle).not.toHaveBeenCalled();

      feedScheduler.resumeAfterStationSelection();
      await vi.waitFor(() => {
        expect(previewNativeCycle).toHaveBeenCalledTimes(1);
      });

      expect(previewNativeCycle).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            onlyFeedIds: stationFeedIds,
            bypassFailureBackoff: true,
          }),
        }),
      );

      previewNativeCycle.mockClear();
      getSchedulerEventHandler("scheduler:cycle-tick")?.();
      await vi.waitFor(() => {
        expect(previewNativeCycle).toHaveBeenCalledTimes(1);
      });

      expect(
        (previewNativeCycle.mock.calls[0][0] as { options?: { bypassFailureBackoff?: boolean } })
          .options?.bypassFailureBackoff,
      ).not.toBe(true);
    });

    it("passes bypassFailureBackoff on resume catch-up after an all-failed native cycle", async () => {
      getSettings.mockResolvedValue({ backgroundUpdate: "every-15m" });
      previewNativeCycle.mockResolvedValue({
        plan: { prioritized: [], skippedBackoffCount: 0, skippedSuppressedCount: 0 },
        queuedCount: 1,
        executedFeedCount: 1,
        changedFeeds: 0,
        notModifiedFeeds: 0,
        failedFeeds: 1,
        insertedArticles: 0,
        feedResults: [{ feedId: "feed-1", status: "failed", error: "network down" }],
      });

      await feedScheduler.start();
      getSchedulerEventHandler("scheduler:cycle-tick")?.();
      await vi.waitFor(() => {
        expect(previewNativeCycle).toHaveBeenCalledTimes(1);
      });

      previewNativeCycle.mockClear();
      previewNativeCycle.mockResolvedValue({
        plan: { prioritized: [], skippedBackoffCount: 0, skippedSuppressedCount: 0 },
        queuedCount: 1,
        executedFeedCount: 1,
        changedFeeds: 0,
        notModifiedFeeds: 1,
        failedFeeds: 0,
        insertedArticles: 0,
        feedResults: [{ feedId: "feed-1", status: "not-modified", insertedCount: 0 }],
      });

      await feedScheduler.catchUpAfterResume();

      await vi.waitFor(() => {
        expect(previewNativeCycle).toHaveBeenCalledTimes(1);
      });
      expect(previewNativeCycle).toHaveBeenCalledWith(
        expect.objectContaining({
          options: expect.objectContaining({
            bypassFailureBackoff: true,
          }),
        }),
      );
    });

    it("emits feeds-batch-updated with per-feed insert counts after a native cycle", async () => {
      const events: Array<{ type: string; updates?: ReadonlyArray<{ feedId: string; newArticleCount: number }> }> = [];
      const unsubscribe = feedScheduler.on((event) => {
        events.push(event as (typeof events)[number]);
      });

      try {
        await feedScheduler.start();
        getSchedulerEventHandler("scheduler:cycle-tick")?.();

        await vi.waitFor(() => {
          expect(events.some((event) => event.type === "cycle-complete")).toBe(true);
        });

        const batchEvent = events.find((event) => event.type === "feeds-batch-updated");
        expect(batchEvent?.updates).toEqual([{ feedId: "feed-1", newArticleCount: 2 }]);

        const batchIndex = events.findIndex((event) => event.type === "feeds-batch-updated");
        const completeIndex = events.findIndex((event) => event.type === "cycle-complete");
        expect(batchIndex).toBeGreaterThanOrEqual(0);
        expect(batchIndex).toBeLessThan(completeIndex);
      } finally {
        unsubscribe();
      }
    });

    it("publishes committed inserts when a station pause supersedes an in-flight native cycle", async () => {
      let releaseCycle!: (value: unknown) => void;
      previewNativeCycle.mockImplementation(() => new Promise((resolve) => {
        releaseCycle = resolve;
      }));

      const events: Array<{ type: string; updates?: ReadonlyArray<{ feedId: string; newArticleCount: number }> }> = [];
      const unsubscribe = feedScheduler.on((event) => {
        events.push(event as (typeof events)[number]);
      });

      try {
        await feedScheduler.start();
        getSchedulerEventHandler("scheduler:cycle-tick")?.();
        await vi.waitFor(() => {
          expect(previewNativeCycle).toHaveBeenCalledTimes(1);
        });

        // The station switch aborts the renderer wait and supersedes the
        // cycle, but the native IPC still runs to completion and commits
        // inserts + ETags in Rust — those results must still publish.
        feedScheduler.pauseForStationSelection();
        releaseCycle({
          plan: { prioritized: [{ feedId: "feed-1", score: 1 }], skippedBackoffCount: 0, skippedSuppressedCount: 0 },
          queuedCount: 1,
          executedFeedCount: 1,
          changedFeeds: 1,
          notModifiedFeeds: 0,
          failedFeeds: 0,
          insertedArticles: 2,
          feedResults: [{ feedId: "feed-1", status: "changed", insertedCount: 2 }],
        });

        await vi.waitFor(() => {
          expect(events.some((event) => event.type === "feeds-batch-updated")).toBe(true);
        });

        const batchEvent = events.find((event) => event.type === "feeds-batch-updated");
        expect(batchEvent?.updates).toEqual([{ feedId: "feed-1", newArticleCount: 2 }]);
        expect(syncFeedCountsBatch).toHaveBeenCalledWith(["feed-1"]);
        expect(events.some((event) => event.type === "cycle-complete")).toBe(false);

        previewNativeCycle.mockResolvedValue({
          plan: { prioritized: [], skippedBackoffCount: 0, skippedSuppressedCount: 0 },
          queuedCount: 0,
          executedFeedCount: 0,
          changedFeeds: 0,
          notModifiedFeeds: 0,
          failedFeeds: 0,
          insertedArticles: 0,
          feedResults: [],
        });
        feedScheduler.resumeAfterStationSelection();
      } finally {
        unsubscribe();
      }
    });

    it("publishes committed inserts progressively during a long native cycle", async () => {
      let releaseCycle!: (value: unknown) => void;
      previewNativeCycle.mockImplementation(() => new Promise((resolve) => {
        releaseCycle = resolve;
      }));

      const events: Array<{ type: string; updates?: ReadonlyArray<{ feedId: string; newArticleCount: number }> }> = [];
      const unsubscribe = feedScheduler.on((event) => {
        events.push(event as (typeof events)[number]);
      });

      try {
        await feedScheduler.start();
        getSchedulerEventHandler("scheduler:cycle-tick")?.();
        await vi.waitFor(() => {
          expect(previewNativeCycle).toHaveBeenCalledTimes(1);
        });

        const nativeCycleId = (previewNativeCycle.mock.calls[0]?.[0] as { cycleId?: string } | undefined)
          ?.cycleId;
        expect(nativeCycleId).toEqual(expect.stringMatching(/^native-\d+$/));

        // A long import-boost cycle commits inserts per feed in Rust while
        // the renderer still waits on the IPC: per-feed events must publish
        // mid-cycle so the visible station and counts fill progressively
        // (production 2026-07-29: 557-feed cycle ran ~3 minutes with the
        // list stuck on the empty view).
        const feedEventHandler = eventHandlers.get("scheduler:native-cycle-feed") as
          | ((event: { payload: { feedId: string; insertedCount?: number; error?: string; cycleId?: string } }) => void)
          | undefined;
        expect(feedEventHandler).toBeDefined();
        feedEventHandler?.({ payload: { feedId: "feed-1", insertedCount: 2, cycleId: nativeCycleId } });
        feedEventHandler?.({ payload: { feedId: "feed-2", insertedCount: 3, cycleId: nativeCycleId } });

        await vi.waitFor(() => {
          expect(events.some((event) => event.type === "feeds-batch-updated")).toBe(true);
        }, { timeout: 5000 });

        const progressEvent = events.find((event) => event.type === "feeds-batch-updated");
        expect(progressEvent?.updates).toEqual([
          { feedId: "feed-1", newArticleCount: 2 },
          { feedId: "feed-2", newArticleCount: 3 },
        ]);
        expect(syncFeedCountsBatch).toHaveBeenCalledWith(["feed-1", "feed-2"]);
        expect(events.some((event) => event.type === "cycle-complete")).toBe(false);

        releaseCycle({
          plan: { prioritized: [], skippedBackoffCount: 0, skippedSuppressedCount: 0 },
          queuedCount: 2,
          executedFeedCount: 2,
          changedFeeds: 2,
          notModifiedFeeds: 0,
          failedFeeds: 0,
          insertedArticles: 5,
          feedResults: [
            { feedId: "feed-1", status: "changed", insertedCount: 2 },
            { feedId: "feed-2", status: "changed", insertedCount: 3 },
          ],
        });

        await vi.waitFor(() => {
          expect(events.some((event) => event.type === "cycle-complete")).toBe(true);
        });

        // The cycle-end publish stays as the idempotent final flush.
        const batchEvents = events.filter((event) => event.type === "feeds-batch-updated");
        expect(batchEvents).toHaveLength(2);
        expect(batchEvents[1]?.updates).toEqual([
          { feedId: "feed-1", newArticleCount: 2 },
          { feedId: "feed-2", newArticleCount: 3 },
        ]);
      } finally {
        unsubscribe();
      }
    });

    it("does not emit feeds-batch-updated when the native cycle inserts nothing", async () => {
      previewNativeCycle.mockResolvedValue({
        plan: { prioritized: [], skippedBackoffCount: 0, skippedSuppressedCount: 0 },
        queuedCount: 1,
        executedFeedCount: 1,
        changedFeeds: 0,
        notModifiedFeeds: 1,
        failedFeeds: 0,
        insertedArticles: 0,
        feedResults: [{ feedId: "feed-1", status: "not-modified", insertedCount: 0 }],
      });

      const events: Array<{ type: string }> = [];
      const unsubscribe = feedScheduler.on((event) => {
        events.push(event);
      });

      try {
        await feedScheduler.start();
        getSchedulerEventHandler("scheduler:cycle-tick")?.();

        await vi.waitFor(() => {
          expect(events.some((event) => event.type === "cycle-complete")).toBe(true);
        });

        expect(events.some((event) => event.type === "feeds-batch-updated")).toBe(false);
      } finally {
        unsubscribe();
      }
    });

    it("preempts a stale native cycle when boostMany arrives (deferred-tick threshold)", async () => {
      let resolveCycle!: () => void;
      previewNativeCycle.mockImplementationOnce(() => new Promise((resolve) => {
        resolveCycle = () => {
          resolve({
            plan: { prioritized: [], skippedBackoffCount: 0, skippedSuppressedCount: 0 },
            queuedCount: 0,
            executedFeedCount: 0,
            changedFeeds: 0,
            notModifiedFeeds: 0,
            failedFeeds: 0,
            insertedArticles: 0,
            feedResults: [],
          });
        };
      }));

      await feedScheduler.start();
      const tickHandler = getSchedulerEventHandler("scheduler:cycle-tick");
      tickHandler?.();
      await vi.waitFor(() => {
        expect(previewNativeCycle).toHaveBeenCalledTimes(1);
      });

      // Three deferred ticks mark the cycle stale (MAX_DEFERRED_TICKS_BEFORE_FORCE_ABORT).
      await tickHandler?.();
      await tickHandler?.();
      await tickHandler?.();
      expect(previewNativeCycle).toHaveBeenCalledTimes(1);

      // A boost against the stale cycle preempts it instead of deferring.
      feedScheduler.boostMany(["feed-2"]);
      resolveCycle();

      await vi.waitFor(() => {
        expect(previewNativeCycle).toHaveBeenCalledTimes(2);
      });
      expect(previewNativeCycle).toHaveBeenLastCalledWith(
        expect.objectContaining({
          execute: true,
          options: expect.objectContaining({
            onlyFeedIds: ["feed-2"],
          }),
        }),
      );
    });

    it("defers boosted import refresh until the native cycle completes", async () => {
      let resolveCycle!: () => void;
      previewNativeCycle.mockImplementation(() => new Promise((resolve) => {
        resolveCycle = () => {
          resolve({
            plan: { prioritized: [], skippedBackoffCount: 0, skippedSuppressedCount: 0 },
            queuedCount: 0,
            executedFeedCount: 0,
            changedFeeds: 0,
            notModifiedFeeds: 0,
            failedFeeds: 0,
            insertedArticles: 0,
            feedResults: [],
          });
        };
      }));

      await feedScheduler.start();
      getSchedulerEventHandler("scheduler:cycle-tick")?.();
      await vi.waitFor(() => {
        expect(previewNativeCycle).toHaveBeenCalledTimes(1);
      });

      feedScheduler.boostMany(["feed-2"]);
      getSchedulerEventHandler("scheduler:cycle-tick")?.();
      expect(previewNativeCycle).toHaveBeenCalledTimes(1);

      resolveCycle();
      await vi.waitFor(() => {
        expect(previewNativeCycle).toHaveBeenCalledTimes(2);
      });

      expect(previewNativeCycle).toHaveBeenLastCalledWith(
        expect.objectContaining({
          execute: true,
          options: expect.objectContaining({
            onlyFeedIds: ["feed-2"],
          }),
        }),
      );
    });
  });

  it('catchUpAfterResumeHonorsStartupDeferUntilAckOr30s', async () => {
    await feedScheduler.start();
    feedScheduler.setStartupCycleDeferredForTests(true);
    previewNativeCycle.mockClear();

    schedulerReconfigure.mockClear();
    await feedScheduler.catchUpAfterResume();
    expect(previewNativeCycle).not.toHaveBeenCalled();
    expect(schedulerReconfigure).toHaveBeenCalled();

    feedScheduler.pauseForStationSelection();
    feedScheduler.boostMany(['feed-1']);
    feedScheduler.resumeAfterStationSelection();
    expect(previewNativeCycle).not.toHaveBeenCalled();

    feedScheduler.acknowledgeSidebarInteraction();
    expect(previewNativeCycle).not.toHaveBeenCalled();
  });

  it('resumeAfterStationSelection.restoreDoesNotLiftDeferral', async () => {
    await feedScheduler.start();
    feedScheduler.setStartupCycleDeferredForTests(true);
    previewNativeCycle.mockClear();

    feedScheduler.pauseForStationSelection();
    feedScheduler.resumeAfterStationSelection();
    expect(previewNativeCycle).not.toHaveBeenCalled();
  });

  it("dedupes dual-channel wakes with the same wakeId", async () => {
    await feedScheduler.start();
    getAll.mockClear();

    const payload = { wakeId: 11, driverGeneration: 2, kind: "tick" };
    getSchedulerEventHandler("scheduler:cycle-tick")?.({ payload });
    (globalThis as Record<string, unknown>).__kijiSchedulerTick?.(payload);

    await vi.waitFor(() => {
      expect(getAll).toHaveBeenCalledTimes(1);
    });
  });

  it("still runs event-only and eval-only wakes without identity payload", async () => {
    const events: Array<{ type: string }> = [];
    const unsubscribe = feedScheduler.on((event) => {
      events.push(event);
    });

    try {
      await feedScheduler.start();
      getAll.mockClear();

      getSchedulerEventHandler("scheduler:cycle-tick")?.();
      await vi.waitFor(() => {
        expect(events.some((event) => event.type === "cycle-complete")).toBe(true);
      });
      expect(getAll).toHaveBeenCalled();

      events.length = 0;
      getAll.mockClear();
      (globalThis as Record<string, (payload?: unknown) => void>).__kijiSchedulerTick?.();
      await vi.waitFor(() => {
        expect(events.some((event) => event.type === "cycle-complete")).toBe(true);
      });
      expect(getAll).toHaveBeenCalled();
    } finally {
      unsubscribe();
    }
  });

  it("selection-changed preserves pending import refresh feed ids", async () => {
    isNativeFeedIngestionEnabled.mockReturnValue(true);
    getE2eConfig.mockReturnValue({ schedulerIntervalMs: 1 });
    let releaseCycle!: (value: unknown) => void;
    previewNativeCycle.mockImplementation(() => new Promise((resolve) => {
      releaseCycle = resolve;
    }));

    await feedScheduler.start();
    getSchedulerEventHandler("scheduler:cycle-tick")?.();
    await vi.waitFor(() => {
      expect(previewNativeCycle).toHaveBeenCalledTimes(1);
    });

    feedScheduler.pauseForStationSelection();
    feedScheduler.boostMany(["feed-import-1", "feed-import-2"]);
    feedScheduler.releaseStationSelectionPause("selection-changed");

    previewNativeCycle.mockClear();
    previewNativeCycle.mockResolvedValue({
      plan: { prioritized: [], skippedBackoffCount: 0, skippedSuppressedCount: 0 },
      queuedCount: 2,
      executedFeedCount: 2,
      changedFeeds: 0,
      notModifiedFeeds: 2,
      failedFeeds: 0,
      insertedArticles: 0,
      feedResults: [
        { feedId: "feed-import-1", status: "not-modified", insertedCount: 0 },
        { feedId: "feed-import-2", status: "not-modified", insertedCount: 0 },
      ],
    });

    releaseCycle({
      plan: { prioritized: [], skippedBackoffCount: 0, skippedSuppressedCount: 0 },
      queuedCount: 0,
      executedFeedCount: 0,
      changedFeeds: 0,
      notModifiedFeeds: 0,
      failedFeeds: 0,
      insertedArticles: 0,
      feedResults: [],
    });

    await vi.waitFor(() => {
      expect(previewNativeCycle).toHaveBeenCalled();
    });
    expect(previewNativeCycle).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          onlyFeedIds: expect.arrayContaining(["feed-import-1", "feed-import-2"]),
        }),
      }),
    );
  });

  it("pause does not clear cycleInProgress until the in-flight cycle drains", async () => {
    isNativeFeedIngestionEnabled.mockReturnValue(true);
    getE2eConfig.mockReturnValue({ schedulerIntervalMs: 1 });
    let releaseCycle!: (value: unknown) => void;
    previewNativeCycle.mockImplementation(() => new Promise((resolve) => {
      releaseCycle = resolve;
    }));

    await feedScheduler.start();
    getSchedulerEventHandler("scheduler:cycle-tick")?.();
    await vi.waitFor(() => {
      expect(previewNativeCycle).toHaveBeenCalledTimes(1);
    });

    feedScheduler.pauseForStationSelection();
    expect(cancelNativeCycle).toHaveBeenCalled();
    feedScheduler.resumeAfterStationSelection();

    previewNativeCycle.mockClear();
    getSchedulerEventHandler("scheduler:cycle-tick")?.();
    await Promise.resolve();
    expect(previewNativeCycle).not.toHaveBeenCalled();

    previewNativeCycle.mockResolvedValue({
      plan: { prioritized: [], skippedBackoffCount: 0, skippedSuppressedCount: 0 },
      queuedCount: 0,
      executedFeedCount: 0,
      changedFeeds: 0,
      notModifiedFeeds: 0,
      failedFeeds: 0,
      insertedArticles: 0,
      feedResults: [],
    });

    releaseCycle({
      plan: { prioritized: [], skippedBackoffCount: 0, skippedSuppressedCount: 0 },
      queuedCount: 0,
      executedFeedCount: 0,
      changedFeeds: 0,
      notModifiedFeeds: 0,
      failedFeeds: 0,
      insertedArticles: 0,
      feedResults: [],
    });

    await vi.waitFor(() => {
      expect(previewNativeCycle).toHaveBeenCalled();
    });
  });

  describe("robustness: reconfigure, cancellation, count sync", () => {
    const CANCELLED_INVOKE_ERROR = JSON.stringify({
      code: "FEED_REQUEST_CANCELLED",
      message: "Feed request was cancelled.",
    });
    const nativeChangedResult = {
      plan: { prioritized: [{ feedId: "feed-1", score: 1 }], skippedBackoffCount: 0, skippedSuppressedCount: 0 },
      queuedCount: 1,
      executedFeedCount: 1,
      changedFeeds: 1,
      notModifiedFeeds: 0,
      failedFeeds: 0,
      insertedArticles: 2,
      feedResults: [{ feedId: "feed-1", status: "changed", insertedCount: 2 }],
    };
    type RecordedEvent = { type: string; cycleId?: number; updates?: unknown };

    const recordEvents = () => {
      const events: RecordedEvent[] = [];
      const unsubscribe = feedScheduler.on((event) => {
        events.push(event as RecordedEvent);
      });
      return { events, unsubscribe };
    };

    const failureWrites = () => vi.mocked(feedStoreModule.update).mock.calls.filter(
      ([, patch]) => (patch as { consecutiveFailures?: number }).consecutiveFailures !== undefined
        && (patch as { consecutiveFailures?: number }).consecutiveFailures !== 0,
    );

    afterEach(() => {
      syncFeedCountsBatch.mockReset();
      syncFeedCountsBatch.mockResolvedValue([]);
      storeParsedFeedContent.mockReset();
    });

    it("ignores same-mode reconfigure while a native cycle runs (no cancel, no driver restart)", async () => {
      isNativeFeedIngestionEnabled.mockReturnValue(true);
      let releaseCycle!: (value: unknown) => void;
      previewNativeCycle.mockImplementation(() => new Promise((resolve) => {
        releaseCycle = resolve;
      }));
      const { events, unsubscribe } = recordEvents();

      try {
        await feedScheduler.start();
        getSchedulerEventHandler("scheduler:cycle-tick")?.();
        await vi.waitFor(() => {
          expect(previewNativeCycle).toHaveBeenCalledTimes(1);
        });

        schedulerReconfigure.mockClear();
        // e.g. a theme / font change re-broadcasts settings with the same mode.
        await feedScheduler.reconfigure("every-5m");

        expect(schedulerReconfigure).not.toHaveBeenCalled();
        expect(cancelNativeCycle).not.toHaveBeenCalled();

        releaseCycle(nativeChangedResult);
        await vi.waitFor(() => {
          expect(events.some((event) => event.type === "cycle-complete")).toBe(true);
        });
        expect(events.some((event) => event.type === "feeds-batch-updated")).toBe(true);
      } finally {
        unsubscribe();
      }
    });

    it("does not abort the legacy cycle signal on a same-mode reconfigure", async () => {
      let cycleSignal: AbortSignal | undefined;
      let releaseFetch!: () => void;
      fetchFeedNetworkWithCache.mockImplementation((_url: string, options?: { signal?: AbortSignal }) => {
        cycleSignal = options?.signal;
        return new Promise((resolve) => {
          releaseFetch = () => resolve({ notModified: true, etag: "etag-1", lastModified: "date-1" });
        });
      });
      const { events, unsubscribe } = recordEvents();

      try {
        await feedScheduler.start();
        getSchedulerEventHandler("scheduler:cycle-tick")?.();
        await vi.waitFor(() => {
          expect(fetchFeedNetworkWithCache).toHaveBeenCalledTimes(1);
        });

        await feedScheduler.reconfigure("every-5m");
        expect(cycleSignal?.aborted).toBe(false);

        releaseFetch();
        await vi.waitFor(() => {
          expect(events.some((event) => event.type === "cycle-complete")).toBe(true);
        });
      } finally {
        unsubscribe();
      }
    });

    it("still cancels the cycle and reconfigures the driver on a real mode change", async () => {
      isNativeFeedIngestionEnabled.mockReturnValue(true);
      let releaseCycle!: (value: unknown) => void;
      previewNativeCycle.mockImplementation(() => new Promise((resolve) => {
        releaseCycle = resolve;
      }));
      const { events, unsubscribe } = recordEvents();

      try {
        await feedScheduler.start();
        getSchedulerEventHandler("scheduler:cycle-tick")?.();
        await vi.waitFor(() => {
          expect(previewNativeCycle).toHaveBeenCalledTimes(1);
        });

        schedulerReconfigure.mockClear();
        await feedScheduler.reconfigure("every-15m");

        expect(schedulerReconfigure).toHaveBeenCalledWith({ mode: "every-15m" });
        expect(cancelNativeCycle).toHaveBeenCalledWith({
          cycleId: expect.stringMatching(/^native-\d+$/),
        });

        releaseCycle(nativeChangedResult);
        // The mode change starts a new lifecycle: the old cycle is superseded
        // and never reports cycle-complete.
        await new Promise((resolve) => setTimeout(resolve, 10));
        expect(events.some((event) => event.type === "cycle-complete")).toBe(false);
      } finally {
        unsubscribe();
      }
    });

    it("does not skip reconfigure after stop() or a failed driver start", async () => {
      await feedScheduler.start();
      await feedScheduler.stop();
      schedulerReconfigure.mockClear();
      await feedScheduler.reconfigure("every-5m");
      expect(schedulerReconfigure).toHaveBeenCalledWith({ mode: "every-5m" });

      await feedScheduler.stop();
      schedulerStart.mockRejectedValueOnce(new Error("driver failed"));
      await feedScheduler.start();
      schedulerReconfigure.mockClear();
      await feedScheduler.reconfigure("every-5m");
      expect(schedulerReconfigure).toHaveBeenCalledWith({ mode: "every-5m" });
    });

    it("does not record a failure when an aborted legacy fetch rejects with FEED_REQUEST_CANCELLED", async () => {
      fetchFeedNetworkWithCache.mockImplementation((_url: string, options?: { signal?: AbortSignal }) => (
        new Promise((_resolve, reject) => {
          // Mirrors Tauri: aborting cancels the Rust request, which rejects
          // with the raw structured command-error string, not an AbortError.
          options?.signal?.addEventListener("abort", () => reject(CANCELLED_INVOKE_ERROR), { once: true });
        })
      ));
      const { events, unsubscribe } = recordEvents();

      try {
        await feedScheduler.start();
        getSchedulerEventHandler("scheduler:cycle-tick")?.();
        await vi.waitFor(() => {
          expect(fetchFeedNetworkWithCache).toHaveBeenCalledTimes(1);
        });

        feedScheduler.pauseForStationSelection();
        fetchFeedNetworkWithCache.mockResolvedValue({ notModified: true, etag: "etag-1", lastModified: "date-1" });
        feedScheduler.resumeAfterStationSelection();

        // The deferred follow-up only starts after the aborted cycle drained.
        await vi.waitFor(() => {
          expect(getAll).toHaveBeenCalledTimes(2);
        });
        await vi.waitFor(() => {
          expect(events.some((event) => event.type === "cycle-complete")).toBe(true);
        });

        expect(failureWrites()).toEqual([]);
        expect(events.some((event) => event.type === "feed-failed")).toBe(false);
      } finally {
        unsubscribe();
      }
    });

    it("does not record a failure for a FEED_REQUEST_CANCELLED rejection", async () => {
      fetchFeedNetworkWithCache.mockRejectedValue(CANCELLED_INVOKE_ERROR);
      const { events, unsubscribe } = recordEvents();

      try {
        await feedScheduler.start();
        getSchedulerEventHandler("scheduler:cycle-tick")?.();
        await vi.waitFor(() => {
          expect(events.some((event) => event.type === "cycle-complete")).toBe(true);
        });

        expect(failureWrites()).toEqual([]);
        expect(events.some((event) => event.type === "feed-failed")).toBe(false);
      } finally {
        unsubscribe();
      }
    });

    it("still emits feeds-batch-updated and skips resume catch-up when native count sync fails", async () => {
      getE2eConfig.mockReturnValue(null);
      isNativeFeedIngestionEnabled.mockReturnValue(true);
      previewNativeCycle.mockResolvedValue(nativeChangedResult);
      syncFeedCountsBatch.mockRejectedValue(new Error("count sync failed"));
      const { events, unsubscribe } = recordEvents();

      try {
        await feedScheduler.start();
        getSchedulerEventHandler("scheduler:cycle-tick")?.();
        await vi.waitFor(() => {
          expect(events.some((event) => event.type === "cycle-complete")).toBe(true);
        });

        const batchEvent = events.find((event) => event.type === "feeds-batch-updated");
        expect(batchEvent?.updates).toEqual([{ feedId: "feed-1", newArticleCount: 2 }]);
        expect(syncFeedCountsBatch).toHaveBeenCalledWith(["feed-1"]);
        expect(publishFeedsCountsUpdated).not.toHaveBeenCalled();
        expect(mockedLogger.warn).toHaveBeenCalledWith(
          "Scheduler",
          "Failed to sync feed counts after refresh cycle",
          expect.objectContaining({ feedCount: 1 }),
        );

        // Cycle succeeded (changed feed), so focus/resume must not trigger a
        // needsResumeCatchUp full catch-up within the interval.
        previewNativeCycle.mockClear();
        await feedScheduler.catchUpAfterResume();
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(previewNativeCycle).not.toHaveBeenCalled();
      } finally {
        unsubscribe();
      }
    });

    it("records the legacy cycle outcome when count sync fails after inserts", async () => {
      getE2eConfig.mockReturnValue(null);
      fetchFeedNetworkWithCache.mockResolvedValue({
        notModified: false,
        data: "<rss></rss>",
        etag: "etag-2",
        lastModified: "date-2",
      });
      storeParsedFeedContent.mockResolvedValue({ insertedCount: 1, articles: [], updateFrequencyScore: 0.5 });
      syncFeedCountsBatch.mockRejectedValue(new Error("count sync failed"));
      const { events, unsubscribe } = recordEvents();

      try {
        await feedScheduler.start();
        getSchedulerEventHandler("scheduler:cycle-tick")?.();
        await vi.waitFor(() => {
          expect(events.some((event) => event.type === "cycle-complete")).toBe(true);
        });

        expect(syncFeedCountsBatch).toHaveBeenCalledWith(["feed-1"]);
        expect(events.some((event) => event.type === "feed-updated")).toBe(true);
        expect(mockedLogger.error).not.toHaveBeenCalledWith(
          "Scheduler",
          "Background refresh cycle failed",
          expect.anything(),
        );

        getAll.mockClear();
        await feedScheduler.catchUpAfterResume();
        await new Promise((resolve) => setTimeout(resolve, 0));
        expect(getAll).not.toHaveBeenCalled();
      } finally {
        unsubscribe();
      }
    });
  });

  describe("station switch keeps the interrupted full-library follow-up", () => {
    const emptyNativeResult = {
      plan: { prioritized: [], skippedBackoffCount: 0, skippedSuppressedCount: 0 },
      queuedCount: 0,
      executedFeedCount: 0,
      changedFeeds: 0,
      notModifiedFeeds: 0,
      failedFeeds: 0,
      insertedArticles: 0,
      feedResults: [],
    };
    type NativeOptions = { onlyFeedIds?: string[]; skipFeedIdsForThisCycle?: string[] };
    const callOptions = (index: number): NativeOptions | undefined => (
      previewNativeCycle.mock.calls[index]?.[0] as { options?: NativeOptions } | undefined
    )?.options;
    const lastCompletedAt = (): number | null => (
      feedScheduler as unknown as { lastCycleCompletedAt: number | null }
    ).lastCycleCompletedAt;
    const settle = (ms = 5) => new Promise((resolve) => setTimeout(resolve, ms));

    beforeEach(() => {
      isNativeFeedIngestionEnabled.mockReturnValue(true);
      getE2eConfig.mockReturnValue({ schedulerIntervalMs: 1 });
    });

    it("runs the station-scoped boost cycle and then the unscoped follow-up", async () => {
      let releaseInterrupted!: (value: unknown) => void;
      const completedAtWhenFollowUpStarted: Array<number | null> = [];
      let call = 0;
      previewNativeCycle.mockImplementation(() => {
        call += 1;
        if (call === 2) {
          return new Promise((resolve) => {
            releaseInterrupted = resolve;
          });
        }
        if (call >= 3) {
          completedAtWhenFollowUpStarted.push(lastCompletedAt());
        }
        return Promise.resolve(emptyNativeResult);
      });
      const events: Array<{ type: string }> = [];
      const unsubscribe = feedScheduler.on((event) => {
        events.push(event);
      });

      try {
        await feedScheduler.start();
        const tickHandler = getSchedulerEventHandler("scheduler:cycle-tick");

        // 1. A full cycle completes.
        tickHandler?.();
        await vi.waitFor(() => {
          expect(events.filter((event) => event.type === "cycle-complete")).toHaveLength(1);
        });
        const completedAfterFirstFullCycle = lastCompletedAt();
        expect(completedAfterFirstFullCycle).not.toBeNull();

        // 2. Next tick starts a full cycle; the station switch interrupts it.
        await settle();
        tickHandler?.();
        await vi.waitFor(() => {
          expect(previewNativeCycle).toHaveBeenCalledTimes(2);
        });
        feedScheduler.pauseForStationSelection();
        feedScheduler.suppressFeedsForNextCycle(["feed-foreground"]);
        feedScheduler.boostMany(["feed-station-1", "feed-station-2"]);
        releaseInterrupted(emptyNativeResult);
        await settle();
        expect(previewNativeCycle).toHaveBeenCalledTimes(2);

        // 3. Resume: station-scoped cycle, then the preserved full follow-up.
        feedScheduler.resumeAfterStationSelection();
        await vi.waitFor(() => {
          expect(previewNativeCycle).toHaveBeenCalledTimes(4);
        });

        expect(callOptions(2)?.onlyFeedIds).toEqual(["feed-station-1", "feed-station-2"]);
        // Out-of-scope suppressions are kept for the full follow-up.
        expect(callOptions(2)?.skipFeedIdsForThisCycle).toBeUndefined();
        expect(callOptions(3)?.onlyFeedIds).toBeUndefined();
        expect(callOptions(3)?.skipFeedIdsForThisCycle).toEqual(["feed-foreground"]);

        // The scoped station cycle did not mark the library fresh.
        expect(completedAtWhenFollowUpStarted).toEqual([
          completedAfterFirstFullCycle,
          completedAfterFirstFullCycle,
        ]);
        await vi.waitFor(() => {
          expect(lastCompletedAt()).toBeGreaterThan(completedAfterFirstFullCycle ?? 0);
        });
        expect(getRobustnessSnapshot().counters["scheduler.fullFollowUpCycle"]).toBe(1);

        // Exactly one follow-up: no further cycles without a new trigger.
        await settle(20);
        expect(previewNativeCycle).toHaveBeenCalledTimes(4);
      } finally {
        unsubscribe();
      }
    });

    it("does not add a full cycle when the station switch interrupted nothing", async () => {
      previewNativeCycle.mockResolvedValue(emptyNativeResult);
      const events: Array<{ type: string }> = [];
      const unsubscribe = feedScheduler.on((event) => {
        events.push(event);
      });

      try {
        await feedScheduler.start();
        getSchedulerEventHandler("scheduler:cycle-tick")?.();
        await vi.waitFor(() => {
          expect(events.filter((event) => event.type === "cycle-complete")).toHaveLength(1);
        });
        const completedAfterFullCycle = lastCompletedAt();

        feedScheduler.pauseForStationSelection();
        feedScheduler.boostMany(["feed-station-1"]);
        feedScheduler.resumeAfterStationSelection();
        await vi.waitFor(() => {
          expect(events.filter((event) => event.type === "cycle-complete")).toHaveLength(2);
        });
        await settle(20);

        expect(previewNativeCycle).toHaveBeenCalledTimes(2);
        expect(callOptions(1)?.onlyFeedIds).toEqual(["feed-station-1"]);
        expect(lastCompletedAt()).toBe(completedAfterFullCycle);
        expect(getRobustnessSnapshot().counters["scheduler.fullFollowUpCycle"]).toBeUndefined();
      } finally {
        unsubscribe();
      }
    });

    it("does not let a boost consume a native tick deferred during the station pause", async () => {
      previewNativeCycle.mockResolvedValue(emptyNativeResult);
      await feedScheduler.start();

      feedScheduler.pauseForStationSelection();
      getSchedulerEventHandler("scheduler:cycle-tick")?.();
      feedScheduler.boostMany(["feed-station-1"]);
      await settle();
      feedScheduler.resumeAfterStationSelection();

      await vi.waitFor(() => {
        expect(previewNativeCycle).toHaveBeenCalledTimes(2);
      });
      expect(callOptions(0)?.onlyFeedIds).toEqual(["feed-station-1"]);
      expect(callOptions(1)?.onlyFeedIds).toBeUndefined();
      await settle(20);
      expect(previewNativeCycle).toHaveBeenCalledTimes(2);
    });

    it("keeps resume catch-up armed when only a scoped cycle succeeded after an all-failed full cycle", async () => {
      getE2eConfig.mockReturnValue(null);
      getSettings.mockResolvedValue({ backgroundUpdate: "every-15m" });
      previewNativeCycle.mockResolvedValue({
        ...emptyNativeResult,
        queuedCount: 1,
        executedFeedCount: 1,
        failedFeeds: 1,
        feedResults: [{ feedId: "feed-1", status: "failed", error: "network down" }],
      });
      const events: Array<{ type: string }> = [];
      const unsubscribe = feedScheduler.on((event) => {
        events.push(event);
      });

      try {
        await feedScheduler.start();
        getSchedulerEventHandler("scheduler:cycle-tick")?.();
        await vi.waitFor(() => {
          expect(events.filter((event) => event.type === "cycle-complete")).toHaveLength(1);
        });

        previewNativeCycle.mockResolvedValue({
          ...emptyNativeResult,
          queuedCount: 1,
          executedFeedCount: 1,
          notModifiedFeeds: 1,
          feedResults: [{ feedId: "feed-station-1", status: "not-modified", insertedCount: 0 }],
        });
        feedScheduler.boostMany(["feed-station-1"]);
        await vi.waitFor(() => {
          expect(events.filter((event) => event.type === "cycle-complete")).toHaveLength(2);
        });

        await feedScheduler.catchUpAfterResume();
        await vi.waitFor(() => {
          expect(previewNativeCycle).toHaveBeenCalledTimes(3);
        });
        expect(callOptions(2)?.onlyFeedIds).toBeUndefined();
      } finally {
        unsubscribe();
      }
    });

    it("keeps the preserved full follow-up deferred during startup deferral", async () => {
      let releaseInterrupted!: (value: unknown) => void;
      let call = 0;
      previewNativeCycle.mockImplementation(() => {
        call += 1;
        if (call === 1) {
          return new Promise((resolve) => {
            releaseInterrupted = resolve;
          });
        }
        return Promise.resolve(emptyNativeResult);
      });

      await feedScheduler.start();
      getSchedulerEventHandler("scheduler:cycle-tick")?.();
      await vi.waitFor(() => {
        expect(previewNativeCycle).toHaveBeenCalledTimes(1);
      });

      feedScheduler.pauseForStationSelection();
      feedScheduler.boostMany(["feed-station-1"]);
      feedScheduler.setStartupCycleDeferredForTests(true);
      releaseInterrupted(emptyNativeResult);
      await settle();
      feedScheduler.resumeAfterStationSelection();
      await settle(20);

      expect(previewNativeCycle).toHaveBeenCalledTimes(1);
    });
  });

  describe("station pause and round-2 robustness metrics", () => {
    it("records how long the station pause was held, once per outer pause", async () => {
      await feedScheduler.start();

      feedScheduler.pauseForStationSelection();
      feedScheduler.pauseForStationSelection();
      feedScheduler.resumeAfterStationSelection();
      expect(getRobustnessSnapshot().durations["scheduler.stationPauseHeldMs"]).toBeUndefined();
      feedScheduler.resumeAfterStationSelection();
      expect(getRobustnessSnapshot().durations["scheduler.stationPauseHeldMs"]?.count).toBe(1);

      feedScheduler.pauseForStationSelection();
      feedScheduler.releaseStationSelectionPause("background");
      feedScheduler.resumeAfterStationSelection();
      expect(getRobustnessSnapshot().durations["scheduler.stationPauseHeldMs"]?.count).toBe(2);
      expect(getRobustnessSnapshot().counters["scheduler.stationPauseSafetyRelease"]).toBeUndefined();
    });

    it("records and warns when the 10-minute safety timeout releases the pause", async () => {
      vi.useFakeTimers();

      try {
        await feedScheduler.start();
        feedScheduler.pauseForStationSelection();
        await vi.advanceTimersByTimeAsync(10 * 60_000 + 1);

        const snapshot = getRobustnessSnapshot();
        expect(snapshot.counters["scheduler.stationPauseSafetyRelease"]).toBe(1);
        expect(snapshot.durations["scheduler.stationPauseHeldMs"]?.count).toBe(1);
        expect(snapshot.durations["scheduler.stationPauseHeldMs"]?.maxMs).toBeGreaterThanOrEqual(10 * 60_000);
        expect(mockedLogger.warn).toHaveBeenCalledWith(
          "Scheduler",
          "Station-selection scheduler pause hit the safety timeout",
          expect.objectContaining({ heldMs: expect.any(Number) }),
        );

        feedScheduler.resumeAfterStationSelection();
        expect(getRobustnessSnapshot().durations["scheduler.stationPauseHeldMs"]?.count).toBe(1);
      } finally {
        vi.useRealTimers();
      }
    });

    it("counts same-mode reconfigure skips", async () => {
      await feedScheduler.start();
      await feedScheduler.reconfigure("every-5m");

      expect(getRobustnessSnapshot().counters["scheduler.reconfigureSkippedSameMode"]).toBe(1);
      expect(mockedLogger.debug).toHaveBeenCalledWith(
        "Scheduler",
        "Skipped same-mode scheduler reconfigure",
        { mode: "every-5m" },
      );
    });

    it("counts count-sync failures after a cycle", async () => {
      getE2eConfig.mockReturnValue(null);
      isNativeFeedIngestionEnabled.mockReturnValue(true);
      previewNativeCycle.mockResolvedValue({
        plan: { prioritized: [], skippedBackoffCount: 0, skippedSuppressedCount: 0 },
        queuedCount: 1,
        executedFeedCount: 1,
        changedFeeds: 1,
        notModifiedFeeds: 0,
        failedFeeds: 0,
        insertedArticles: 2,
        feedResults: [{ feedId: "feed-1", status: "changed", insertedCount: 2 }],
      });
      syncFeedCountsBatch.mockRejectedValueOnce(new Error("count sync failed"));

      await feedScheduler.start();
      getSchedulerEventHandler("scheduler:cycle-tick")?.();
      await vi.waitFor(() => {
        expect(getRobustnessSnapshot().counters["scheduler.countSyncFailed"]).toBe(1);
      });
    });

    it("counts cancelled fetches skipped by the legacy cycle", async () => {
      fetchFeedNetworkWithCache.mockRejectedValue(JSON.stringify({
        code: "FEED_REQUEST_CANCELLED",
        message: "Feed request was cancelled.",
      }));

      await feedScheduler.start();
      getSchedulerEventHandler("scheduler:cycle-tick")?.();
      await vi.waitFor(() => {
        expect(getRobustnessSnapshot().counters["scheduler.cancelledFetchSkipped"]).toBe(1);
      });
    });

    it("reports cancelled native per-feed results in the cycle stats", async () => {
      getE2eConfig.mockReturnValue(null);
      isNativeFeedIngestionEnabled.mockReturnValue(true);
      const cancelled = JSON.stringify({ code: "FEED_REQUEST_CANCELLED", message: "Feed request was cancelled." });
      previewNativeCycle.mockResolvedValue({
        plan: { prioritized: [], skippedBackoffCount: 0, skippedSuppressedCount: 0 },
        queuedCount: 3,
        executedFeedCount: 3,
        changedFeeds: 0,
        notModifiedFeeds: 1,
        failedFeeds: 2,
        insertedArticles: 0,
        feedResults: [
          { feedId: "feed-1", status: "not-modified", insertedCount: 0 },
          { feedId: "feed-2", status: "failed", error: cancelled },
          { feedId: "feed-3", status: "failed", error: "network down" },
        ],
      });

      await feedScheduler.start();
      getSchedulerEventHandler("scheduler:cycle-tick")?.();
      await vi.waitFor(() => {
        expect(mockedLogger.info).toHaveBeenCalledWith(
          "Scheduler",
          "Native background refresh cycle stats",
          expect.objectContaining({ failedFeeds: 2, cancelledFeeds: 1 }),
        );
      });
    });
  });
});
