import { describe, expect, it } from "vitest";
import { QUANT_PUZZLES } from "@/data/quant.seed";
import { evaluateExpression, variablesIn } from "@/lib/quant/answerCheck";
import { allProblems, problemInfo } from "@/lib/problems/catalog";
import {
  checkPuzzleAnswer,
  filterPuzzles,
  gradeFromClaude,
  isOpenEnded,
  puzzleOutcome,
  puzzleStatus,
  selfGrade,
} from "@/lib/quant/puzzles";
import { createProblemState } from "@/lib/storage/defaults";
import type { ProblemState } from "@/lib/types";

const checkable = QUANT_PUZZLES.filter(
  (p) => typeof p.answer === "string" && !/^(yes|no)$/i.test(p.answer),
);

describe("answer checking of equivalent forms on every checkable puzzle", () => {
  it("accepts the answer as written, as a decimal, and as a percentage", () => {
    expect(checkable.length).toBeGreaterThan(80);
    for (const p of checkable) {
      const expected = p.answer!;
      if (variablesIn(expected).length) continue;
      const value = evaluateExpression(expected);
      const tries = [expected, value.toPrecision(6), `${(value * 100).toPrecision(6)}%`];
      for (const typed of tries) {
        expect(checkPuzzleAnswer(expected, typed, undefined).verdict, `${p.id}: ${typed}`).toBe(
          "correct",
        );
      }
      // 2% off is wrong (the tolerance is 0.5%).
      const off = value === 0 ? "1" : (value * 1.02).toPrecision(6);
      expect(checkPuzzleAnswer(expected, off, undefined).verdict, `${p.id}: ${off}`).toBe(
        "incorrect",
      );
    }
  });

  it("accepts forms like 1/e, sqrt, fractions and filler words", () => {
    const find = (id: string) => QUANT_PUZZLES.find((p) => p.id === id)!.answer!;
    expect(checkPuzzleAnswer(find("q-derangement"), "1/e", undefined).verdict).toBe("correct");
    expect(checkPuzzleAnswer(find("q-derangement"), "0.368", undefined).verdict).toBe("correct");
    expect(checkPuzzleAnswer(find("q-derangement"), "e^-1", undefined).verdict).toBe("correct");
    expect(checkPuzzleAnswer(find("q-uniform-sum-one"), "about 2.718", undefined).verdict).toBe(
      "correct",
    );
    expect(checkPuzzleAnswer(find("q-sqrt50"), "sqrt(50)", undefined).verdict).toBe("correct");
    expect(checkPuzzleAnswer(find("q-sqrt50"), "5√2", undefined).verdict).toBe("correct");
    expect(checkPuzzleAnswer(find("q-first-ace"), "10.6", undefined).verdict).toBe("correct");
    expect(checkPuzzleAnswer(find("q-first-ace"), "53/5", undefined).verdict).toBe("correct");
    expect(checkPuzzleAnswer(find("q-monty"), "66.7%", undefined).verdict).toBe("correct");
    expect(checkPuzzleAnswer(find("q-clock"), "7.5 degrees", undefined).verdict).toBe("correct");
    expect(checkPuzzleAnswer(find("q-min-n-uniform"), "1/(1+n)", undefined).verdict).toBe(
      "correct",
    );
    expect(checkPuzzleAnswer(find("q-min-n-uniform"), "1/n", undefined).verdict).toBe("incorrect");
    expect(checkPuzzleAnswer(find("q-nim"), "Yes, the first player", undefined).verdict).toBe(
      "correct",
    );
    expect(checkPuzzleAnswer(find("q-nim"), "no", undefined).verdict).toBe("incorrect");
  });

  it("counts tries, remembers the first correct one, and ignores unreadable answers", () => {
    let r = checkPuzzleAnswer("2/3", "0.5", undefined);
    expect(r.verdict).toBe("incorrect");
    expect(r.progress.tries).toBe(1);
    r = checkPuzzleAnswer("2/3", "two thirds!?", r.progress);
    expect(r.verdict).toBe("unreadable");
    expect(r.progress.tries).toBe(1);
    r = checkPuzzleAnswer("2/3", "0.667", r.progress);
    expect(r).toMatchObject({ verdict: "correct", progress: { tries: 2, firstCorrectTry: 2 } });
  });
});

