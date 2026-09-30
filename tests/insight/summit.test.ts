// The summit profile (12.10.7): a past week's readiness is the readiness model evaluated on the
// records as they were at that Sunday 23:59; today's point equals the live readiness. Also the
// projection trail, weekly stamps (5 or more active days), and the indexed linked problems.
import { describe, expect, it } from "vitest";
import { concepts } from "@/data/syllabus";
import {
  endOfDay,
  firstDataDay,
  readinessAsOf,
  recordsFingerprint,
  recordTimes,
  sourcesAsOf,
  STAMP_DAYS,
  SUMMIT_MAX_WEEKS,
  summitProjection,
  summitSundays,
  weekStamps,
} from "@/lib/insight/summit";
import {
  evaluateReadiness,
  linkedProblems,
  linkedProblemsIndex,
  type EvaluationSources,
} from "@/lib/readiness/evaluate";
import { addDaysToDate } from "@/lib/time";
import type { Check, ProblemState } from "@/lib/types";
import { DAY, records, scenario, yearOfData } from "../fixtures/scenarios";

function sources(name: "mid" | "week" | "year"): EvaluationSources {
  const r = records(name === "year" ? yearOfData() : scenario(name));
  return {
    ...r,
    customConcepts: [],
    today: DAY,
    now: endOfDay(DAY),
    intensity: r.profile.reviewIntensity,
  };
}

const check = (conceptId: string, createdAt: string, score = 1): Check => ({
  id: `c-${conceptId}-${createdAt}`,
  conceptId,
  kind: "quiz",
  score,
  createdAt,
  updatedAt: createdAt,
});

describe("readiness as of a past day", () => {
  it("equals the live readiness for today, concept by concept", () => {
    for (const name of ["mid", "year"] as const) {
      const src = sources(name);
      const live = evaluateReadiness(src);
      const past = readinessAsOf(src, DAY);
      expect(past.overall).toBeCloseTo(live.overall, 9);
      for (const [id, e] of live.byId) {
        expect(past.byId.get(id)?.status, id).toBe(e.status);
        expect(past.byId.get(id)?.score, id).toBeCloseTo(e.score, 9);
      }
    }
  });

  it("ignores checks and attempts recorded after the cutoff", () => {
    const src = sources("mid");
    const day = addDaysToDate(DAY, -14);
    const before = readinessAsOf(src, day);
    const later = `${addDaysToDate(day, 2)}T06:00:00.000Z`;
    const id = concepts[0]!.id;
    const withLater: EvaluationSources = {
      ...src,
      checks: { ...src.checks, [id]: [...(src.checks[id] ?? []), check(id, later)] },
    };
    expect(readinessAsOf(withLater, day).overall).toBe(before.overall);
    // …and counts them once the cutoff passes.
    const after = sourcesAsOf(withLater, addDaysToDate(day, 3), endOfDay(addDaysToDate(day, 3)));
    expect(after.checks[id]?.some((c) => c.createdAt === later)).toBe(true);
  });

  it("starts at nothing before the first record and grows with the year of data", () => {
    const src = sources("year");
    const first = firstDataDay(src)!;
    const empty = readinessAsOf(src, addDaysToDate(first, -1));
    expect(empty.overall).toBe(0);
    const sundays = summitSundays(first, DAY);
    const mid = readinessAsOf(src, sundays[Math.floor(sundays.length / 2)]!).overall;
    expect(mid).toBeGreaterThan(0);
    expect(mid).toBeLessThan(evaluateReadiness(src).overall);
  });

  it("drops problem attempts after the cutoff and replays the schedule", () => {
    const src = sources("mid");
    const solved = Object.values(src.problemStates).find((p) => p.attempts.length >= 2)!;
    const firstAt = [...solved.attempts].map((a) => a.finishedAt ?? a.startedAt).sort()[0]!;
    const day = firstAt.slice(0, 10);
    const past = sourcesAsOf(src, day, endOfDay(day)).problemStates[solved.problemId]!;
    expect(past.attempts.length).toBeLessThan(solved.attempts.length);
    expect(past.srs.dueAt).toBeTruthy();
  });
});

describe("weeks and fingerprints", () => {
  it("lists the Sundays from the first week to the week before today's", () => {
    expect(summitSundays("2026-09-02", "2026-09-27")).toEqual([
      "2026-09-06",
      "2026-09-13",
      "2026-09-20",
    ]);
    expect(summitSundays("2026-09-22", "2026-09-27")).toEqual([]);
    expect(summitSundays(null, DAY)).toEqual([]);
    expect(summitSundays("2020-01-01", DAY)).toHaveLength(SUMMIT_MAX_WEEKS);
  });

  it("the first day with data is the earliest check, attempt or active day", () => {
    const src = sources("mid");
    const first = firstDataDay(src)!;
    expect(firstDataDay(src, [addDaysToDate(first, -3)])).toBe(addDaysToDate(first, -3));
    expect(firstDataDay(src, [addDaysToDate(first, 3)])).toBe(first);
  });

  it("a week's fingerprint changes with an older record, not with a newer one", () => {
    const src = sources("mid");
    const day = addDaysToDate(DAY, -10);
    const base = recordsFingerprint(src, day, recordTimes(src));
    const id = concepts[1]!.id;
    const add = (at: string): EvaluationSources => ({
      ...src,
      checks: { ...src.checks, [id]: [...(src.checks[id] ?? []), check(id, at)] },
    });
    const newer = add(`${DAY}T05:00:00.000Z`);
    expect(recordsFingerprint(newer, day, recordTimes(newer))).toBe(base);
    const older = add(`${addDaysToDate(day, -3)}T05:00:00.000Z`);
    expect(recordsFingerprint(older, day, recordTimes(older))).not.toBe(base);
  });
});

