// F29 "done when": activity totals are correct across midnight and time zones, and the heatmap and
// the streak agree with the data. The same checks run in several time zones, including ones with
// half-hour and 45-minute offsets and days that daylight saving time makes 23 or 25 hours long.
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { heatLevel, heatmapWeeks, summarize, weekStart } from "@/lib/activity/heatmap";
import { computeStreak, dayLookup, isActiveDay } from "@/lib/activity/streak";
import { attemptDate } from "@/lib/problems/progress";
import { mulberry32 } from "@/lib/random";
import { addDaysToDate, daysBetween, localDate } from "@/lib/time";
import type { ActivityDay, ActivityMonth, Attempt } from "@/lib/types";
import {
  detachActivity,
  startActivitySource,
  stopActivitySource,
  useActivityStore,
} from "@/stores/activityStore";

const minutesOn = (date: string) =>
  useActivityStore.getState().months[date.slice(0, 7)]?.days[date]?.minutes ?? 0;
const totalMinutes = () =>
  Object.values(useActivityStore.getState().months).reduce(
    (n, m) => n + Object.values(m.days).reduce((k, d) => k + d.minutes, 0),
    0,
  );

const ZONES = [
  "UTC",
  "Asia/Kolkata", // +05:30
  "America/St_Johns", // -02:30 / -03:30, with DST
  "Pacific/Chatham", // +12:45 / +13:45, with DST
  "America/Los_Angeles", // DST: 8 March and 1 November 2026
  "Europe/London", // DST: 29 March and 25 October 2026
];

const original = process.env.TZ;

