// The readiness dashboard's numbers (F17): each one follows from the owner's data by the formula
// its popover shows, and the whole model is quick to build with a year of data.
import { describe, expect, it } from "vitest";
import { conceptById } from "@/data/syllabus";
import { IMPORTANCE_WEIGHT } from "@/lib/constants";
import {
  dashboardModel,
  memoryHealth,
  patternTiles,
  practiceLevel,
  projection,
  solvedByWeek,
  subjectRows,
  weaknessReport,
  type DashboardSources,
} from "@/lib/insight/dashboard";
import { computePractice } from "@/lib/mastery/status";
import { problemInfo } from "@/lib/problems/catalog";
import { attemptDate } from "@/lib/problems/progress";
import { evaluateReadiness, linkedProblems } from "@/lib/readiness/evaluate";
import { subjectWeight } from "@/lib/readiness/score";
import { buildReviewQueue } from "@/lib/review/queue";
import { addDaysToDate } from "@/lib/time";
import type { Attempt, ProblemState } from "@/lib/types";
import { DAY, noonOf, records, scenario, yearOfData } from "../fixtures/scenarios";

function sources(name: "new" | "mid" | "week" | "year"): DashboardSources {
  const r = records(name === "year" ? yearOfData() : scenario(name));
  const model = evaluateReadiness({ ...r, today: DAY, now: noonOf(DAY), intensity: "normal" });
  return { ...r, model, today: DAY, intensity: "normal" };
}

describe("readiness", () => {
  const src = sources("mid");
  const rows = subjectRows(src.model);

  it("subject readiness is the importance-weighted mean of concept scores", () => {
    for (const s of src.model.subjects) {
      let num = 0;
      let den = 0;
      for (const e of src.model.byId.values()) {
        if (e.concept.subjectId !== s.subjectId) continue;
        num += IMPORTANCE_WEIGHT[e.concept.importance] * e.score;
        den += IMPORTANCE_WEIGHT[e.concept.importance];
      }
      expect(s.readiness).toBeCloseTo(num / den, 9);
    }
  });

  it("overall readiness is the track-weighted mean of subjects, and contributions add up to it", () => {
    let num = 0;
    let den = 0;
    for (const s of src.model.subjects) {
      const w = subjectWeight(s.subjectId, "sde");
      num += w * s.readiness;
      den += w;
    }
    expect(src.model.overall).toBeCloseTo(num / den, 9);
    expect(rows.reduce((n, s) => n + s.contribution, 0)).toBeCloseTo(src.model.overall, 9);
  });

  it("lists subjects that count first, weakest first", () => {
    const counted = rows.filter((s) => s.weight > 0);
    expect(rows.slice(0, counted.length)).toEqual(counted);
    for (let i = 1; i < counted.length; i++)
      expect(counted[i]!.readiness).toBeGreaterThanOrEqual(counted[i - 1]!.readiness);
  });

  it("gives a new owner 0 everywhere", () => {
    const fresh = sources("new");
    expect(fresh.model.overall).toBe(0);
    expect(fresh.model.counts.not_started).toBe(fresh.model.byId.size);
  });
});

describe("pattern grid", () => {
  const src = sources("mid");
  const tiles = patternTiles(src);

  it("has a tile per pattern in the track, with the status engine's practice", () => {
    const patterns = [...src.model.byId.values()].filter((e) => e.concept.isPattern);
    expect(tiles.length).toBe(patterns.length);
    for (const t of tiles) {
      const p = computePractice(linkedProblems(t.conceptId, src.problemStates));
      expect(t.practice).toBe(p.practice);
      expect(t.sum).toBe(p.sum);
      expect(t.noHard).toBe(t.alone.hard === 0);
      expect(conceptById.get(t.conceptId)?.isPattern).toBe(true);
    }
  });

  it("tints by practice in five steps", () => {
    expect([0, 0.1, 0.4, 0.7, 1].map(practiceLevel)).toEqual([0, 1, 2, 3, 4]);
  });
});

