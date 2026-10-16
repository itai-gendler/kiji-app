const noop = (): void => {};

export const isInteractionPerformanceEnabled = false;

export const INTERACTION_PERFORMANCE_BUDGETS = {
  articleListScroll: {
    minimumFrameCount: 4,
    slowFrameMs: 24,
    severeFrameMs: 48,
    idleWindowMs: 120,
  },
  sidebarSwitch: {
    firstCommitLagMs: 250,
    renderCommitLagMs: 50,
  },
  articleViewOpen: {
    totalLagMs: 250,
    renderCommitLagMs: 50,
  },
  articleViewClose: {
    totalLagMs: 250,
    renderCommitLagMs: 50,
  },
};

export function roundPerformanceValue(value: number): number {
  return Number(value.toFixed(1));
}

export const interactionPerformance = {
  reportScrollSession: noop,
  recordTimedInteractionCommit: noop,
  completeTimedInteraction: noop,
  beginTimedInteraction: noop,
  cancelTimedInteraction: noop,
};

export const sidebarSwitchTrace = {
  completeInteractive: noop,
};

