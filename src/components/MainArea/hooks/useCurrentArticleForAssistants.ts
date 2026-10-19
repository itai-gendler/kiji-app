import { useRef } from 'react';
import { listen } from '@tauri-apps/api/event';
import { tauriClient } from '@/lib/tauriClient';
import { CURRENT_ARTICLE_SHARING_EVENT } from '@/lib/tauriClient/assistant';
import { useDependencyEffect, useMountEffect } from '@/hooks/useLifecycleEffects';
import {
  createCurrentArticlePublisher,
  type CurrentArticlePublisher,
  type CurrentArticleViewState,
} from '@/services/assistant/currentArticleBridge';

const isTauriRuntime = (): boolean => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;

/**
 * Publishes the article this view shows as the "current article" for
 * assistants (Settings → Assistant), only while native says sharing is on.
 */
export function useCurrentArticleForAssistants(state: CurrentArticleViewState): void {
  const publisherRef = useRef<CurrentArticlePublisher | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Created and disposed in one effect so React StrictMode's simulated
  // unmount/remount leaves a working publisher.
  useMountEffect(() => {
    if (!isTauriRuntime()) return undefined;
    const publisher = createCurrentArticlePublisher();
    publisherRef.current = publisher;
    publisher.publish(stateRef.current);

    let disposed = false;
    let unlisten: (() => void) | null = null;
    void tauriClient.assistant
      .getCurrentArticleSharing()
      .then((sharing) => {
        if (!disposed) publisher.setSharing(sharing);
      })
      .catch(() => undefined);
    void listen<boolean>(CURRENT_ARTICLE_SHARING_EVENT, (event) => {
      publisher.setSharing(event.payload === true);
    })
      .then((dispose) => {
        if (disposed) dispose();
        else unlisten = dispose;
      })
      .catch(() => undefined);

    return () => {
      disposed = true;
      unlisten?.();
      publisher.dispose();
      publisherRef.current = null;
    };
  });

  useDependencyEffect(() => {
    publisherRef.current?.publish(state);
  }, [state.article, state.visible, state.isTemporary, state.isSavedSnapshot, state.readerHtml]);
}
