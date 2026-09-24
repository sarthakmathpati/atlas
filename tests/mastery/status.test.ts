// Section 11.2: knowledge, practice and the status rules, plus "what would turn it green".
import { describe, expect, it } from "vitest";
import {
  computeKnowledge,
  computePractice,
  computeStatus,
  nextConceptState,
  type LinkedProblem,
  type StatusInput,
} from "@/lib/mastery/status";
import type {
  Attempt,
  AttemptResult,
  Check,
  ConceptState,
  Difficulty,
  ProblemState,
} from "@/lib/types";

const NOW = new Date("2026-09-24T12:00:00");
const TODAY = "2026-09-24";
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();

let n = 0;
function check(kind: Check["kind"], score: number, age = 1): Check {
  n++;
  return {
    id: `c${n}`,
    conceptId: "x",
    kind,
    score,
    createdAt: daysAgo(age),
    updatedAt: daysAgo(age),
  };
}

function attempt(result: AttemptResult, age = 1): Attempt {
  n++;
  return {
    id: `a${n}`,
    problemId: "p",
    startedAt: daysAgo(age),
    finishedAt: daysAgo(age),
    language: "cpp",
    code: "",
    result,
    hintsUsed: 0,
    mistakeTagIds: [],
    mode: "normal",
  };
}

function problem(
  difficulty: Difficulty,
  results: AttemptResult[],
  srs: Partial<ProblemState["srs"]> = {},
): LinkedProblem {
  n++;
  return {
    id: `p${n}`,
    difficulty,
    state: {
      problemId: `p${n}`,
      status: results.length ? "solved" : "todo",
      starred: false,
      tags: [],
      inReview: results.length > 0,
      srs: { step: 1, lapses: 0, soloStreak: 0, dueAt: "2026-10-30", ...srs },
      attempts: results.map((r, i) => attempt(r, results.length - i + 1)),
      updatedAt: daysAgo(1),
    },
  };
}

function state(overrides: Partial<ConceptState> = {}): ConceptState {
  return {
    conceptId: "x",
    status: "not_started",
    everStrong: false,
    studied: false,
    knowledge: 0,
    srs: { step: 0, lapses: 0, soloStreak: 0 },
    updatedAt: daysAgo(10),
    ...overrides,
  };
}

function status(input: Partial<StatusInput> & { isPattern?: boolean }) {
  return computeStatus({
    concept: { id: "x", isPattern: input.isPattern ?? false },
    state: input.state,
    checks: input.checks ?? [],
    linked: input.linked ?? [],
    today: TODAY,
    now: NOW,
    intensity: "normal",
  });
}

describe("knowledge", () => {
  it("is 0 with no evidence", () => {
    expect(computeKnowledge([], undefined, NOW)).toBe(0);
  });
  it("takes the best weighted latest check per kind", () => {
    expect(
      computeKnowledge([check("quiz", 0.6, 5), check("quiz", 0.9, 2)], undefined, NOW),
    ).toBeCloseTo(0.9);
    expect(computeKnowledge([check("explain", 0.7)], undefined, NOW)).toBeCloseTo(0.7);
    expect(computeKnowledge([check("manual", 1)], undefined, NOW)).toBeCloseTo(0.8);
  });
  it("averages the last 3 flashcards (×0.9) and the last 5 drills (×0.6)", () => {
    const cards = [
      check("flashcard", 1, 1),
      check("flashcard", 0.5, 2),
      check("flashcard", 0, 3),
      check("flashcard", 0, 4),
    ];
    expect(computeKnowledge(cards, undefined, NOW)).toBeCloseTo(0.5 * 0.9);
    const drills = [1, 1, 0, 1, 1, 0].map((s, i) => check("drill", s, i + 1));
    expect(computeKnowledge(drills, undefined, NOW)).toBeCloseTo(0.8 * 0.6);
  });
  it("ignores checks older than 180 days and decays when the newest is over 120 days old", () => {
    expect(computeKnowledge([check("quiz", 1, 200)], undefined, NOW)).toBe(0);
    expect(computeKnowledge([check("quiz", 1, 130)], undefined, NOW)).toBeCloseTo(0.8);
  });
  it("floors at 0.3 when studied, and at the self-assessment until real checks exist", () => {
    expect(computeKnowledge([], { studied: true }, NOW)).toBe(0.3);
    expect(computeKnowledge([], { studied: false, selfAssessed: 0.5 }, NOW)).toBe(0.5);
    expect(
      computeKnowledge([check("quiz", 0.2)], { studied: false, selfAssessed: 0.5 }, NOW),
    ).toBeCloseTo(0.2);
  });
});

