import {
  HELPER_TASK_PRIORITIES,
  type HelperTaskAddRequest,
  type HelperTaskAddResponse,
  type HelperTaskAnyResult,
  type HelperTaskCancelledEvent,
  type HelperTaskClearRequest,
  type HelperTaskClearResponse,
  type HelperTaskCompletedEvent,
  type HelperTaskFailedEvent,
  type HelperTaskPriority,
  type HelperTaskQueueSizeSnapshot,
  type HelperTaskRemoveResponse,
  type HelperTaskResultEvent,
} from '@/services/tasks/helperTaskContracts';
import type { TaskExecutionBackend } from '@/services/tasks/backends/taskExecutionBackend';
import { recordRobustnessEvent } from '@/services/diagnostics/robustnessMetrics';

interface HelperTaskServerOptions {
  backend: TaskExecutionBackend;
  maxConcurrent: number;
  onTaskSettled: (ownerId: number, event: HelperTaskResultEvent) => void;
  idFactory?: () => string;
}

interface PendingTask {
  taskId: string;
  ownerId: number;
  request: Required<Pick<HelperTaskAddRequest, 'kind' | 'payload' | 'priority'>>;
}

interface RunningTask extends PendingTask {
  startedAt: number;
  abortController: AbortController;
}

const DEFAULT_PRIORITY: HelperTaskPriority = 'normal';

const asErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const createTaskId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

export class HelperTaskServer {
  private readonly backend: TaskExecutionBackend;

  private readonly onTaskSettled: HelperTaskServerOptions['onTaskSettled'];

  private readonly maxConcurrent: number;

  private readonly idFactory: () => string;

  private readonly pendingByPriority: Record<HelperTaskPriority, PendingTask[]> = {
    high: [],
    normal: [],
    low: [],
  };

  private readonly runningByTaskId = new Map<string, RunningTask>();

  constructor(options: HelperTaskServerOptions) {
    this.backend = options.backend;
    this.maxConcurrent = Math.max(1, Math.floor(options.maxConcurrent));
    this.onTaskSettled = options.onTaskSettled;
    this.idFactory = options.idFactory || createTaskId;
  }

  addTask(ownerId: number, request: HelperTaskAddRequest): HelperTaskAddResponse {
    const priority = request.priority ?? DEFAULT_PRIORITY;
    const taskId = request.id || this.idFactory();

    const pendingTask: PendingTask = {
      taskId,
      ownerId,
      request: {
        kind: request.kind,
        payload: request.payload,
        priority,
      },
    };

    this.pendingByPriority[priority].push(pendingTask);
    this.schedule();

    return {
      accepted: true,
      taskId,
    };
  }

  async removeTask(ownerId: number, taskId: string): Promise<HelperTaskRemoveResponse> {
    const removedFromPending = this.removePendingTask(ownerId, taskId);
    if (removedFromPending) {
      return { removed: true };
    }

    const runningTask = this.runningByTaskId.get(taskId);
    if (!runningTask || runningTask.ownerId !== ownerId) {
      return { removed: false };
    }

    runningTask.abortController.abort();
    void this.backend.cancel(taskId);
    return { removed: true };
  }

  async clearTasks(
    ownerId: number,
    request: HelperTaskClearRequest = {},
  ): Promise<HelperTaskClearResponse> {
    const kindFilter = request.kinds ? new Set(request.kinds) : null;
    const matches = (task: PendingTask): boolean => (
      task.ownerId === ownerId
      && (kindFilter === null || kindFilter.has(task.request.kind))
    );
    const removedPending: PendingTask[] = [];

    for (const priority of HELPER_TASK_PRIORITIES) {
      const queue = this.pendingByPriority[priority];
      const retained: PendingTask[] = [];

      for (const pendingTask of queue) {
        if (matches(pendingTask)) {
          removedPending.push(pendingTask);
          continue;
        }

        retained.push(pendingTask);
      }

      this.pendingByPriority[priority] = retained;
    }

    let cleared = removedPending.length;
    for (const runningTask of this.runningByTaskId.values()) {
      if (!matches(runningTask)) continue;
      // Running tasks settle as `cancelled` from runTask once the backend unwinds.
      runningTask.abortController.abort();
      void this.backend.cancel(runningTask.taskId);
      cleared += 1;
    }

    // Removed pending tasks never reach runTask, so settle them here: callers
    // awaiting a result (helperTaskClient.runTask) would otherwise wait forever.
    // Queues are already updated, so listeners see a consistent snapshot.
    for (const pendingTask of removedPending) {
      this.emitCancelled(pendingTask);
    }
    recordRobustnessEvent('helperTasks.pendingCancelledOnClear', removedPending.length);

    return { cleared };
  }

