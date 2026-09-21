export type SchedulerWakePayload = {
  wakeId: number;
  driverGeneration: number;
  kind: string;
};

export type SchedulerWakeChannel = "event" | "eval";

const WAKE_DEDUPE_SOFT_CAP = 64;
const WAKE_DEDUPE_TTL_MS = 10_000;

interface WakeDedupeEntry {
  channel: SchedulerWakeChannel;
  acceptedAt: number;
}

const recentWakes = new Map<string, WakeDedupeEntry>();

function wakeKey(payload: SchedulerWakePayload): string {
  return `${payload.driverGeneration}:${payload.wakeId}`;
}

function pruneExpired(now: number): void {
  for (const [key, entry] of recentWakes) {
    if (now - entry.acceptedAt > WAKE_DEDUPE_TTL_MS) {
      recentWakes.delete(key);
    }
  }
}

function trimToSoftCap(): void {
  while (recentWakes.size > WAKE_DEDUPE_SOFT_CAP) {
    const oldestKey = recentWakes.keys().next().value;
    if (oldestKey === undefined) {
      return;
    }
    recentWakes.delete(oldestKey);
  }
}

/**
 * Dual-channel wake delivery (Tauri event + webview eval) shares one wakeId.
 * First channel to arrive wins; the duplicate is dropped.
 */
export function shouldAcceptWake(
  payload: SchedulerWakePayload | null | undefined,
  channel: SchedulerWakeChannel,
): boolean {
  if (
    !payload
    || typeof payload.wakeId !== "number"
    || typeof payload.driverGeneration !== "number"
  ) {
    // Legacy / test wakes without identity still run (single-channel path).
    return true;
  }

  const now = Date.now();
  pruneExpired(now);

  const key = wakeKey(payload);
  const existing = recentWakes.get(key);
  if (existing) {
    return false;
  }

  recentWakes.set(key, { channel, acceptedAt: now });
  trimToSoftCap();
  return true;
}

/** Test-only: clear accepted wake keys between cases. */
export function resetWakeDedupeForTests(): void {
  recentWakes.clear();
}