describe("practice", () => {
  it("weights the latest attempt by difficulty; hints count half", () => {
    const p = computePractice([
      problem("easy", ["solved_alone"]),
      problem("medium", ["solved_with_hints"]),
      problem("hard", ["not_solved", "solved_alone"]),
    ]);
    expect(p.sum).toBeCloseTo(0.5 + 0.5 + 1.5);
    expect(p.practice).toBeCloseTo(2.5 / 3);
    expect(p.hasMediumPlus).toBe(true);
  });
  it("uses only the most recent attempt", () => {
    const p = computePractice([problem("medium", ["solved_alone", "saw_solution"])]);
    expect(p.sum).toBe(0);
    expect(p.hasMediumPlus).toBe(false);
    expect(p.attempted).toBe(true);
  });
  it("caps at 1", () => {
    expect(
      computePractice([
        problem("hard", ["solved_alone"]),
        problem("hard", ["solved_alone"]),
        problem("hard", ["solved_alone"]),
      ]).practice,
    ).toBe(1);
  });
});

describe("status rules", () => {
  it("rule 2: no evidence is not started", () => {
    expect(status({ linked: [problem("medium", [])] }).status).toBe("not_started");
  });
  it("an attempt on a linked problem is evidence: learning", () => {
    const r = status({ isPattern: true, linked: [problem("medium", ["solved_alone"])] });
    expect(r.status).toBe("learning");
    expect(r.toGreen).toEqual([
      "Score 80% or more on a quick quiz or explain it back",
      "Solve 2 more medium problems on your own",
    ]);
  });
  it("rule 3/4: a pattern needs knowledge, practice ≥ 1 and a medium-plus solve", () => {
    const checks = [check("quiz", 0.9)];
    const easyOnly = [1, 2, 3, 4, 5, 6].map(() => problem("easy", ["solved_alone"]));
    const r1 = status({ isPattern: true, checks, linked: easyOnly });
    expect(r1.status).toBe("learning");
    expect(r1.toGreen).toEqual(["Solve a medium or hard problem on your own"]);
    const r2 = status({
      isPattern: true,
      checks,
      linked: [
        problem("medium", ["solved_alone"]),
        problem("hard", ["solved_alone"]),
        problem("easy", ["solved_alone"]),
      ],
    });
    expect(r2.status).toBe("strong");
    expect(r2.toGreen).toEqual([]);
  });
  it("rule 3: other concepts with linked problems need practice ≥ 0.66", () => {
    const checks = [check("explain", 0.85)];
    expect(status({ checks, linked: [problem("medium", ["solved_alone"])] }).status).toBe(
      "learning",
    );
    expect(
      status({
        checks,
        linked: [problem("medium", ["solved_alone"]), problem("medium", ["solved_alone"])],
      }).status,
    ).toBe("strong");
    expect(status({ checks, linked: [problem("medium", ["solved_alone"])] }).toGreen).toEqual([
      "Solve 1 more linked problem on your own",
    ]);
  });
  it("rule 3: concepts without linked problems need knowledge only", () => {
    expect(status({ checks: [check("quiz", 0.8)] }).status).toBe("strong");
    expect(status({ checks: [check("quiz", 0.7)] }).status).toBe("learning");
  });
  it("rule 5: overdue and ever strong or knowledge ≥ 0.6 is fading", () => {
    const overdue = state({ srs: { step: 1, dueAt: "2026-09-10", lapses: 0, soloStreak: 0 } });
    const r = status({ state: { ...overdue, everStrong: true }, checks: [check("quiz", 1)] });
    expect(r.status).toBe("fading");
    expect(r.overdueDays).toBe(14);
    expect(r.toGreen).toEqual(["Review it (due 14 days ago)"]);
    expect(status({ state: overdue, checks: [check("quiz", 0.65)] }).status).toBe("fading");
    expect(status({ state: overdue, checks: [check("quiz", 0.4)] }).status).toBe("learning");
  });
  it("a pattern is overdue when two linked problems are overdue beyond their grace", () => {
    const late = { dueAt: "2026-09-01", step: 1 };
    const checks = [check("quiz", 1)];
    const linked = [
      problem("medium", ["solved_alone"], late),
      problem("hard", ["solved_alone"], late),
      problem("medium", ["solved_alone"]),
    ];
    const r = status({ isPattern: true, checks, linked });
    expect(r.overdue).toBe(true);
    expect(r.status).toBe("fading");
    const one = status({
      isPattern: true,
      checks,
      linked: [linked[0]!, linked[2]!, problem("hard", ["solved_alone"])],
    });
    expect(one.overdue).toBe(false);
    expect(one.status).toBe("strong");
  });
  it("rule 1: manual status wins; a manual strong fades when overdue unless neverFade", () => {
    const overdue = { step: 1, dueAt: "2026-09-10", lapses: 0, soloStreak: 0 };
    expect(status({ state: state({ manualStatus: "learning" }) }).status).toBe("learning");
    expect(status({ state: state({ manualStatus: "strong", srs: overdue }) }).status).toBe(
      "fading",
    );
    expect(
      status({ state: state({ manualStatus: "strong", srs: overdue, neverFade: true }) }).status,
    ).toBe("strong");
  });
});