describe("problems over time", () => {
  it("counts every solved attempt in its ISO week by difficulty", () => {
    const src = sources("year");
    const weeks = solvedByWeek(src.problemStates, DAY);
    expect(weeks).toHaveLength(12);
    expect(new Date(`${weeks[0]!.week}T12:00:00`).getDay()).toBe(1); // a Monday
    const first = weeks[0]!.week;
    let expected = 0;
    for (const s of Object.values(src.problemStates))
      for (const a of s.attempts)
        if (
          (a.result === "solved_alone" || a.result === "solved_with_hints") &&
          attemptDate(a) >= first &&
          attemptDate(a) <= DAY
        )
          expected++;
    const total = weeks.reduce((n, w) => n + w.easy + w.medium + w.hard, 0);
    expect(total).toBe(expected);
    expect(total).toBeGreaterThan(0);
  });
});

describe("memory health", () => {
  it("due today and overdue add up to the review queue", () => {
    const src = sources("mid");
    const m = memoryHealth(src);
    const queue = buildReviewQueue(src.problemStates, src.conceptStates, "normal", DAY);
    expect(m.dueToday.problems + m.overdue.problems).toBe(queue.problems.length);
    expect(m.dueToday.concepts + m.overdue.concepts).toBe(queue.concepts.length);
  });

  it("retention is re-solves solved alone over re-solves in the last 30 days", () => {
    const src = sources("new");
    const mk = (n: number, day: string, result: Attempt["result"]): Attempt => ({
      id: `a${n}`,
      problemId: "lc-1",
      startedAt: `${day}T10:00:00`,
      finishedAt: `${day}T10:20:00`,
      language: "cpp",
      code: "",
      result,
      hintsUsed: 0,
      mistakeTagIds: [],
      mode: "normal",
    });
    const state: ProblemState = {
      problemId: "lc-1",
      status: "solved",
      starred: false,
      tags: [],
      srs: { step: 1, lapses: 0, soloStreak: 1, dueAt: addDaysToDate(DAY, 3) },
      inReview: true,
      attempts: [
        mk(1, addDaysToDate(DAY, -60), "solved_alone"), // the first attempt: not a re-solve
        mk(2, addDaysToDate(DAY, -40), "solved_alone"), // too old
        mk(3, addDaysToDate(DAY, -20), "solved_alone"),
        mk(4, addDaysToDate(DAY, -10), "not_solved"),
        mk(5, addDaysToDate(DAY, -1), "solved_with_hints"),
      ],
      updatedAt: "",
    };
    const m = memoryHealth({ ...src, problemStates: { "lc-1": state } });
    expect(m.retention).toMatchObject({ alone: 1, total: 3 });
    expect(m.retention.rate).toBeCloseTo(1 / 3, 9);
  });
});

describe("weakness report", () => {
  const src = sources("year");
  const report = weaknessReport(src, patternTiles(src));

  it("lists up to 5 must-know concepts under way, lowest score first", () => {
    expect(report.concepts.length).toBeGreaterThan(0);
    expect(report.concepts.length).toBeLessThanOrEqual(5);
    for (const e of report.concepts) {
      expect(e.concept.importance).toBe("must");
      expect(["learning", "fading"]).toContain(e.status);
    }
    for (let i = 1; i < report.concepts.length; i++)
      expect(report.concepts[i]!.score).toBeGreaterThanOrEqual(report.concepts[i - 1]!.score);
    const worst = Math.min(
      ...[...src.model.byId.values()]
        .filter((e) => e.concept.importance === "must" && ["learning", "fading"].includes(e.status))
        .map((e) => e.score),
    );
    expect(report.concepts[0]!.score).toBe(worst);
  });

  it("names up to 3 patterns with solves but no hard one, each with a hard problem to try", () => {
    expect(report.patterns.length).toBeLessThanOrEqual(3);
    for (const t of report.patterns) {
      expect(t.alone.hard).toBe(0);
      expect(t.sum).toBeGreaterThan(0);
      expect(t.hardProblem.difficulty).toBe("hard");
      expect(t.hardProblem.conceptIds).toContain(t.conceptId);
      expect(src.problemStates[t.hardProblem.id]?.status).not.toBe("solved");
    }
  });

  it("lists subjects started but untouched for 14 days or more", () => {
    const src2 = sources("mid");
    // Move every activity in OS back 20 days.
    const shifted = structuredClone(src2);
    for (const s of Object.values(shifted.conceptStates))
      if (s.conceptId.startsWith("os.")) s.lastActivityAt = `${addDaysToDate(DAY, -20)}T10:00:00.000Z`;
    const checks = Object.fromEntries(
      Object.entries(shifted.checks).map(([id, list]) => [
        id,
        id.startsWith("os.")
          ? list.map((c) => ({ ...c, createdAt: `${addDaysToDate(DAY, -20)}T10:00:00.000Z` }))
          : list,
      ]),
    );
    const r = weaknessReport({ ...shifted, checks }, patternTiles(shifted));
    const os = r.subjects.find((s) => s.subjectId === "os");
    expect(os?.daysSince).toBeGreaterThanOrEqual(14);
    expect(r.subjects.find((s) => s.subjectId === "dsa")).toBeUndefined();
  });
});

