import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const robustnessCounters = vi.hoisted(() => vi.fn());
const info = vi.hoisted(() => vi.fn());

vi.mock('@/lib/tauriClient', () => ({
  tauriClient: { diagnostics: { robustnessCounters } },
}));

vi.mock('@/services/logger', () => ({
  logger: { info, warn: vi.fn(), debug: vi.fn(), error: vi.fn() },
}));

import {
  getRobustnessSnapshot,
  logRobustnessSummary,
  recordRobustnessDuration,
  recordRobustnessEvent,
  resetRobustnessMetricsForTests,
  startRobustnessSummary,
} from '@/services/diagnostics/robustnessMetrics';

const nativeCounters = {
  fetchCancelledNotRecorded: 0,
  chunkFeedsSkippedMissing: 0,
  backoffSaturated: 0,
  itemsWithoutIdentity: 0,
  bodyDecodedNonUtf8: 0,
  bodyDecodedLossy: 0,
  storeTransactionRollbacks: 0,
  savedImportSkippedExisting: 0,
};

describe('robustnessMetrics', () => {
  beforeEach(() => {
    resetRobustnessMetricsForTests();
    robustnessCounters.mockResolvedValue({ ...nativeCounters });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('counts events and tracks duration count, average and max', () => {
    recordRobustnessEvent('paintGate.fallbackStart');
    recordRobustnessEvent('paintGate.fallbackStart', 2);
    recordRobustnessEvent('frameYield.timeout', 0);
    recordRobustnessDuration('scheduler.stationPauseHeldMs', 100);
    recordRobustnessDuration('scheduler.stationPauseHeldMs', 300);
    recordRobustnessDuration('scheduler.stationPauseHeldMs', Number.NaN);

    expect(getRobustnessSnapshot()).toEqual({
      counters: { 'paintGate.fallbackStart': 3 },
      durations: { 'scheduler.stationPauseHeldMs': { count: 2, avgMs: 200, maxMs: 300 } },
    });
  });

  it('logs a summary only when renderer or native counters changed', async () => {
    await logRobustnessSummary();
    expect(info).toHaveBeenCalledTimes(1); // first native snapshot

    await logRobustnessSummary();
    expect(info).toHaveBeenCalledTimes(1);

    recordRobustnessEvent('scheduler.countSyncFailed');
    await logRobustnessSummary();
    expect(info).toHaveBeenCalledTimes(2);
    expect(info).toHaveBeenLastCalledWith('Robustness', 'Robustness counters', expect.objectContaining({
      event: 'robustness-counters',
      counters: { 'scheduler.countSyncFailed': 1 },
      native: nativeCounters,
    }));

    robustnessCounters.mockResolvedValue({ ...nativeCounters, chunkFeedsSkippedMissing: 1 });
    await logRobustnessSummary();
    expect(info).toHaveBeenCalledTimes(3);
  });

  it('still logs renderer counters when the native snapshot fails', async () => {
    robustnessCounters.mockRejectedValue(new Error('ipc closed'));
    recordRobustnessEvent('ui.keyboardHoldReset');
    await logRobustnessSummary();
    expect(info).toHaveBeenCalledWith('Robustness', 'Robustness counters', expect.objectContaining({
      native: null,
    }));
  });

  it('runs one interval and clears it on stop', async () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(window, 'setInterval');
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');
    const stop = startRobustnessSummary();
    expect(setIntervalSpy).toHaveBeenCalledTimes(1);
    recordRobustnessEvent('frameYield.timeout');
    await vi.advanceTimersByTimeAsync(10 * 60_000);
    expect(info).toHaveBeenCalled();
    stop();
    expect(clearIntervalSpy).toHaveBeenCalledTimes(1);
  });
});
