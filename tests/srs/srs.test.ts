// Section 11.1: problem and concept spaced repetition, including every row of the problem table.
import { describe, expect, it } from "vitest";
import { applyConceptReview, startConceptReview } from "@/lib/srs/concept";
import { conceptInterval, graceDays, isOverdue, problemInterval } from "@/lib/srs/intervals";
import { isProblemDue, isTricky, replaySchedule, scheduleProblem } from "@/lib/srs/problem";
import type { AttemptResult, SrsState } from "@/lib/types";

const T = "2026-09-24T12:00:00.000Z";
const fresh: SrsState = { step: 0, lapses: 0, soloStreak: 0 };

function run(
  srs: SrsState,
  result: AttemptResult,
  today = "2026-09-24",
  status = "solved" as const,
) {
  return scheduleProblem({
    srs,
    status,
    result,
    today,
    reviewedAt: T,
    difficulty: "medium",
    intensity: "normal",
  });
}

describe("problem intervals", () => {
  it("follows PROBLEM_STEPS_DAYS × intensity × difficulty, rounded, at least 1", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map((s) => problemInterval(s, "normal", "medium"))).toEqual([
      1, 3, 7, 14, 30, 60, 120,
    ]);
    // gentle 1.25 × easy 1.1
    expect(problemInterval(2, "gentle", "easy")).toBe(Math.round(7 * 1.25 * 1.1));
    // intense 0.8 × hard 0.9: 1 × 0.72 rounds to 1 (minimum 1)
    expect(problemInterval(0, "intense", "hard")).toBe(1);
    expect(problemInterval(6, "intense", "hard")).toBe(Math.round(120 * 0.8 * 0.9));
    expect(problemInterval(99, "normal", "medium")).toBe(120);
  });
});

describe("scheduleProblem: first ever attempt", () => {
  it("solved alone → step 1, solved, soloStreak 1", () => {
    const r = run(fresh, "solved_alone", "2026-09-24", "todo" as never);
    expect(r.case).toBe("first");
    expect(r.srs).toMatchObject({ step: 1, soloStreak: 1, lapses: 0, dueAt: "2026-09-27" });
    expect(r.status).toBe("solved");
  });
  it("solved with hints → step 0, solved, soloStreak 0, back tomorrow", () => {
    const r = run(fresh, "solved_with_hints", "2026-09-24", "todo" as never);
    expect(r.srs).toMatchObject({ step: 0, soloStreak: 0, dueAt: "2026-09-25" });
    expect(r.status).toBe("solved");
  });
  it.each(["saw_solution", "not_solved"] as const)(
    "%s → step 0, attempted, back tomorrow",
    (res) => {
      const r = run(fresh, res, "2026-09-24", "todo" as never);
      expect(r.srs).toMatchObject({ step: 0, soloStreak: 0, lapses: 0, dueAt: "2026-09-25" });
      expect(r.status).toBe("attempted");
    },
  );
});

describe("scheduleProblem: when due or overdue", () => {
  const due: SrsState = { step: 2, dueAt: "2026-09-20", lapses: 0, soloStreak: 2 };
  it("solved alone → step + 1, soloStreak + 1", () => {
    const r = run(due, "solved_alone");
    expect(r.case).toBe("due");
    expect(r.srs).toMatchObject({ step: 3, soloStreak: 3, dueAt: "2026-10-08" });
  });
  it("caps the step at 6", () => {
    const r = run({ ...due, step: 6 }, "solved_alone");
    expect(r.srs.step).toBe(6);
  });
  it("solved with hints → same step, soloStreak 0", () => {
    const r = run(due, "solved_with_hints");
    expect(r.srs).toMatchObject({ step: 2, soloStreak: 0, lapses: 0, dueAt: "2026-10-01" });
  });
  it.each(["saw_solution", "not_solved"] as const)("%s → step 0, lapses + 1", (res) => {
    const r = run(due, res);
    expect(r.srs).toMatchObject({ step: 0, soloStreak: 0, lapses: 1, dueAt: "2026-09-25" });
    expect(r.status).toBe("solved"); // never downgraded
  });
  it("counts the due date itself as due", () => {
    expect(run({ ...due, dueAt: "2026-09-24" }, "solved_alone").case).toBe("due");
  });
});

