import { tauriClient } from "@/lib/tauriClient";
import type { CurrentArticlePayload } from "@/lib/tauriClient/assistant";
import type { Article } from "@/types/article";

/**
 * Tells the native side which article this window shows, so assistants can
 * read "the article I'm reading". Native keeps it in memory only. Nothing is
 * sent while sharing is off (no article bodies over IPC for users who never
 * enabled assistants); turning sharing on re-sends what the window shows.
 */

/** Same cap as the native side; larger bodies are cut there anyway. */
const MAX_BODY_CHARS = 2 * 1024 * 1024;
const PUBLISH_DEBOUNCE_MS = 250;

export interface CurrentArticleViewState {
  article: Article | null;
  /** Main window: the article overlay is open. Standalone windows: always. */
  visible: boolean;
  isTemporary: boolean;
  isSavedSnapshot: boolean;
  /** Reader-mode HTML when reader mode is showing, otherwise null. */
  readerHtml: string | null;
}

export function buildCurrentArticlePayload(state: CurrentArticleViewState): CurrentArticlePayload | null {
  const { article } = state;
  if (!state.visible || !article) return null;

  const base = {
    title: article.title || undefined,
    link: article.link || undefined,
    feedTitle: article.feedTitle || undefined,
    author: article.author || undefined,
    publishedDate: article.publishedDate || undefined,
  };
  const capped = (html: string | null | undefined) => (html ? html.slice(0, MAX_BODY_CHARS) : undefined);

  if (state.isTemporary || article.feedId === "clipboard") {
    const bodyHtml = capped(state.readerHtml || article.content);
    if (!bodyHtml) return null;
    return { kind: "temporary", ...base, bodyHtml, readerMode: !!state.readerHtml };
  }

  if (state.isSavedSnapshot || article.feedId === "saved") {
    return {
      kind: "saved",
      hash: article.hash,
      savedId: article.savedArticleId || undefined,
      ...base,
    };
  }

  return {
    kind: "feed",
    hash: article.hash,
    ...base,
    bodyHtml: capped(state.readerHtml),
    readerMode: !!state.readerHtml,
  };
}

/** Identity of what the agent would see; equal keys skip a native call. */
export function currentArticlePayloadKey(payload: CurrentArticlePayload | null): string {
  if (!payload) return "none";
  return [
    payload.kind,
    payload.hash ?? "",
    payload.savedId ?? "",
    payload.readerMode ? "reader" : "basic",
    payload.bodyHtml?.length ?? 0,
    payload.title ?? "",
    payload.link ?? "",
  ].join("|");
}

export interface CurrentArticlePublisher {
  publish(state: CurrentArticleViewState): void;
  /** Native says whether assistants may see the current article. */
  setSharing(enabled: boolean): void;
  /** Clears immediately (window closing / view unmounting). */
  dispose(): void;
}

export function createCurrentArticlePublisher(
  client: Pick<typeof tauriClient.assistant, "setCurrentArticle" | "clearCurrentArticle"> = tauriClient.assistant,
  debounceMs = PUBLISH_DEBOUNCE_MS,
): CurrentArticlePublisher {
  let lastKey = "none";
  let latest: CurrentArticleViewState | null = null;
  let sharing = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  const send = (payload: CurrentArticlePayload | null) => {
    const key = currentArticlePayloadKey(payload);
    if (key === lastKey) return;
    lastKey = key;
    const request = payload ? client.setCurrentArticle(payload) : client.clearCurrentArticle();
    // Best effort: assistants simply see no current article if this fails.
    void request.catch(() => {
      lastKey = "unknown";
    });
  };

  const cancelTimer = () => {
    if (timer) clearTimeout(timer);
    timer = null;
  };

  const schedule = () => {
    if (disposed || !sharing) return;
    cancelTimer();
    timer = setTimeout(() => {
      timer = null;
      if (sharing && latest) send(buildCurrentArticlePayload(latest));
    }, debounceMs);
  };

  return {
    publish(state) {
      if (disposed) return;
      latest = state;
      schedule();
    },
    setSharing(enabled) {
      if (disposed || enabled === sharing) return;
      sharing = enabled;
      if (enabled) {
        // Native dropped everything while sharing was off: send again.
        lastKey = "unknown";
        schedule();
      } else {
        cancelTimer();
        lastKey = "none";
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      cancelTimer();
      if (sharing) send(null);
    },
  };
}
