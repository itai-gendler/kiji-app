import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { TaskExecutionBackend } from '@/services/tasks/backends/taskExecutionBackend';
import {
  HELPER_TASK_KIND,
  type HelperTaskAnyResult,
  type HelperTaskResultEvent,
} from '@/services/tasks/helperTaskContracts';
import { HelperTaskServer } from '@/services/tasks/helperTaskServer';

const OWNER_ID = 1;

const harness = vi.hoisted(() => ({
  server: null as HelperTaskServer | null,
  listeners: new Set<(event: HelperTaskResultEvent) => void>(),
}));

// Route the real helperTaskClient through a test-owned server (maxConcurrent 1,
// blocking backend) instead of the app singleton.
vi.mock('@/services/tasks/helperTaskService', () => ({
  helperTaskAdd: async (request: Parameters<HelperTaskServer['addTask']>[1]) => (
    harness.server!.addTask(1, request)
  ),
  helperTaskRemove: async (request: { taskId: string }) => harness.server!.removeTask(1, request.taskId),
  helperTaskClear: async (request?: Parameters<HelperTaskServer['clearTasks']>[1]) => (
    harness.server!.clearTasks(1, request)
  ),
  helperTaskGetQueueSnapshot: async () => harness.server!.getQueueSnapshot(),
  onHelperTaskResult: (callback: (event: HelperTaskResultEvent) => void) => {
    harness.listeners.add(callback);
    return () => harness.listeners.delete(callback);
  },
}));

import { helperTaskClient } from '@/services/tasks/helperTaskClient';

/** Every task blocks until released or aborted. */
const createBlockingBackend = () => {
  const releases = new Map<string, (result: HelperTaskAnyResult) => void>();
  const backend: TaskExecutionBackend = {
    execute: (input, signal) => new Promise<HelperTaskAnyResult>((resolve, reject) => {
      releases.set(input.taskId, resolve);
      signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true });
    }),
    cancel: vi.fn(async () => undefined),
    dispose: vi.fn(async () => undefined),
  };
  return { backend, releases };
};

const flush = async () => {
  for (let index = 0; index < 5; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
};

describe('HelperTaskServer.clearTasks', () => {
  let events: HelperTaskResultEvent[];
  let releases: Map<string, (result: HelperTaskAnyResult) => void>;

  beforeEach(() => {
    events = [];
    const blocking = createBlockingBackend();
    releases = blocking.releases;
    harness.server = new HelperTaskServer({
      backend: blocking.backend,
      maxConcurrent: 1,
      onTaskSettled: (_ownerId, event) => {
        events.push(event);
        for (const listener of harness.listeners) listener(event);
      },
    });
  });

  it('settles removed pending tasks as cancelled so runTask rejects', async () => {
    const running = helperTaskClient.runTask({
      id: 'running',
      kind: HELPER_TASK_KIND.SAVED_ARTICLES_IMPORT,
      payload: { zipArrayBuffer: new Uint8Array() },
    });
    const pending = helperTaskClient.runTask({
      id: 'pending',
      kind: HELPER_TASK_KIND.SAVED_ARTICLES_IMPORT,
      payload: { zipArrayBuffer: new Uint8Array() },
    });
    running.catch(() => undefined);
    await flush();
    expect(harness.server!.getQueueSnapshot()).toMatchObject({ running: 1, normal: 1 });

    const response = await helperTaskClient.clearTasks();

    expect(response.cleared).toBe(2);
    await expect(pending).rejects.toThrow('Task cancelled');
    await expect(running).rejects.toThrow('Task cancelled');
    expect(events.find((event) => event.taskId === 'pending')).toMatchObject({
      status: 'cancelled',
      kind: HELPER_TASK_KIND.SAVED_ARTICLES_IMPORT,
      priority: 'normal',
      durationMs: 0,
    });
  });

  it('only clears the requested kinds and keeps other workflows queued', async () => {
    harness.server!.addTask(OWNER_ID, {
      id: 'blocker',
      kind: HELPER_TASK_KIND.ARTICLE_VIEW_PREPROCESS,
      payload: {} as never,
    });
    harness.server!.addTask(OWNER_ID, {
      id: 'favicon',
      kind: HELPER_TASK_KIND.FAVICON_FETCH,
      priority: 'low',
      payload: { feedId: 'feed-1', feedUrl: 'https://example.com/rss' },
    });
    const savedImport = helperTaskClient.runTask({
      id: 'saved-import',
      kind: HELPER_TASK_KIND.SAVED_ARTICLES_IMPORT,
      payload: { zipArrayBuffer: new Uint8Array() },
    });
    await flush();

    const response = await helperTaskClient.clearTasks({ kinds: [HELPER_TASK_KIND.FAVICON_FETCH] });

    expect(response.cleared).toBe(1);
    expect(events.map((event) => [event.taskId, event.status])).toEqual([['favicon', 'cancelled']]);
    expect(harness.server!.getQueueSnapshot()).toMatchObject({ running: 1, normal: 1, low: 0 });

    // The unrelated runTask still completes once the blocker finishes.
    releases.get('blocker')?.({} as HelperTaskAnyResult);
    await flush();
    releases.get('saved-import')?.({ articles: [] });
    await expect(savedImport).resolves.toEqual({ articles: [] });
  });
});
