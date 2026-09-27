// The weekly review (F18): when it opens, which week it covers, and that its numbers match the
// activity records (and the attempts, for days recorded before difficulty was counted).
import { describe, expect, it } from "vitest";
import { dayLookup } from "@/lib/activity/streak";
import {
  lastReviewMoment,
  offlineReflection,
  pastWeeks,
  reviewWeek,
  suggestFocus,
  weekSummary,
  weekSummaryText,
  weeklyReviewDue,
  type WeekSources,
} from "@/lib/insight/weekly";
import { parseWeeklyReflection } from "@/lib/ai/prompts";
import { evaluateReadiness } from "@/lib/readiness/evaluate";
import { demoSampleResponder } from "@/lib/runtime/fakeSampleDemo";
import { addDaysToDate } from "@/lib/time";
import type { ActivityDay, ActivityMonth, ProblemState } from "@/lib/types";
import { DAY, noonOf, records, scenario } from "../fixtures/scenarios";

const at = (local: string) => new Date(local);

describe("when the review opens", () => {
  it("finds the last Sunday 18:00", () => {
    // DAY (27 Sep 2026) is a Sunday.
    expect(lastReviewMoment(at("2026-09-27T18:00:00")).getTime()).toBe(
      at("2026-09-27T18:00:00").getTime(),
    );
    expect(lastReviewMoment(at("2026-09-27T17:59:00")).getTime()).toBe(
      at("2026-09-20T18:00:00").getTime(),
    );
    expect(lastReviewMoment(at("2026-09-30T09:00:00")).getTime()).toBe(
      at("2026-09-27T18:00:00").getTime(),
    );
  });

  it("covers Monday to that Sunday", () => {
    expect(reviewWeek(at("2026-09-27T19:00:00"))).toBe("2026-09-21");
    expect(reviewWeek(at("2026-09-28T08:00:00"))).toBe("2026-09-21");
    expect(reviewWeek(at("2026-09-27T12:00:00"))).toBe("2026-09-14");
  });

  it("opens once after Sunday 18:00 for an owner who was already using Atlas", () => {
    const createdAt = "2026-09-01T10:00:00.000Z";
    const evening = at("2026-09-27T19:00:00");
    expect(weeklyReviewDue(evening, { createdAt })).toBe(true);
    expect(weeklyReviewDue(at("2026-09-27T17:00:00"), { createdAt })).toBe(true); // last week's, unseen
    expect(
      weeklyReviewDue(evening, {
        createdAt,
        weeklyReviewSeenAt: at("2026-09-27T18:30:00").toISOString(),
      }),
    ).toBe(false);
    expect(
      weeklyReviewDue(evening, {
        createdAt,
        weeklyReviewSeenAt: at("2026-09-27T17:30:00").toISOString(),
      }),
    ).toBe(true);
    // Seen Sunday night: not again on Monday.
    expect(
      weeklyReviewDue(at("2026-09-28T09:00:00"), {
        createdAt,
        weeklyReviewSeenAt: at("2026-09-27T20:00:00").toISOString(),
      }),
    ).toBe(false);
    // A brand-new owner (created after the last Sunday 18:00) isn't shown an empty week.
    expect(weeklyReviewDue(evening, { createdAt: at("2026-09-27T18:30:00").toISOString() })).toBe(
      false,
    );
  });
});

function sourcesFor(
  months: ActivityMonth[],
  problemStates: Record<string, ProblemState> = {},
): WeekSources {
  return {
    lookup: dayLookup(months),
    problemStates,
    conceptStates: {},
    tags: {},
    conceptName: () => undefined,
  };
}

