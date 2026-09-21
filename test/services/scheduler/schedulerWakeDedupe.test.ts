import { beforeEach, describe, expect, it } from "vitest";
import {
  resetWakeDedupeForTests,
  shouldAcceptWake,
  type SchedulerWakePayload,
} from "@/services/scheduler/schedulerWakeDedupe";

describe("schedulerWakeDedupe", () => {
  beforeEach(() => {
    resetWakeDedupeForTests();
  });

  const wake = (
    wakeId: number,
    driverGeneration = 1,
    kind = "tick",
  ): SchedulerWakePayload => ({
    wakeId,
    driverGeneration,
    kind,
  });

  it("accepts the first channel for a wake and drops the duplicate", () => {
    const payload = wake(42, 7);
    expect(shouldAcceptWake(payload, "event")).toBe(true);
    expect(shouldAcceptWake(payload, "eval")).toBe(false);
  });

  it("still accepts event-only wakes (no prior eval)", () => {
    expect(shouldAcceptWake(wake(1), "event")).toBe(true);
  });

  it("still accepts eval-only wakes (no prior event)", () => {
    expect(shouldAcceptWake(wake(2), "eval")).toBe(true);
  });

  it("treats missing wake identity as always-accept (legacy / tests)", () => {
    expect(shouldAcceptWake(undefined, "event")).toBe(true);
    expect(shouldAcceptWake(null, "eval")).toBe(true);
  });

  it("scopes keys by driverGeneration", () => {
    expect(shouldAcceptWake(wake(9, 1), "event")).toBe(true);
    expect(shouldAcceptWake(wake(9, 2), "eval")).toBe(true);
  });
});