describe("scheduleProblem: early attempts", () => {
  const early: SrsState = { step: 3, dueAt: "2026-10-05", lapses: 1, soloStreak: 2 };
  it("solved alone → same step, rescheduled from today, nothing else", () => {
    const r = run(early, "solved_alone");
    expect(r.case).toBe("early");
    expect(r.srs).toMatchObject({ step: 3, soloStreak: 2, lapses: 1, dueAt: "2026-10-08" });
  });
  it("anything else → as the due rows", () => {
    expect(run(early, "solved_with_hints").srs).toMatchObject({ step: 3, soloStreak: 0 });
    expect(run(early, "not_solved").srs).toMatchObject({ step: 0, lapses: 2, soloStreak: 0 });
  });
});

describe("retiring and tricky problems", () => {
  it("retires on a solo solve at step 5 or higher with soloStreak ≥ 3", () => {
    const r = run({ step: 5, dueAt: "2026-09-24", lapses: 0, soloStreak: 2 }, "solved_alone");
    expect(r.srs.retired).toBe(true);
    expect(r.newlyRetired).toBe(true);
  });
  it("doesn't retire below step 5 or with a short streak", () => {
    expect(
      run({ step: 4, dueAt: "2026-09-24", lapses: 0, soloStreak: 5 }, "solved_alone").srs.retired,
    ).toBeUndefined();
    expect(
      run({ step: 5, dueAt: "2026-09-24", lapses: 0, soloStreak: 1 }, "solved_alone").srs.retired,
    ).toBeUndefined();
  });
  it("brings a mastered problem back when it isn't solved alone", () => {
    const retired: SrsState = {
      step: 6,
      dueAt: "2026-09-20",
      lapses: 0,
      soloStreak: 6,
      retired: true,
    };
    expect(run(retired, "solved_alone").srs.retired).toBe(true);
    expect(run(retired, "not_solved").srs.retired).toBeUndefined();
  });
  it("marks a problem tricky at two lapses", () => {
    expect(isTricky({ ...fresh, lapses: 1 })).toBe(false);
    expect(isTricky({ ...fresh, lapses: 2 })).toBe(true);
  });
  it("walks a perfect history to retirement after reaching the 60-day step", () => {
    let srs = fresh;
    let today = "2026-01-01";
    const steps: number[] = [];
    for (let i = 0; i < 8 && !srs.retired; i++) {
      const r = run(srs, "solved_alone", today);
      srs = r.srs;
      steps.push(srs.step);
      today = srs.dueAt!;
    }
    expect(steps).toEqual([1, 2, 3, 4, 5, 6]);
    expect(srs.retired).toBe(true);
  });
});

describe("due lists", () => {
  it("is due only in review, not retired, on or after the due date", () => {
    const base = {
      problemId: "lc-1",
      status: "solved" as const,
      starred: false,
      tags: [],
      attempts: [],
      updatedAt: T,
      inReview: true,
      srs: { step: 1, dueAt: "2026-09-24", lapses: 0, soloStreak: 1 },
    };
    expect(isProblemDue(base, "2026-09-24")).toBe(true);
    expect(isProblemDue(base, "2026-09-23")).toBe(false);
    expect(isProblemDue({ ...base, inReview: false }, "2026-09-30")).toBe(false);
    expect(isProblemDue({ ...base, srs: { ...base.srs, retired: true } }, "2026-09-30")).toBe(
      false,
    );
  });
});