describe("the week's numbers", () => {
  const data = scenario("mid");
  const r = records(data);
  const src: WeekSources = {
    lookup: dayLookup(data.activity),
    problemStates: r.problemStates,
    conceptStates: r.conceptStates,
    tags: Object.fromEntries(data.mistakeTags.map((t) => [t.id, t])),
    conceptName: () => "x",
  };
  const week = "2026-09-14";
  const s = weekSummary(week, src);

  it("adds up the activity records of Monday to Sunday", () => {
    const days: (ActivityDay | undefined)[] = Array.from({ length: 7 }, (_, i) =>
      src.lookup(addDaysToDate(week, i)),
    );
    const sum = (f: (d: ActivityDay) => number | undefined) =>
      days.reduce((n, d) => n + (d ? (f(d) ?? 0) : 0), 0);
    expect(s.minutes).toBe(sum((d) => d.minutes));
    expect(s.solved.total).toBe(sum((d) => d.problemsSolved));
    expect(s.solved.easy + s.solved.medium + s.solved.hard).toBe(s.solved.total);
    expect(s.solved.easy).toBe(sum((d) => d.solvedEasy));
    expect(s.reviews).toBe(sum((d) => d.reviews));
    expect(s.checks).toBe(sum((d) => d.checks));
    expect(s.turnedStrong).toBe(sum((d) => d.turnedStrong));
    expect(s.turnedFading).toBe(sum((d) => d.turnedFading));
    expect(s.drills.sessions).toBe(sum((d) => d.drillSessions));
    expect(s.drills.answers).toBe(sum((d) => d.drillAnswers));
    expect(s.planItemsDone).toBe(sum((d) => d.planItemsDone));
    expect(s.days.map((d) => d.date)).toEqual(
      Array.from({ length: 7 }, (_, i) => addDaysToDate(week, i)),
    );
    expect(s.solvedFrom).toBe("activity");
  });

  it("splits solves by difficulty from the attempts on days recorded before the counters", () => {
    const day = "2026-09-15";
    const months: ActivityMonth[] = [
      {
        month: "2026-09",
        days: {
          [day]: { minutes: 50, problemsSolved: 2, reviews: 0, conceptsTouched: 1, attempts: 3 },
        },
        updatedAt: "",
      },
    ];
    const attempt = (id: string, result: "solved_alone" | "not_solved") => ({
      id: `${id}-1`,
      problemId: id,
      startedAt: `${day}T19:00:00`,
      finishedAt: new Date(`${day}T19:30:00`).toISOString(),
      language: "cpp",
      code: "",
      result,
      hintsUsed: 0 as const,
      mistakeTagIds: ["mt-off-by-one"],
      mode: "normal" as const,
    });
    const state = (id: string, result: "solved_alone" | "not_solved"): ProblemState => ({
      problemId: id,
      status: "solved",
      starred: false,
      tags: [],
      srs: { step: 1, lapses: 0, soloStreak: 1 },
      inReview: true,
      attempts: [attempt(id, result)],
      updatedAt: "",
    });
    // lc-1 is easy, lc-15 medium, lc-42 hard (not solved).
    const s2 = weekSummary(
      week,
      sourcesFor(months, {
        "lc-1": state("lc-1", "solved_alone"),
        "lc-15": state("lc-15", "solved_alone"),
        "lc-42": state("lc-42", "not_solved"),
      }),
    );
    expect(s2.solved).toEqual({ easy: 1, medium: 1, hard: 0, total: 2 });
    expect(s2.solvedFrom).toBe("attempts");
    expect(s2.topMistakes).toEqual([{ tagId: "mt-off-by-one", label: "mt-off-by-one", count: 3 }]);
  });

  it("lists earlier weeks that have activity", () => {
    const weeks = pastWeeks(src.lookup, "2026-09-21", 8);
    expect(weeks[0]).toBe("2026-09-14");
    for (const w of weeks) expect(new Date(`${w}T12:00:00`).getDay()).toBe(1);
    expect(pastWeeks(dayLookup([]), "2026-09-21", 8)).toEqual([]);
  });
});

describe("the summary without Claude, and Claude's reflection", () => {
  const data = scenario("mid");
  const r = records(data);
  const model = evaluateReadiness({ ...r, today: DAY, now: noonOf(DAY), intensity: "normal" });
  const s = weekSummary("2026-09-14", {
    lookup: dayLookup(data.activity),
    problemStates: r.problemStates,
    conceptStates: r.conceptStates,
    tags: {},
    conceptName: () => "x",
  });

  it("suggests up to 3 subjects in the track, fading ones first", () => {
    const focus = suggestFocus(model, "sde");
    expect(focus.length).toBeGreaterThan(0);
    expect(focus.length).toBeLessThanOrEqual(3);
    for (const id of focus)
      expect(model.subjects.find((x) => x.subjectId === id)!.weight).toBeGreaterThan(0);
    expect(model.subjects.find((x) => x.subjectId === focus[0])!.counts.fading).toBeGreaterThan(0);
  });

  it("writes a kind, specific summary from the numbers", () => {
    const text = offlineReflection(s, ["dsa", "os"]);
    expect(text).toContain(`${s.activeDays} of 7 days`);
    expect(text).toContain("Data structures and algorithms and Operating systems");
    expect(text).not.toMatch(/!|should have|failed|lazy/i);
    const quiet = offlineReflection({ ...s, activeDays: 0, minutes: 0 }, []);
    expect(quiet).toMatch(/^A quiet week, and that's fine/);
  });

  it("gives Claude the numbers and reads back its focus subjects", () => {
    const input = weekSummaryText(s, model, ["os"]);
    expect(input).toContain(`Minutes studied: ${s.minutes}`);
    expect(input).toContain(`Problems solved: ${s.solved.total}`);
    const valid = new Set(model.subjects.filter((x) => x.weight > 0).map((x) => x.subjectId));
    const reply = demoSampleResponder(
      `Write a short, kind, specific reflection on the learner's week\n\n${input}`,
    );
    const parsed = parseWeeklyReflection(reply, valid);
    expect(parsed.markdown).toContain("What went well");
    expect(parsed.focusSubjects.length).toBeGreaterThan(0);
    for (const id of parsed.focusSubjects) expect(valid.has(id)).toBe(true);
  });
});
