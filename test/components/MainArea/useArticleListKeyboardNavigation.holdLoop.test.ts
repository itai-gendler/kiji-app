import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import type { RefObject } from 'react';
import type { Article } from '@/types/article';
import type { ArticleViewOverlayPhase } from '@/contexts/FeedContext';
import { useArticleListKeyboardNavigation } from '@/components/MainArea/hooks/useArticleListKeyboardNavigation';
import {
  getRobustnessSnapshot,
  resetRobustnessMetricsForTests,
} from '@/services/diagnostics/robustnessMetrics';

const holdResets = () => getRobustnessSnapshot().counters['ui.keyboardHoldReset'];

const makeArticles = (count: number): Article[] =>
  Array.from({ length: count }, (_, index) => ({ hash: `a${index}` }) as unknown as Article);

describe('useArticleListKeyboardNavigation held j/k loop', () => {
  let now = 0;
  let rafQueue = new Map<number, FrameRequestCallback>();
  let nextRafId = 1;

  const advanceFrames = (frames: number, msPerFrame = 16) => {
    for (let i = 0; i < frames; i += 1) {
      now += msPerFrame;
      const callbacks = Array.from(rafQueue.values());
      rafQueue = new Map();
      act(() => {
        callbacks.forEach((callback) => callback(now));
      });
    }
  };

  const keyEvent = (type: 'keydown' | 'keyup', key: string, init: KeyboardEventInit = {}) => {
    act(() => {
      window.dispatchEvent(new KeyboardEvent(type, { key, bubbles: true, cancelable: true, ...init }));
    });
  };

  const setup = (overlayPhase: { current: ArticleViewOverlayPhase }) => {
    const articleListRef = { current: document.createElement('div') } as RefObject<HTMLDivElement>;
    const articles = makeArticles(200);
    const setKeyboardFocusHash = vi.fn();
    const scrollKeyboardFocusIntoView = vi.fn();
    const hook = renderHook(
      ({ phase }: { phase: ArticleViewOverlayPhase }) => useArticleListKeyboardNavigation({
        articleListRef,
        filteredArticles: articles,
        keyboardFocusHash: null,
        activeArticleHash: null,
        articleViewOverlayPhase: phase,
        selectArticle: vi.fn(),
        setKeyboardFocusHash,
        scrollKeyboardFocusIntoView,
      }),
      { initialProps: { phase: overlayPhase.current } },
    );
    return { hook, setKeyboardFocusHash };
  };

  const startHold = () => {
    keyEvent('keydown', 'j');
    keyEvent('keydown', 'j', { repeat: true });
    advanceFrames(20);
  };

  beforeEach(() => {
    resetRobustnessMetricsForTests();
    now = 0;
    rafQueue = new Map();
    nextRafId = 1;
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    vi.spyOn(performance, 'now').mockImplementation(() => now);
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      const id = nextRafId++;
      rafQueue.set(id, callback);
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      rafQueue.delete(id);
    });
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('keeps stepping while held (sanity)', () => {
    const { setKeyboardFocusHash } = setup({ current: 'closed' });
    startHold();
    expect(setKeyboardFocusHash.mock.calls.length).toBeGreaterThan(2);
  });

  it('does not count a tap or a plain keyup release of a held key', () => {
    setup({ current: 'closed' });
    keyEvent('keydown', 'j');
    keyEvent('keyup', 'j');
    advanceFrames(5);
    startHold();
    keyEvent('keyup', 'j');
    advanceFrames(5);

    expect(holdResets()).toBeUndefined();
  });

  it('stops stepping once the article overlay covers the list and keyup arrives under it', () => {
    const { hook, setKeyboardFocusHash } = setup({ current: 'closed' });
    startHold();

    hook.rerender({ phase: 'open' as ArticleViewOverlayPhase });
    keyEvent('keyup', 'j');
    const callsAfterRelease = setKeyboardFocusHash.mock.calls.length;
    advanceFrames(60);
    vi.advanceTimersByTime(1000);
    advanceFrames(60);

    expect(setKeyboardFocusHash.mock.calls.length).toBe(callsAfterRelease);
    expect(rafQueue.size).toBe(0);
    expect(holdResets()).toBe(1);
  });

  it('stops when j is released with a modifier held over a modal (Cmd+N)', () => {
    const { setKeyboardFocusHash } = setup({ current: 'closed' });
    startHold();

    const backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    document.body.appendChild(backdrop);
    keyEvent('keyup', 'j', { metaKey: true });
    const callsAfterRelease = setKeyboardFocusHash.mock.calls.length;
    advanceFrames(60);

    expect(setKeyboardFocusHash.mock.calls.length).toBe(callsAfterRelease);
    expect(holdResets()).toBe(1);
  });

  it('stops when the window blurs mid-hold (no keyup ever arrives)', () => {
    const { setKeyboardFocusHash } = setup({ current: 'closed' });
    startHold();

    act(() => {
      window.dispatchEvent(new Event('blur'));
    });
    const callsAfterBlur = setKeyboardFocusHash.mock.calls.length;
    advanceFrames(60);

    expect(setKeyboardFocusHash.mock.calls.length).toBe(callsAfterBlur);
    expect(rafQueue.size).toBe(0);
    expect(holdResets()).toBe(1);
  });

  it('stops when the document becomes hidden mid-hold', () => {
    const { setKeyboardFocusHash } = setup({ current: 'closed' });
    startHold();

    const visibility = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
    });
    visibility.mockRestore();
    const callsAfterHide = setKeyboardFocusHash.mock.calls.length;
    advanceFrames(60);

    expect(setKeyboardFocusHash.mock.calls.length).toBe(callsAfterHide);
  });

  it('stops stepping while covered even before keyup', () => {
    const { hook, setKeyboardFocusHash } = setup({ current: 'closed' });
    startHold();

    hook.rerender({ phase: 'open' as ArticleViewOverlayPhase });
    advanceFrames(1);
    const callsAfterCover = setKeyboardFocusHash.mock.calls.length;
    advanceFrames(60);

    expect(setKeyboardFocusHash.mock.calls.length).toBe(callsAfterCover);
    expect(holdResets()).toBe(1);
  });

  it('removes blur/visibility listeners on unmount', () => {
    const addWindow = vi.spyOn(window, 'addEventListener');
    const removeWindow = vi.spyOn(window, 'removeEventListener');
    const addDocument = vi.spyOn(document, 'addEventListener');
    const removeDocument = vi.spyOn(document, 'removeEventListener');
    const { hook } = setup({ current: 'closed' });
    hook.unmount();

    const added = (spy: typeof addWindow, type: string) => spy.mock.calls.filter(([t]) => t === type).length;
    expect(added(addWindow, 'blur')).toBe(added(removeWindow, 'blur'));
    expect(added(addDocument, 'visibilitychange')).toBe(added(removeDocument, 'visibilitychange'));
    expect(added(addWindow, 'blur')).toBeGreaterThan(0);
  });
});
