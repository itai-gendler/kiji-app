import { beforeEach, describe, expect, it, vi } from "vitest";

vi.unmock("@/services/feeds/opmlWorkflowService");

const boostMany = vi.hoisted(() => vi.fn());
const runTask = vi.hoisted(() => vi.fn());
const addTask = vi.hoisted(() => vi.fn());
const clearTasks = vi.hoisted(() => vi.fn());
const importEntries = vi.hoisted(() => vi.fn());
const showIndicator = vi.hoisted(() => vi.fn());
const clearIndicator = vi.hoisted(() => vi.fn());
const getFeedById = vi.hoisted(() => vi.fn());
const applyFaviconResult = vi.hoisted(() => vi.fn());
const getAllFeedMetadataCached = vi.hoisted(() => vi.fn());
const warn = vi.hoisted(() => vi.fn());
const taskResultHarness = vi.hoisted(() => ({
  listener: null as ((event: unknown) => void) | null,
}));

vi.mock("@/services/scheduler/feedSchedulerService", () => ({
  feedScheduler: {
    boostMany,
  },
}));

vi.mock("@/services/tasks/helperTaskClient", () => ({
  helperTaskClient: {
    clearTasks,
    runTask,
    addTask,
    onTaskResult: vi.fn((listener: (event: unknown) => void) => {
      taskResultHarness.listener = listener;
      return vi.fn();
    }),
  },
}));

vi.mock("@/services/feeds/opmlImportService", () => ({
  opmlImportService: {
    importEntries,
  },
}));

vi.mock("@/services/feeds/feedsManager", () => ({
  feedsManager: {
    getAllFeeds: vi.fn().mockResolvedValue([]),
    getFeedById,
    applyFaviconResult,
  },
}));

vi.mock("@/services/feeds/feedMetadataCache", () => ({
  getAllFeedMetadataCached,
}));

vi.mock("@/services/logger", () => ({
  logger: { info: vi.fn(), debug: vi.fn(), warn, error: vi.fn() },
}));

vi.mock("@/services/ui/sidebarIndicatorService", () => ({
  sidebarIndicatorService: {
    show: showIndicator,
    clear: clearIndicator,
  },
}));

import { opmlWorkflowService } from "@/services/feeds/opmlWorkflowService";