describe.each(ZONES)("activity in %s", (zone) => {
  beforeAll(() => {
    process.env.TZ = zone;
  });
  afterAll(() => {
    process.env.TZ = original;
  });
  beforeEach(() => {
    vi.useFakeTimers();
    detachActivity();
    useActivityStore.setState({ months: {}, loaded: true });
  });
  afterEach(() => {
    stopActivitySource("focus");
    stopActivitySource("attempt");
    vi.useRealTimers();
  });

  it("really runs in this zone", () => {
    const aliases: Record<string, string[]> = { "Asia/Kolkata": ["Asia/Kolkata", "Asia/Calcutta"] };
    expect(aliases[zone] ?? [zone]).toContain(Intl.DateTimeFormat().resolvedOptions().timeZone);
    const offsets: Record<string, number> = {
      UTC: 0,
      "Asia/Kolkata": -330,
      "America/St_Johns": 150, // daylight time in September
      "Pacific/Chatham": -765, // standard time until the last Sunday of September
      "America/Los_Angeles": 420,
      "Europe/London": -60,
    };
    expect(new Date("2026-09-24T12:00:00").getTimezoneOffset()).toBe(offsets[zone]);
  });

  it("reads local dates in this zone", () => {
    // 23:59 and 00:01 local, a minute either side of midnight.
    expect(localDate(new Date("2026-09-24T23:59:00"))).toBe("2026-09-24");
    expect(localDate(new Date("2026-09-25T00:01:00"))).toBe("2026-09-25");
  });

  it("splits a session across local midnight and keeps the total", () => {
    vi.setSystemTime(new Date("2026-09-24T23:45:00"));
    startActivitySource("focus");
    vi.advanceTimersByTime(40 * 60_000); // until 00:25
    stopActivitySource("focus");
    expect(minutesOn("2026-09-24")).toBe(15);
    expect(minutesOn("2026-09-25")).toBe(25);
    expect(totalMinutes()).toBe(40);
  });

  it("splits a session across the end of a month", () => {
    vi.setSystemTime(new Date("2026-09-30T23:50:00"));
    startActivitySource("focus");
    vi.advanceTimersByTime(20 * 60_000);
    stopActivitySource("focus");
    expect(minutesOn("2026-09-30")).toBe(10);
    expect(minutesOn("2026-10-01")).toBe(10);
    expect(Object.keys(useActivityStore.getState().months).sort()).toEqual(["2026-09", "2026-10"]);
  });

  it("counts overlapping timers once across midnight", () => {
    vi.setSystemTime(new Date("2026-09-24T23:50:00"));
    startActivitySource("focus");
    vi.advanceTimersByTime(5 * 60_000);
    startActivitySource("attempt");
    vi.advanceTimersByTime(10 * 60_000);
    stopActivitySource("focus");
    vi.advanceTimersByTime(5 * 60_000);
    stopActivitySource("attempt");
    expect(totalMinutes()).toBe(20);
    expect(minutesOn("2026-09-24")).toBe(10);
    expect(minutesOn("2026-09-25")).toBe(10);
  });

  it("counts real minutes on daylight saving days", () => {
    // Real elapsed time, whatever the wall clock does: 3 hours from 00:30 local.
    for (const day of ["2026-03-08", "2026-03-29", "2026-11-01", "2026-10-25", "2026-04-05"]) {
      detachActivity();
      useActivityStore.setState({ months: {}, loaded: true });
      vi.setSystemTime(new Date(`${day}T00:30:00`));
      startActivitySource("focus");
      vi.advanceTimersByTime(3 * 60 * 60_000);
      stopActivitySource("focus");
      expect(minutesOn(day)).toBe(180);
    }
  });

  it("dates attempts by the local day they were saved", () => {
    const at = (iso: string) =>
      ({ startedAt: iso, finishedAt: new Date(iso).toISOString() }) as Attempt;
    expect(attemptDate(at("2026-09-24T23:59:00"))).toBe("2026-09-24");
    expect(attemptDate(at("2026-09-25T00:00:30"))).toBe("2026-09-25");
  });

  it("does day arithmetic by calendar days, even across daylight saving changes", () => {
    expect(addDaysToDate("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDaysToDate("2026-03-08", 1)).toBe("2026-03-09");
    expect(addDaysToDate("2026-10-31", 2)).toBe("2026-11-02");
    expect(daysBetween("2026-03-01", "2026-04-01")).toBe(31);
    expect(daysBetween("2026-10-20", "2026-11-03")).toBe(14);
    expect(weekStart("2026-03-08")).toBe("2026-03-02");
    expect(weekStart("2026-11-01")).toBe("2026-10-26");
  });

  it("builds heatmap weeks of 7 calendar days, Monday first, across the changes", () => {
    const cols = heatmapWeeks(() => undefined, "2026-11-04", 40);
    for (const col of cols) {
      expect(col).toHaveLength(7);
      expect(weekStart(col[0]!.date)).toBe(col[0]!.date);
      for (let i = 1; i < 7; i++) expect(daysBetween(col[i - 1]!.date, col[i]!.date)).toBe(1);
    }
  });
});

describe("heatmap and streak agree with the data", () => {
  function randomMonths(seed: number, today: string, days: number): ActivityMonth[] {
    const rand = mulberry32(seed);
    const months = new Map<string, ActivityMonth>();
    for (let i = 0; i < days; i++) {
      const date = addDaysToDate(today, -i);
      const r = rand();
      if (r < 0.2) continue; // no record at all
      const day: ActivityDay = {
        minutes: r < 0.35 ? Math.floor(rand() * 9) : Math.floor(rand() * 180),
        problemsSolved: 0,
        reviews: 0,
        conceptsTouched: 0,
      };
      if (rand() < 0.1) day.attempts = 1;
      if (rand() < 0.05) day.planItemsDone = 1;
      const key = date.slice(0, 7);
      const m = months.get(key) ?? { month: key, days: {}, updatedAt: "" };
      m.days[date] = day;
      months.set(key, m);
    }
    return [...months.values()];
  }

  it("marks active days, levels and freezes exactly as the streak computes them", () => {
    for (let seed = 1; seed <= 60; seed++) {
      const today = addDaysToDate("2026-09-27", -(seed % 7));
      const lookup = dayLookup(randomMonths(seed, today, 200));
      for (const freeze of [true, false]) {
        const streak = computeStreak(lookup, today, freeze);
        const frozen = new Set(streak.frozenDays);
        const cols = heatmapWeeks(lookup, today, 30, frozen);
        const cells = cols.flat().filter((c) => !c.future);
        for (const c of cells) {
          const day = lookup(c.date);
          expect(c.active).toBe(isActiveDay(day));
          expect(c.level).toBe(heatLevel(day?.minutes ?? 0));
          expect(c.minutes).toBe(day?.minutes ?? 0);
          expect(c.frozen).toBe(frozen.has(c.date));
        }
        // Walking back over the heatmap gives the streak: active days count, frozen days are
        // skipped, anything else ends it.
        const byDate = new Map(cells.map((c) => [c.date, c]));
        let d = byDate.get(today)!.active ? today : addDaysToDate(today, -1);
        let count = 0;
        for (;;) {
          const c = byDate.get(d);
          if (!c) break;
          if (c.active) count++;
          else if (!c.frozen) break;
          d = addDaysToDate(d, -1);
        }
        if (count < 150) expect(count).toBe(streak.current);
        if (!freeze) expect(streak.frozenDays).toEqual([]);
        // At most one freeze per ISO week, each between two active days.
        const weeks = streak.frozenDays.map(weekStart);
        expect(new Set(weeks).size).toBe(weeks.length);
        for (const f of streak.frozenDays) {
          expect(isActiveDay(lookup(addDaysToDate(f, -1)))).toBe(true);
          expect(isActiveDay(lookup(addDaysToDate(f, 1)))).toBe(true);
        }
      }
    }
  });

  it("sums the minutes shown to the minutes recorded", () => {
    const today = "2026-09-27";
    const months = randomMonths(99, today, 400);
    const lookup = dayLookup(months);
    const cols = heatmapWeeks(lookup, today, 53);
    const first = cols[0]![0]!.date;
    let recorded = 0;
    for (const m of months)
      for (const [date, day] of Object.entries(m.days))
        if (date >= first && date <= today) recorded += day.minutes;
    expect(summarize(cols).minutes).toBe(recorded);
  });

  it("uses the heatmap levels 0, 1-29, 30-59, 60-119 and 120+", () => {
    expect([0, 1, 29, 30, 59, 60, 119, 120, 500].map(heatLevel)).toEqual([
      0, 1, 1, 2, 2, 3, 3, 4, 4,
    ]);
  });
});
