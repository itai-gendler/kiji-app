import { beforeEach, describe, expect, it, vi } from "vitest";

const fetchWithCache = vi.hoisted(() => vi.fn());
const abortRequest = vi.hoisted(() => vi.fn());
const loggerWarn = vi.hoisted(() => vi.fn());

vi.mock("@/lib/tauriClient", () => ({
  tauriClient: {
    feeds: {
      fetchWithCache,
      abortRequest,
    },
  },
}));

vi.mock("@/services/logger/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: loggerWarn,
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { feedsFetcher } from "@/services/feeds/feedsFetcher";

// Raw Tauri invoke rejection for a cancelled request (see src-tauri/src/net/errors.rs).
const CANCELLED_INVOKE_ERROR = JSON.stringify({
  code: "FEED_REQUEST_CANCELLED",
  message: "Feed request was cancelled.",
});

const FEED_URL = "https://feed.example.com/rss";

describe("feedsFetcher.fetchFeedNetworkWithCache cancellation", () => {
  beforeEach(() => {
    fetchWithCache.mockReset();
    abortRequest.mockReset();
    loggerWarn.mockReset();
    abortRequest.mockResolvedValue(undefined);
  });

  it("rethrows a Tauri-cancelled fetch as AbortError when the signal aborts", async () => {
    const controller = new AbortController();
    fetchWithCache.mockImplementation(() => new Promise((_resolve, reject) => {
      // Rust cancels the in-flight request once abortRequest reaches it.
      abortRequest.mockImplementation(async () => {
        reject(CANCELLED_INVOKE_ERROR);
      });
    }));

    const pending = feedsFetcher.fetchFeedNetworkWithCache(FEED_URL, { signal: controller.signal });
    await vi.waitFor(() => {
      expect(fetchWithCache).toHaveBeenCalledTimes(1);
    });
    controller.abort();

    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(abortRequest).toHaveBeenCalledWith({
      requestId: expect.stringMatching(/^feed-/),
    });
  });

  it("treats a FEED_REQUEST_CANCELLED rejection as AbortError even without a signal", async () => {
    fetchWithCache.mockRejectedValue(CANCELLED_INVOKE_ERROR);

    await expect(feedsFetcher.fetchFeedNetworkWithCache(FEED_URL)).rejects.toMatchObject({
      name: "AbortError",
    });
  });

  it("passes non-cancel command errors through unchanged", async () => {
    const timeoutError = JSON.stringify({
      code: "FEED_NETWORK_TIMEOUT",
      message: "Feed request timed out.",
    });
    fetchWithCache.mockRejectedValue(timeoutError);

    await expect(feedsFetcher.fetchFeedNetworkWithCache(FEED_URL)).rejects.toBe(timeoutError);
  });

  it("swallows and logs a failed fire-and-forget abortRequest", async () => {
    const controller = new AbortController();
    let rejectFetch!: (reason: unknown) => void;
    fetchWithCache.mockImplementation(() => new Promise((_resolve, reject) => {
      rejectFetch = reject;
    }));
    abortRequest.mockRejectedValue(new Error("abort IPC failed"));

    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => {
      unhandled.push(reason);
    };
    process.on("unhandledRejection", onUnhandled);

    try {
      const pending = feedsFetcher.fetchFeedNetworkWithCache(FEED_URL, { signal: controller.signal });
      await vi.waitFor(() => {
        expect(fetchWithCache).toHaveBeenCalledTimes(1);
      });
      controller.abort();

      await vi.waitFor(() => {
        expect(loggerWarn).toHaveBeenCalledWith(
          "FeedsFetcher",
          "Failed to abort feed request",
          expect.objectContaining({ requestId: expect.stringMatching(/^feed-/) }),
        );
      });

      rejectFetch(CANCELLED_INVOKE_ERROR);
      await expect(pending).rejects.toMatchObject({ name: "AbortError" });
      // Let any unhandled rejection surface before asserting.
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(unhandled).toEqual([]);
    } finally {
      process.off("unhandledRejection", onUnhandled);
    }
  });
});
