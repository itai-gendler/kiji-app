import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildCurrentArticlePayload,
  createCurrentArticlePublisher,
  currentArticlePayloadKey,
  type CurrentArticleViewState,
} from "@/services/assistant/currentArticleBridge";
import type { Article } from "@/types/article";

const article = (overrides: Partial<Article> = {}): Article => ({
  hash: "hash-1",
  title: "Rust async",
  description: "",
  content: "<p>Stored body</p>",
  link: "https://example.com/a",
  fetchedDate: "2026-10-19T00:00:00.000Z",
  feedId: "feed-1",
  feedUrl: "https://example.com/feed",
  feedTitle: "Example",
  read: false,
  starred: false,
  saved: false,
  ...overrides,
});

const state = (overrides: Partial<CurrentArticleViewState> = {}): CurrentArticleViewState => ({
  article: article(),
  visible: true,
  isTemporary: false,
  isSavedSnapshot: false,
  readerHtml: null,
  ...overrides,
});

describe("buildCurrentArticlePayload", () => {
  it("sends only the hash for a feed article in basic mode", () => {
    const payload = buildCurrentArticlePayload(state());
    expect(payload).toMatchObject({ kind: "feed", hash: "hash-1", title: "Rust async", readerMode: false });
    expect(payload?.bodyHtml).toBeUndefined();
  });

  it("sends the reader-mode body because it differs from the stored content", () => {
    const payload = buildCurrentArticlePayload(state({ readerHtml: "<p>Reader</p>" }));
    expect(payload).toMatchObject({ kind: "feed", bodyHtml: "<p>Reader</p>", readerMode: true });
  });

  it("sends the body of a temporary clipboard article", () => {
    const payload = buildCurrentArticlePayload(
      state({ isTemporary: true, article: article({ feedId: "clipboard", content: "<p>Clip</p>" }) }),
    );
    expect(payload).toMatchObject({ kind: "temporary", bodyHtml: "<p>Clip</p>" });
  });

  it("marks saved snapshots with their saved id", () => {
    const payload = buildCurrentArticlePayload(
      state({ isSavedSnapshot: true, article: article({ savedArticleId: "saved-9" }) }),
    );
    expect(payload).toMatchObject({ kind: "saved", hash: "hash-1", savedId: "saved-9" });
  });

  it("returns nothing when the view is hidden or empty", () => {
    expect(buildCurrentArticlePayload(state({ visible: false }))).toBeNull();
    expect(buildCurrentArticlePayload(state({ article: null }))).toBeNull();
  });

  it("keys change with the article, reader mode and title", () => {
    const basic = buildCurrentArticlePayload(state());
    const sameAgain = buildCurrentArticlePayload(state({ article: article({ read: true }) }));
    const reader = buildCurrentArticlePayload(state({ readerHtml: "<p>R</p>" }));
    expect(currentArticlePayloadKey(basic)).toBe(currentArticlePayloadKey(sameAgain));
    expect(currentArticlePayloadKey(basic)).not.toBe(currentArticlePayloadKey(reader));
    expect(currentArticlePayloadKey(null)).toBe("none");
    const clipA = buildCurrentArticlePayload(state({ isTemporary: true, article: article({ feedId: "clipboard", title: "A", content: "<p>12</p>" }) }));
    const clipB = buildCurrentArticlePayload(state({ isTemporary: true, article: article({ feedId: "clipboard", title: "B", content: "<p>34</p>" }) }));
    expect(currentArticlePayloadKey(clipA)).not.toBe(currentArticlePayloadKey(clipB));
  });
});

describe("createCurrentArticlePublisher", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const client = () => ({
    setCurrentArticle: vi.fn().mockResolvedValue(undefined),
    clearCurrentArticle: vi.fn().mockResolvedValue(undefined),
  });

  it("sends nothing while sharing is off and re-sends when it turns on", () => {
    const native = client();
    const publisher = createCurrentArticlePublisher(native, 10);
    publisher.publish(state());
    vi.advanceTimersByTime(50);
    expect(native.setCurrentArticle).not.toHaveBeenCalled();

    publisher.setSharing(true);
    vi.advanceTimersByTime(10);
    expect(native.setCurrentArticle).toHaveBeenCalledTimes(1);

    // Off then on again (native cleared it): the same article is sent again.
    publisher.setSharing(false);
    publisher.setSharing(true);
    vi.advanceTimersByTime(10);
    expect(native.setCurrentArticle).toHaveBeenCalledTimes(2);
    expect(native.clearCurrentArticle).not.toHaveBeenCalled();
  });

  it("debounces rapid article switches into one native call", () => {
    const native = client();
    const publisher = createCurrentArticlePublisher(native, 250);
    publisher.setSharing(true);
    publisher.publish(state({ article: article({ hash: "a" }) }));
    publisher.publish(state({ article: article({ hash: "b" }) }));
    publisher.publish(state({ article: article({ hash: "c" }) }));
    expect(native.setCurrentArticle).not.toHaveBeenCalled();
    vi.advanceTimersByTime(250);
    expect(native.setCurrentArticle).toHaveBeenCalledTimes(1);
    expect(native.setCurrentArticle).toHaveBeenCalledWith(expect.objectContaining({ hash: "c" }));
  });

  it("skips duplicate pushes and clears when the view closes", () => {
    const native = client();
    const publisher = createCurrentArticlePublisher(native, 10);
    publisher.setSharing(true);
    publisher.publish(state());
    vi.advanceTimersByTime(10);
    publisher.publish(state({ article: article({ read: true }) }));
    vi.advanceTimersByTime(10);
    expect(native.setCurrentArticle).toHaveBeenCalledTimes(1);

    publisher.publish(state({ visible: false }));
    vi.advanceTimersByTime(10);
    expect(native.clearCurrentArticle).toHaveBeenCalledTimes(1);
  });

  it("clears immediately on dispose and ignores later publishes", () => {
    const native = client();
    const publisher = createCurrentArticlePublisher(native, 10);
    publisher.setSharing(true);
    publisher.publish(state());
    vi.advanceTimersByTime(10);
    publisher.dispose();
    expect(native.clearCurrentArticle).toHaveBeenCalledTimes(1);
    publisher.publish(state({ article: article({ hash: "later" }) }));
    vi.advanceTimersByTime(10);
    expect(native.setCurrentArticle).toHaveBeenCalledTimes(1);
  });
});