describe("opmlWorkflowService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearTasks.mockResolvedValue(undefined);
    runTask.mockResolvedValue({
      entries: [
        { title: "Feed A", url: "https://example.com/a.xml" },
        { title: "Feed B", url: "https://example.com/b.xml" },
      ],
    });
    addTask.mockImplementation(async () => ({ taskId: `task-${Math.random()}` }));
    getAllFeedMetadataCached.mockResolvedValue([]);
    applyFaviconResult.mockResolvedValue(null);
    importEntries.mockResolvedValue({
      importedFeeds: [
        { id: "feed-a", url: "https://example.com/a.xml" },
        { id: "feed-b", url: "https://example.com/b.xml" },
      ],
      summary: { total: 2, imported: 2, skippedDuplicate: 0, invalid: 0, failed: 0 },
      navigationTarget: { type: "station", stationName: "Imported" },
    });
    opmlWorkflowService.attachFaviconTaskListener();
  });

  it("schedules scoped article refresh before favicon backfill", async () => {
    await opmlWorkflowService.importFromOpmlText("<opml></opml>");

    expect(boostMany).toHaveBeenCalledWith(["feed-a", "feed-b"]);
    const faviconIndicatorCall = showIndicator.mock.calls.find(
      ([text]) => typeof text === "string" && /fetching/i.test(text) && /favicon/i.test(text),
    );
    expect(faviconIndicatorCall).toBeDefined();
    expect(boostMany.mock.invocationCallOrder[0])
      .toBeLessThan(showIndicator.mock.invocationCallOrder.at(-1) ?? Number.MAX_SAFE_INTEGER);
  });

  it("parses OPML via helper task and hands entries to import service", async () => {
    await opmlWorkflowService.importFromOpmlText("<opml><body></body></opml>", {
      fileName: "import.opml",
    });

    expect(runTask).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "opml-parse",
        payload: expect.objectContaining({
          opmlText: "<opml><body></body></opml>",
          fileName: "import.opml",
        }),
      }),
    );
    expect(importEntries).toHaveBeenCalled();
  });

  it("shows parse failure text when OPML parse task fails", async () => {
    runTask.mockRejectedValueOnce(new Error("invalid opml"));

    await expect(opmlWorkflowService.importFromOpmlText("<bad>")).rejects.toThrow("invalid opml");

    expect(showIndicator).toHaveBeenCalledWith("Parse OPML failed", { durationMs: 6000 });
  });

  it("shows import failure text when entry import fails", async () => {
    importEntries.mockRejectedValueOnce(new Error("db failed"));

    await expect(opmlWorkflowService.importFromOpmlText("<opml></opml>")).rejects.toThrow("db failed");

    expect(showIndicator).toHaveBeenCalledWith("Import feeds failed", { durationMs: 6000 });
  });

  describe("station favicon catch-up", () => {
    const flush = async () => {
      for (let index = 0; index < 5; index += 1) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    };

    const catalogFeed = (id: string, overrides: Record<string, unknown> = {}) => ({
      id,
      url: `https://${id}.example.com/rss.xml`,
      title: id,
      faviconStored: false,
      faviconFetchFailed: false,
      ...overrides,
    });

    beforeEach(async () => {
      // Drop dedupe state left by earlier cases on the shared singleton.
      await opmlWorkflowService.importFromOpmlText("<opml></opml>");
      await flush();
      vi.clearAllMocks();
      addTask.mockImplementation(async () => ({ taskId: `task-${Math.random()}` }));
      applyFaviconResult.mockResolvedValue(null);
    });

    it("re-reads only station feeds the slim catalog shows without a favicon", async () => {
      getAllFeedMetadataCached.mockResolvedValue([
        catalogFeed("feed-stored", { faviconStored: true }),
        catalogFeed("feed-missing"),
        catalogFeed("feed-emoji", { emoji: "📰" }),
        catalogFeed("feed-failed", { faviconFetchFailed: true }),
        catalogFeed("feed-other-station"),
      ]);
      getFeedById.mockImplementation(async (id: string) => catalogFeed(id));

      opmlWorkflowService.scheduleMissingFaviconsAfterStationSelection([
        "feed-stored",
        "feed-missing",
        "feed-emoji",
        "feed-failed",
      ]);
      await flush();

      expect(getAllFeedMetadataCached).toHaveBeenCalledTimes(1);
      expect(getFeedById.mock.calls.map(([id]) => id)).toEqual(["feed-missing"]);
      expect(addTask).toHaveBeenCalledTimes(1);
      expect(addTask).toHaveBeenCalledWith(expect.objectContaining({
        kind: "favicon-fetch",
        priority: "normal",
        payload: { feedId: "feed-missing", feedUrl: "https://feed-missing.example.com/rss.xml" },
      }));
    });

    it("skips a feed with a queued favicon task until its result arrives", async () => {
      getAllFeedMetadataCached.mockResolvedValue([catalogFeed("feed-missing")]);
      getFeedById.mockImplementation(async (id: string) => catalogFeed(id));
      addTask.mockResolvedValueOnce({ taskId: "task-1" });

      opmlWorkflowService.scheduleMissingFaviconsAfterStationSelection(["feed-missing"]);
      await flush();
      opmlWorkflowService.scheduleMissingFaviconsAfterStationSelection(["feed-missing"]);
      await flush();

      expect(getFeedById).toHaveBeenCalledTimes(1);
      expect(addTask).toHaveBeenCalledTimes(1);

      // Failed fetch: the row is now marked failed, so the fresh re-read
      // (the catalog may still be stale) must not enqueue it again.
      taskResultHarness.listener?.({ kind: "favicon-fetch", taskId: "task-1", status: "failed" });
      await flush();
      expect(applyFaviconResult).toHaveBeenCalledWith("feed-missing", null);
      getFeedById.mockImplementation(async (id: string) => catalogFeed(id, { faviconFetchFailed: true }));

      opmlWorkflowService.scheduleMissingFaviconsAfterStationSelection(["feed-missing"]);
      await flush();

      expect(getFeedById).toHaveBeenCalledTimes(2);
      expect(addTask).toHaveBeenCalledTimes(1);
    });

    it("logs a catalog failure instead of rejecting", async () => {
      getAllFeedMetadataCached.mockRejectedValue(new Error("ipc closed"));

      opmlWorkflowService.scheduleMissingFaviconsAfterStationSelection(["feed-missing"]);
      await flush();

      expect(warn).toHaveBeenCalledWith(
        "OpmlWorkflow",
        "Station favicon catch-up failed",
        expect.objectContaining({ feedCount: 1 }),
      );
      expect(getFeedById).not.toHaveBeenCalled();
      expect(addTask).not.toHaveBeenCalled();
    });
  });
});