describe("the projection trail", () => {
  it("carries the 14-day pace to the interview with a ±20% range, capped at 100", () => {
    const p = summitProjection(40, 33, "2026-09-27", "2026-10-27")!;
    expect(p.pace).toBeCloseTo(0.5);
    expect(p.daysLeft).toBe(30);
    expect(p.projected).toBeCloseTo(55);
    expect(p.low).toBeCloseTo(52);
    expect(p.high).toBeCloseTo(58);
    expect(summitProjection(90, 60, "2026-09-27", "2026-12-27")!.projected).toBe(100);
    expect(summitProjection(40, 50, "2026-09-27", "2026-10-27")!.projected).toBe(40);
    expect(summitProjection(40, 33, "2026-09-27", undefined)).toBeNull();
    expect(summitProjection(40, 33, "2026-09-27", "2026-09-01")).toBeNull();
  });
});

describe("weekly stamps", () => {
  const monday = "2026-09-14";
  const active = (days: string[]) => (d: string) => days.includes(d);
  const week = (n: number) => Array.from({ length: n }, (_, i) => addDaysToDate(monday, i));
  const isoWeek = () => 38;

  it("stamps a week with 5 or more active days, never one with fewer", () => {
    expect(weekStamps([monday], active(week(STAMP_DAYS - 1)), {}, {}, isoWeek)).toEqual([]);
    const [stamp] = weekStamps([monday], active(week(STAMP_DAYS)), {}, {}, isoWeek);
    expect(stamp).toMatchObject({ week: monday, number: 38, activeDays: 5, count: 0 });
    expect(stamp!.subjectId).toBeUndefined();
  });

  it("carries the subject with the most checks and attempts that week", () => {
    const osId = concepts.find((c) => c.subjectId === "os")!.id;
    const dsaId = concepts.find((c) => c.subjectId === "dsa")!.id;
    const at = (d: number) => `${addDaysToDate(monday, d)}T06:00:00.000Z`;
    const checks = {
      [osId]: [check(osId, at(0)), check(osId, at(1))],
      [dsaId]: [check(dsaId, at(2))],
    };
    const problem: ProblemState = {
      problemId: "lc-1",
      status: "solved",
      starred: false,
      tags: [],
      srs: { step: 0, lapses: 0, soloStreak: 0 },
      inReview: true,
      attempts: [1, 2].map((d) => ({
        id: `a${d}`,
        problemId: "lc-1",
        startedAt: at(d),
        finishedAt: at(d),
        minutes: 10,
        language: "cpp",
        code: "",
        result: "solved_alone" as const,
        hintsUsed: 0,
        mistakeTagIds: [],
        mode: "normal" as const,
      })),
      updatedAt: at(2),
    };
    const [stamp] = weekStamps([monday], active(week(7)), checks, { "lc-1": problem }, isoWeek);
    expect(stamp).toMatchObject({ subjectId: "dsa", count: 3, activeDays: 7 });
    // Records from other weeks don't count.
    const late = {
      [osId]: [...checks[osId]!, check(osId, `${addDaysToDate(monday, 9)}T06:00:00.000Z`)],
    };
    const [again] = weekStamps([monday], active(week(7)), { ...checks, ...late }, {}, isoWeek);
    expect(again).toMatchObject({ subjectId: "os", count: 2 });
  });
});

describe("linked problems, indexed once", () => {
  it("gives the same lists as scanning every problem", () => {
    const src = sources("mid");
    const custom: ProblemState = {
      problemId: "custom-own",
      custom: {
        source: "leetcode",
        title: "My own problem",
        difficulty: "hard",
        conceptIds: ["dsa.arrays.kadanes-algorithm"],
      },
      status: "todo",
      starred: false,
      tags: [],
      srs: { step: 0, lapses: 0, soloStreak: 0 },
      inReview: false,
      attempts: [],
      updatedAt: `${DAY}T05:00:00.000Z`,
    } as ProblemState;
    const states = { ...src.problemStates, "custom-own": custom };
    const index = linkedProblemsIndex(states);
    for (const c of concepts) expect(index(c.id), c.id).toEqual(linkedProblems(c.id, states));
    expect(index("dsa.arrays.kadanes-algorithm").some((p) => p.id === "custom-own")).toBe(true);
  });
});