describe("replaySchedule", () => {
  it("schedules imported history the same as saving attempts one by one", () => {
    const history = [
      { date: "2026-09-10", result: "solved_alone" as const, reviewedAt: "2026-09-10T10:00:00Z" },
      { date: "2026-09-01", result: "not_solved" as const, reviewedAt: "2026-09-01T10:00:00Z" },
      {
        date: "2026-09-02",
        result: "solved_with_hints" as const,
        reviewedAt: "2026-09-02T10:00:00Z",
      },
    ];
    const replayed = replaySchedule(history, "medium", "normal");
    let srs = fresh;
    let status: "todo" | "attempted" | "solved" = "todo";
    for (const h of [...history].sort((a, b) => (a.date < b.date ? -1 : 1))) {
      const r = scheduleProblem({
        srs,
        status,
        result: h.result,
        today: h.date,
        reviewedAt: h.reviewedAt,
        difficulty: "medium",
        intensity: "normal",
      });
      srs = r.srs;
      status = r.status;
    }
    expect(replayed.srs).toEqual(srs);
    expect(replayed.status).toBe("solved");
    expect(replayed.srs).toMatchObject({ step: 1, soloStreak: 1, dueAt: "2026-09-13" });
  });
});

describe("grace and overdue (11.2)", () => {
  it("uses max(2 days, 25% of the interval)", () => {
    expect(graceDays(3)).toBe(2);
    expect(graceDays(60)).toBe(15);
    expect(isOverdue("2026-09-20", 7, "2026-09-22")).toBe(false);
    expect(isOverdue("2026-09-20", 7, "2026-09-23")).toBe(true);
    expect(isOverdue("2026-09-01", 60, "2026-09-16")).toBe(false);
    expect(isOverdue("2026-09-01", 60, "2026-09-17")).toBe(true);
    expect(isOverdue(undefined, 7, "2030-01-01")).toBe(false);
  });
});

describe("concept schedule", () => {
  it("intervals follow CONCEPT_STEPS_DAYS × intensity", () => {
    expect([0, 1, 2, 3, 4, 5].map((s) => conceptInterval(s, "normal"))).toEqual([
      2, 5, 12, 25, 50, 90,
    ]);
    expect(conceptInterval(0, "gentle")).toBe(3); // 2.5 rounds to 3
    expect(conceptInterval(5, "intense")).toBe(72);
  });
  it("enters review at step 0, due in 2 days", () => {
    expect(startConceptReview(fresh, "2026-09-24", "normal")).toMatchObject({
      step: 0,
      dueAt: "2026-09-26",
    });
  });
  it("the first check enters review without moving the step", () => {
    const r = applyConceptReview(fresh, {
      score: 1,
      today: "2026-09-24",
      reviewedAt: T,
      intensity: "normal",
    });
    expect(r).toMatchObject({ step: 0, dueAt: "2026-09-26" });
  });
  const due: SrsState = { step: 2, dueAt: "2026-09-20", lapses: 0, soloStreak: 0 };
  const at = (score: number, extra = {}) =>
    applyConceptReview(due, {
      score,
      today: "2026-09-24",
      reviewedAt: T,
      intensity: "normal",
      ...extra,
    });
  it("moves by score when due", () => {
    expect(at(0.8)).toMatchObject({ step: 3, lapses: 0, dueAt: "2026-10-19" });
    expect(at(0.65)).toMatchObject({ step: 2, lapses: 0, dueAt: "2026-10-06" });
    expect(at(0.3)).toMatchObject({ step: 0, lapses: 1, dueAt: "2026-09-26" });
    expect(
      applyConceptReview(
        { ...due, step: 5 },
        { score: 1, today: "2026-09-24", reviewedAt: T, intensity: "normal" },
      ).step,
    ).toBe(5);
  });
  it("ignores checks before the due date, unless it's a review session", () => {
    const early = { ...due, dueAt: "2026-10-01" };
    expect(
      applyConceptReview(early, {
        score: 1,
        today: "2026-09-24",
        reviewedAt: T,
        intensity: "normal",
      }),
    ).toBe(early);
    expect(
      applyConceptReview(early, {
        score: 1,
        today: "2026-09-24",
        reviewedAt: T,
        intensity: "normal",
        session: true,
      }).step,
    ).toBe(3);
  });
  it("moves on drills only when fully correct", () => {
    expect(at(1, { drill: true, fullyCorrect: false })).toEqual(due);
    expect(at(1, { drill: true, fullyCorrect: true }).step).toBe(3);
  });
});
