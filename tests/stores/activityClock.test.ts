// F29: focus and attempt timers add minutes to today's activity, without double counting.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  detachActivity,
  recordActivity,
  startActivitySource,
  stopActivitySource,
  useActivityStore,
} from "@/stores/activityStore";

const minutesOn = (date: string) =>
  useActivityStore.getState().months[date.slice(0, 7)]?.days[date]?.minutes ?? 0;

describe("activity clock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-24T10:00:00"));
    detachActivity(); // also clears the part-minute carried between sessions
    useActivityStore.setState({ months: {}, loaded: true });
  });
  afterEach(() => {
    stopActivitySource("a");
    stopActivitySource("b");
    vi.useRealTimers();
  });

  it("counts whole minutes while a source runs", () => {
    startActivitySource("a");
    vi.advanceTimersByTime(5 * 60_000 + 30_000);
    stopActivitySource("a");
    expect(minutesOn("2026-09-24")).toBe(5);
  });

  it("counts overlapping sources once", () => {
    startActivitySource("a");
    vi.advanceTimersByTime(2 * 60_000);
    startActivitySource("b");
    vi.advanceTimersByTime(3 * 60_000);
    stopActivitySource("a");
    vi.advanceTimersByTime(60_000);
    stopActivitySource("b");
    expect(minutesOn("2026-09-24")).toBe(6);
  });

  it("does not count a long gap (the device slept)", () => {
    startActivitySource("a");
    vi.advanceTimersByTime(60_000);
    // Jump the clock forward without ticks, as when a laptop sleeps.
    vi.setSystemTime(new Date("2026-09-24T12:00:00"));
    vi.advanceTimersByTime(1000);
    stopActivitySource("a");
    expect(minutesOn("2026-09-24")).toBe(1);
  });

  it("puts minutes on the local day they complete, losing none at midnight", () => {
    vi.setSystemTime(new Date("2026-09-24T23:58:30"));
    startActivitySource("a");
    vi.advanceTimersByTime(3 * 60_000);
    stopActivitySource("a");
    // Minutes complete at 23:59:30, 00:00:30 and 00:01:30.
    expect(minutesOn("2026-09-24")).toBe(1);
    expect(minutesOn("2026-09-25")).toBe(2);
  });

  it("carries part of a minute over to the next session", () => {
    startActivitySource("a");
    vi.advanceTimersByTime(90_000);
    stopActivitySource("a");
    expect(minutesOn("2026-09-24")).toBe(1);
    startActivitySource("a");
    vi.advanceTimersByTime(30_000);
    stopActivitySource("a");
    expect(minutesOn("2026-09-24")).toBe(2);
  });

  it("adds counters to a day", () => {
    recordActivity("2026-09-24", { attempts: 1, problemsSolved: 1 });
    recordActivity("2026-09-24", { attempts: 1 });
    const day = useActivityStore.getState().months["2026-09"]?.days["2026-09-24"];
    expect(day).toMatchObject({ attempts: 2, problemsSolved: 1, minutes: 0 });
  });
});