describe("what a puzzle attempt may be saved as", () => {
  const numeric = { answer: "2/3" };
  const open = { answer: null };
  const clean = { hintsUsed: 0, sawSolution: false };

  it("needs a correct check before a solve", () => {
    expect(puzzleOutcome(numeric, undefined, clean)).toMatchObject({
      suggested: null,
      solvedLock: "Check your answer first.",
    });
    const wrong = checkPuzzleAnswer("2/3", "1/2", undefined).progress;
    expect(puzzleOutcome(numeric, wrong, clean).solvedLock).toMatch(/didn't match/);
    const right = checkPuzzleAnswer("2/3", "2/3", wrong).progress;
    expect(puzzleOutcome(numeric, right, clean)).toMatchObject({
      suggested: "solved_alone",
      solvedLock: null,
      summary: "Correct on the second try.",
    });
    expect(puzzleOutcome(numeric, right, { hintsUsed: 2, sawSolution: false }).suggested).toBe(
      "solved_with_hints",
    );
    expect(puzzleOutcome(numeric, right, { hintsUsed: 0, sawSolution: true })).toMatchObject({
      suggested: "saw_solution",
      solvedLock: "You saw the answer during this attempt.",
    });
  });

  it("grades open-ended answers by Claude or by the owner", () => {
    expect(isOpenEnded(open)).toBe(true);
    expect(puzzleOutcome(open, { answer: "x", tries: 0 }, clean).solvedLock).toMatch(/Grade/);
    const claudeRight = gradeFromClaude({
      correct: true,
      score: 0.9,
      feedback: "Good",
      idealReasoning: "…",
    });
    expect(puzzleOutcome(open, { answer: "x", tries: 0, grade: claudeRight }, clean)).toMatchObject(
      { suggested: "solved_alone", summary: "Claude marked it right." },
    );
    const partly = selfGrade("partly");
    expect(puzzleOutcome(open, { answer: "x", tries: 0, grade: partly }, clean)).toMatchObject({
      suggested: "solved_with_hints",
      aloneLock: "It was graded as partly right.",
    });
    const missed = selfGrade("missed");
    expect(puzzleOutcome(open, { answer: "x", tries: 0, grade: missed }, clean)).toMatchObject({
      suggested: "not_solved",
      solvedLock: "The grade says it isn't solved yet.",
    });
    // Claude says "correct" but with a low score: not a full solve.
    const lukewarm = gradeFromClaude({
      correct: true,
      score: 0.6,
      feedback: "",
      idealReasoning: "",
    });
    expect(puzzleOutcome(open, { answer: "x", tries: 0, grade: lukewarm }, clean).suggested).toBe(
      "solved_with_hints",
    );
  });
});

describe("the puzzle library", () => {
  const states: Record<string, ProblemState> = {
    "q-hh": { ...createProblemState("q-hh"), status: "solved" },
    "q-ht": { ...createProblemState("q-ht"), status: "attempted" },
    "q-monty": {
      ...createProblemState("q-monty"),
      status: "solved",
      srs: { step: 6, lapses: 0, soloStreak: 3, retired: true },
    },
  };
  const puzzles = allProblems(states).filter((p) => p.source === "quant");

  it("holds the whole quant bank", () => {
    expect(puzzles).toHaveLength(QUANT_PUZZLES.length);
  });

  it("filters by subject, topic, difficulty, status and kind", () => {
    const prob = filterPuzzles(puzzles, states, { topic: "prob" });
    expect(prob.length).toBeGreaterThan(20);
    expect(prob.every((p) => p.topicId!.startsWith("prob."))).toBe(true);
    const ev = filterPuzzles(puzzles, states, { topic: "prob.expected-value" });
    expect(ev.every((p) => p.topicId === "prob.expected-value")).toBe(true);
    expect(ev.map((p) => p.id)).toContain("q-hh");
    // "prob" must not match a topic that merely starts with the same letters.
    expect(filterPuzzles(puzzles, states, { topic: "pro" })).toHaveLength(0);
    const hard = filterPuzzles(puzzles, states, { difficulty: "hard" });
    expect(hard.every((p) => p.difficulty === "hard")).toBe(true);
    expect(filterPuzzles(puzzles, states, { status: "solved" }).map((p) => p.id)).toEqual(["q-hh"]);
    expect(filterPuzzles(puzzles, states, { status: "mastered" }).map((p) => p.id)).toEqual([
      "q-monty",
    ]);
    const open = filterPuzzles(puzzles, states, { kind: "open" });
    expect(open.map((p) => p.id)).toContain("q-ropes");
    expect(open.every((p) => p.answer === null)).toBe(true);
    expect(filterPuzzles(puzzles, states, { kind: "checked" }).length + open.length).toBe(
      puzzles.length,
    );
    const todo = filterPuzzles(puzzles, states, { status: "todo" });
    expect(todo).toHaveLength(puzzles.length - 3);
  });

  it("reads statuses like the problem library", () => {
    expect(puzzleStatus(undefined)).toBe("todo");
    expect(puzzleStatus(states["q-monty"])).toBe("mastered");
    expect(problemInfo("q-hh")?.source).toBe("quant");
  });
});
