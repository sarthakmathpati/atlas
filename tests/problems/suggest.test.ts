// F3 Practice tab: the suggested next problem follows the difficulty ramp.
import { describe, expect, it } from "vitest";
import type { ProblemInfo } from "@/lib/problems/catalog";
import { difficultyRamp, suggestNextProblem } from "@/lib/problems/suggest";
import { createProblemState } from "@/lib/storage/defaults";
import type { AttemptResult, Difficulty, ProblemState } from "@/lib/types";

let order = 0;
function info(id: string, difficulty: Difficulty, premium = false): ProblemInfo {
  return {
    id,
    source: "leetcode",
    title: id,
    difficulty,
    conceptIds: ["x"],
    custom: false,
    premium,
    order: order++,
  };
}

function tried(id: string, result: AttemptResult): ProblemState {
  const s = createProblemState(id);
  s.status = result === "solved_alone" || result === "solved_with_hints" ? "solved" : "attempted";
  s.attempts = [
    {
      id: `${id}-a`,
      problemId: id,
      startedAt: "2026-09-01T10:00:00Z",
      finishedAt: "2026-09-01T10:30:00Z",
      language: "cpp",
      code: "",
      result,
      hintsUsed: 0,
      mistakeTagIds: [],
      mode: "normal",
    },
  ];
  return s;
}

const problems = [
  info("e1", "easy"),
  info("e2", "easy"),
  info("e3", "easy"),
  info("m1", "medium"),
  info("m2", "medium"),
  info("m3", "medium"),
  info("m4", "medium", true),
  info("h1", "hard"),
];

describe("suggested next problem", () => {
  it("starts with an easy problem", () => {
    expect(suggestNextProblem(problems, {})!.id).toBe("e1");
  });

  it("moves to medium after two easy ones solved alone, hard after three medium", () => {
    const states = { e1: tried("e1", "solved_alone"), e2: tried("e2", "solved_alone") };
    expect(difficultyRamp(problems, states).target).toBe("medium");
    expect(suggestNextProblem(problems, states)!.id).toBe("m1");
    const more = {
      ...states,
      m1: tried("m1", "solved_alone"),
      m2: tried("m2", "solved_alone"),
      m3: tried("m3", "solved_alone"),
    };
    expect(suggestNextProblem(problems, more)!.id).toBe("h1");
  });

  it("doesn't count solves with hints, and prefers untried problems", () => {
    const states = { e1: tried("e1", "solved_with_hints"), e2: tried("e2", "not_solved") };
    expect(difficultyRamp(problems, states).target).toBe("easy");
    expect(suggestNextProblem(problems, states)!.id).toBe("e3");
  });

  it("skips premium problems when asked and falls back to other difficulties", () => {
    const states: Record<string, ProblemState> = {};
    for (const id of ["e1", "e2", "m1", "m2", "m3"]) states[id] = tried(id, "solved_alone");
    states.h1 = tried("h1", "solved_alone");
    expect(suggestNextProblem(problems, states)!.id).toBe("m4");
    expect(suggestNextProblem(problems, states, { hidePremium: true })!.id).toBe("e3");
    expect(suggestNextProblem([], {})).toBeUndefined();
  });
});