describe("projection", () => {
  it("adds 14 days of pace to today's strong must-know count, with a ±20% range", () => {
    const src = sources("week");
    const p = projection(src)!;
    expect(p.daysLeft).toBe(7);
    const musts = [...src.model.byId.values()].filter((e) => e.concept.importance === "must");
    expect(p.totalMust).toBe(musts.length);
    expect(p.strongMust).toBe(musts.filter((e) => e.status === "strong").length);
    expect(p.pace).toBeCloseTo(p.recentStrong / 14, 9);
    expect(p.projected).toBeCloseTo(Math.min(p.totalMust, p.strongMust + p.pace * 7), 9);
    expect(p.low).toBeLessThanOrEqual(p.projected);
    expect(p.high).toBeGreaterThanOrEqual(p.projected);
    expect(p.high - p.strongMust).toBeCloseTo(Math.min(p.totalMust - p.strongMust, 1.2 * p.pace * 7), 9);
  });

  it("needs an interview date in the future", () => {
    expect(projection(sources("new"))).toBeNull();
  });
});

describe("a year of data", () => {
  it("builds the whole dashboard model quickly", () => {
    const r = records(yearOfData());
    const attempts = r.problemStates && Object.values(r.problemStates).reduce((n, s) => n + s.attempts.length, 0);
    expect(Object.keys(r.problemStates).length).toBeGreaterThan(300);
    expect(attempts).toBeGreaterThan(1000);
    const times: number[] = [];
    for (let i = 0; i < 3; i++) {
      const t = performance.now();
      const model = evaluateReadiness({ ...r, today: DAY, now: noonOf(DAY), intensity: "normal" });
      dashboardModel({ ...r, model, today: DAY, intensity: "normal" });
      times.push(performance.now() - t);
    }
    // Typically 30 ms here; the page itself was measured at 120 to 170 ms in a browser.
    expect(Math.min(...times)).toBeLessThan(300);
  });

  it("every solved problem in the window is counted once", () => {
    const src = sources("year");
    const weeks = solvedByWeek(src.problemStates, DAY);
    const byDifficulty = { easy: 0, medium: 0, hard: 0 };
    for (const w of weeks) {
      byDifficulty.easy += w.easy;
      byDifficulty.medium += w.medium;
      byDifficulty.hard += w.hard;
    }
    const expected = { easy: 0, medium: 0, hard: 0 };
    for (const s of Object.values(src.problemStates)) {
      const d = problemInfo(s.problemId, s)!.difficulty;
      for (const a of s.attempts)
        if (
          (a.result === "solved_alone" || a.result === "solved_with_hints") &&
          attemptDate(a) >= weeks[0]!.week &&
          attemptDate(a) <= DAY
        )
          expected[d]++;
    }
    expect(byDifficulty).toEqual(expected);
  });
});
