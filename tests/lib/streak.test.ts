// Section 11.7: active days, streaks and the weekly freeze.
import { describe, expect, it } from "vitest";
import { computeStreak, dayLookup, isActiveDay } from "@/lib/activity/streak";
import type { ActivityDay, ActivityMonth } from "@/lib/types";

const day = (minutes: number, extra: Partial<ActivityDay> = {}): ActivityDay => ({
  minutes,
  problemsSolved: 0,
  reviews: 0,
  conceptsTouched: 0,
  ...extra,
});

function months(days: Record<string, ActivityDay>): ActivityMonth[] {
  const byMonth = new Map<string, ActivityMonth>();
  for (const [date, d] of Object.entries(days)) {
    const key = date.slice(0, 7);
    const m = byMonth.get(key) ?? { month: key, days: {}, updatedAt: "2026-09-01T00:00:00.000Z" };
    m.days[date] = d;
    byMonth.set(key, m);
  }
  return [...byMonth.values()];
}

const lookup = (days: Record<string, ActivityDay>) => dayLookup(months(days));

describe("active days", () => {
  it("needs 10 minutes, or any attempt, check, review or finished plan item", () => {
    expect(isActiveDay(undefined)).toBe(false);
    expect(isActiveDay(day(9))).toBe(false);
    expect(isActiveDay(day(10))).toBe(true);
    expect(isActiveDay(day(0, { attempts: 1 }))).toBe(true);
    expect(isActiveDay(day(0, { checks: 1 }))).toBe(true);
    expect(isActiveDay(day(0, { reviews: 1 }))).toBe(true);
    expect(isActiveDay(day(0, { planItemsDone: 1 }))).toBe(true);
    expect(isActiveDay(day(0, { problemsSolved: 1 }))).toBe(true);
  });
});

describe("streaks", () => {
  // 2026-09-24 is a Thursday (ISO week 39).
  const today = "2026-09-24";

  it("counts consecutive active days ending today", () => {
    const l = lookup({ "2026-09-22": day(30), "2026-09-23": day(15), "2026-09-24": day(12) });
    expect(computeStreak(l, today, true)).toEqual({
      current: 3,
      activeToday: true,
      frozenDays: [],
    });
  });

  it("ends yesterday while today isn't active yet", () => {
    const l = lookup({ "2026-09-22": day(30), "2026-09-23": day(15), "2026-09-24": day(3) });
    expect(computeStreak(l, today, true)).toEqual({
      current: 2,
      activeToday: false,
      frozenDays: [],
    });
  });

  it("is zero with no recent activity", () => {
    expect(computeStreak(lookup({ "2026-09-20": day(40) }), today, true).current).toBe(0);
  });

  it("uses one freeze a week for a single missed day between active days", () => {
    const l = lookup({ "2026-09-21": day(20), "2026-09-23": day(20), "2026-09-24": day(20) });
    expect(computeStreak(l, today, true)).toEqual({
      current: 3,
      activeToday: true,
      frozenDays: ["2026-09-22"],
    });
    // Without the freeze the streak stops at the gap.
    expect(computeStreak(l, today, false).current).toBe(2);
  });

  it("never covers two missed days in a row", () => {
    const l = lookup({ "2026-09-20": day(20), "2026-09-23": day(20), "2026-09-24": day(20) });
    expect(computeStreak(l, today, true).current).toBe(2);
  });

  it("allows only one freeze per ISO week", () => {
    // Week 39 is Mon 21 to Sun 27 September; two gaps in the same week.
    const l = lookup({
      "2026-09-21": day(20),
      "2026-09-23": day(20),
      "2026-09-25": day(20),
      "2026-09-26": day(20),
    });
    const s = computeStreak(l, "2026-09-26", true);
    expect(s.frozenDays).toEqual(["2026-09-24"]);
    expect(s.current).toBe(3); // 26, 25, (24 frozen), 23 — then 22 is missed and the week's freeze is used
  });

  it("can use a freeze in each of two different weeks", () => {
    const l = lookup({
      "2026-09-18": day(20), // Friday, week 38
      "2026-09-20": day(20), // Sunday, week 38 (19th missed)
      "2026-09-21": day(20), // Monday, week 39
      "2026-09-23": day(20), // (22nd missed)
      "2026-09-24": day(20),
    });
    const s = computeStreak(l, today, true);
    expect(s.frozenDays).toEqual(["2026-09-22", "2026-09-19"]);
    expect(s.current).toBe(5);
  });

  it("does not freeze yesterday before today is active", () => {
    const l = lookup({ "2026-09-22": day(20) });
    expect(computeStreak(l, today, true).current).toBe(0);
  });

  it("works across month boundaries", () => {
    const l = lookup({ "2026-08-31": day(20), "2026-09-01": day(20) });
    expect(computeStreak(l, "2026-09-01", true).current).toBe(2);
  });
});
