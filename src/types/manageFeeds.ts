import type { SmartViewId } from '@/constants';

/** Row the Manage Feeds window reveals when a sidebar menu opens it. */
export type ManageFeedsTarget =
  | { kind: 'feed'; id: string }
  | { kind: 'station'; id: string }
  | { kind: 'smart-view'; id: SmartViewId };