  getQueueSnapshot(): HelperTaskQueueSizeSnapshot {
    return {
      high: this.pendingByPriority.high.length,
      normal: this.pendingByPriority.normal.length,
      low: this.pendingByPriority.low.length,
      running: this.runningByTaskId.size,
    };
  }

  async dispose(): Promise<void> {
    for (const runningTask of this.runningByTaskId.values()) {
      runningTask.abortController.abort();
    }
    this.runningByTaskId.clear();
    this.pendingByPriority.high = [];
    this.pendingByPriority.normal = [];
    this.pendingByPriority.low = [];
    await this.backend.dispose();
  }

  private removePendingTask(ownerId: number, taskId: string): boolean {
    for (const priority of HELPER_TASK_PRIORITIES) {
      const queue = this.pendingByPriority[priority];
      const index = queue.findIndex((task) => task.taskId === taskId && task.ownerId === ownerId);
      if (index < 0) continue;

      queue.splice(index, 1);
      return true;
    }

    return false;
  }

  private nextPendingTask(): PendingTask | undefined {
    for (const priority of HELPER_TASK_PRIORITIES) {
      const nextTask = this.pendingByPriority[priority].shift();
      if (nextTask) return nextTask;
    }

    return undefined;
  }

  private schedule(): void {
    while (this.runningByTaskId.size < this.maxConcurrent) {
      const nextTask = this.nextPendingTask();
      if (!nextTask) break;

      const runningTask: RunningTask = {
        ...nextTask,
        startedAt: Date.now(),
        abortController: new AbortController(),
      };

      this.runningByTaskId.set(runningTask.taskId, runningTask);
      void this.runTask(runningTask);
    }
  }

  private async runTask(task: RunningTask): Promise<void> {
    try {
      const result = await this.backend.execute(
        {
          taskId: task.taskId,
          kind: task.request.kind,
          payload: task.request.payload,
        },
        task.abortController.signal
      );

      if (task.abortController.signal.aborted) {
        this.emitCancelled(task);
      } else {
        this.emitCompleted(task, result);
      }
    } catch (error) {
      if (task.abortController.signal.aborted) {
        this.emitCancelled(task);
      } else {
        this.emitFailed(task, asErrorMessage(error));
      }
    } finally {
      this.runningByTaskId.delete(task.taskId);
      this.schedule();
    }
  }

  private emitCompleted(task: RunningTask, result: HelperTaskAnyResult): void {
    const event: HelperTaskCompletedEvent = {
      taskId: task.taskId,
      kind: task.request.kind,
      priority: task.request.priority,
      durationMs: Date.now() - task.startedAt,
      status: 'completed',
      result,
    };

    this.onTaskSettled(task.ownerId, event);
  }

  private emitFailed(task: RunningTask, errorMessage: string): void {
    const event: HelperTaskFailedEvent = {
      taskId: task.taskId,
      kind: task.request.kind,
      priority: task.request.priority,
      durationMs: Date.now() - task.startedAt,
      status: 'failed',
      error: errorMessage,
    };

    this.onTaskSettled(task.ownerId, event);
  }

  private emitCancelled(task: PendingTask | RunningTask): void {
    const event: HelperTaskCancelledEvent = {
      taskId: task.taskId,
      kind: task.request.kind,
      priority: task.request.priority,
      durationMs: 'startedAt' in task ? Date.now() - task.startedAt : 0,
      status: 'cancelled',
    };

    this.onTaskSettled(task.ownerId, event);
  }
}