describe("nextConceptState", () => {
  it("writes nothing for a concept with no evidence and no stored state", () => {
    expect(nextConceptState("x", undefined, status({}), NOW)).toBeNull();
  });
  it("creates a state with activity times on the first attempt", () => {
    const r = status({ isPattern: true, linked: [problem("medium", ["solved_alone"])] });
    const s = nextConceptState("x", undefined, r, NOW, "2026-09-24T10:00:00.000Z");
    expect(s).toMatchObject({
      conceptId: "x",
      status: "learning",
      firstActivityAt: "2026-09-24T10:00:00.000Z",
    });
  });
  it("stamps strongSince when newly strong and keeps everStrong", () => {
    const r = status({ checks: [check("quiz", 1)] });
    const s = nextConceptState("x", state({ status: "learning" }), r, NOW)!;
    expect(s.status).toBe("strong");
    expect(s.everStrong).toBe(true);
    expect(s.strongSince).toBe(NOW.toISOString());
    expect(nextConceptState("x", s, r, NOW)).toBeNull();
  });
});

describe("knowledge details (Why this color?)", () => {
  it("names the strongest source and matches computeKnowledge", async () => {
    const { knowledgeDetails } = await import("@/lib/mastery/status");
    const checks = [check("quiz", 0.6, 5), check("flashcard", 1, 3), check("explain", 0.7, 2)];
    const d = knowledgeDetails(checks, undefined, NOW);
    expect(d.value).toBeCloseTo(computeKnowledge(checks, undefined, NOW));
    expect(d.sources.map((s) => s.kind)).toEqual(["flashcard", "explain", "quiz"]);
    expect(d.sources[0]!.weighted).toBeCloseTo(0.9);
    expect(d.studiedFloor).toBe(false);
    const floor = knowledgeDetails([], { studied: true }, NOW);
    expect(floor).toMatchObject({ value: 0.3, studiedFloor: true, selfAssessedFloor: false });
    const self = knowledgeDetails([], { studied: true, selfAssessed: 0.5 }, NOW);
    expect(self).toMatchObject({ value: 0.5, studiedFloor: false, selfAssessedFloor: true });
    const stale = knowledgeDetails([check("quiz", 1, 150)], undefined, NOW);
    expect(stale).toMatchObject({ value: 0.8, stale: true });
  });
});
