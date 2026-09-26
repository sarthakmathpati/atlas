// Pure helpers behind the Claude features: pattern drill judging and statistics (F10, 11.6),
// quick quiz cleanup and scoring (F14), review tag matching (F12) and Claude-written study text
// for the owner's own concepts (F3).
import { describe, expect, it } from "vitest";
import { conceptById, patternConcepts } from "@/data/syllabus";
import { DRILL_PROMPTS } from "@/data/drills.seed";
import { studyContent } from "@/lib/concepts/custom";
import {
  confusionPairs,
  hashSeed,
  judge,
  patternAccuracy,
  pickSession,
  solvedProblemPrompts,
  validGeneratedPrompts,
  weakestPatterns,
  type DrillDetail,
  type DrillItem,
} from "@/lib/drill/drill";
import { matchTags } from "@/lib/mistakes/match";
import { cleanQuiz, quizChecks, scoreQuiz } from "@/lib/review/quiz";
import type { Check, MistakeTag, ProblemState } from "@/lib/types";
import type { QuizQuestion } from "@/lib/ai/schemas";

const topicOf = (id: string) => conceptById.get(id)?.topicId;
const sliding = patternConcepts.find((c) => c.id.includes("sliding-window"))!;
const sameTopic = patternConcepts.find(
  (c) => c.topicId === sliding.topicId && c.id !== sliding.id,
)!;
const other = patternConcepts.find((c) => c.topicId !== sliding.topicId)!;

function drillCheck(detail: Partial<DrillDetail>, date = "2026-09-20T10:00:00.000Z"): Check {
  const full: DrillDetail = {
    promptId: "p",
    correctConceptIds: [sliding.id],
    pickedConceptIds: [],
    correct: false,
    result: "wrong",
    source: "bank",
    ...detail,
  };
  return {
    id: Math.random().toString(36).slice(2),
    conceptId: full.correctConceptIds[0]!,
    kind: "drill",
    score: full.correct ? 1 : 0,
    detail: full,
    createdAt: date,
    updatedAt: date,
  };
}

describe("pattern drill", () => {
  it("judges an answer correct, close (same topic) or wrong", () => {
    expect(judge([sliding.id], [sliding.id], topicOf)).toBe("correct");
    expect(judge([other.id, sliding.id], [sliding.id], topicOf)).toBe("correct");
    expect(judge([sameTopic.id], [sliding.id], topicOf)).toBe("partial");
    expect(judge([other.id], [sliding.id], topicOf)).toBe("wrong");
    expect(judge([], [sliding.id], topicOf)).toBe("wrong");
  });

  it("picks a session of the asked length, unseen prompts first, one per pattern when it can", () => {
    const bank: DrillItem[] = DRILL_PROMPTS.map((p) => ({ ...p, source: "bank" }));
    const recent = new Set(bank.slice(0, 200).map((p) => p.id));
    const session = pickSession(bank, { count: 5, recent, seed: hashSeed("2026-09-26|0") });
    expect(session).toHaveLength(5);
    expect(session.every((p) => !recent.has(p.id))).toBe(true);
    expect(new Set(session.map((p) => p.answerConceptIds[0])).size).toBe(5);
    // The same seed gives the same session; the size is clamped to 3..10.
    expect(pickSession(bank, { count: 5, recent, seed: hashSeed("2026-09-26|0") })).toEqual(
      session,
    );
    expect(pickSession(bank, { count: 99, recent: new Set(), seed: 1 })).toHaveLength(10);
    expect(pickSession(bank, { count: 1, recent: new Set(), seed: 1 })).toHaveLength(3);
  });

  it("puts the weakest patterns first when asked", () => {
    const bank: DrillItem[] = DRILL_PROMPTS.map((p) => ({ ...p, source: "bank" }));
    const weak = bank[0]!.answerConceptIds[0]!;
    const accuracy = new Map(bank.map((p) => [p.answerConceptIds[0]!, 0.9]));
    accuracy.set(weak, 0);
    const session = pickSession(bank, {
      count: 3,
      recent: new Set(),
      accuracy,
      focusWeak: true,
      seed: 7,
    });
    expect(session[0]!.answerConceptIds[0]).toBe(weak);
  });

  it("computes accuracy per pattern over 60 days and confusion pairs seen at least twice", () => {
    const checks = [
      drillCheck({ correct: true, result: "correct", pickedConceptIds: [sliding.id] }),
      drillCheck({ pickedConceptIds: [other.id] }),
      drillCheck({ pickedConceptIds: [other.id] }),
      drillCheck({ pickedConceptIds: [sameTopic.id], result: "partial" }),
      // Older than 60 days: left out.
      drillCheck({ pickedConceptIds: [other.id] }, "2026-06-01T10:00:00.000Z"),
    ];
    const acc = patternAccuracy(checks, "2026-09-26");
    expect(acc).toEqual([{ conceptId: sliding.id, correct: 1, total: 4, accuracy: 0.25 }]);
    expect(confusionPairs(checks, "2026-09-26")).toEqual([
      { picked: other.id, correct: sliding.id, count: 2 },
    ]);
    expect(weakestPatterns(acc, [sliding.id, other.id, sameTopic.id], 2)).toEqual([
      sliding.id,
      other.id,
    ]);
  });

  it("keeps only generated prompts whose answers are known patterns", () => {
    const ids = new Set(patternConcepts.map((c) => c.id));
    const kept = validGeneratedPrompts(
      [
        {
          text: "A long enough original prompt about a queue of people.",
          answerConceptIds: [sliding.id],
        },
        {
          text: "Another long enough original prompt about lamps.",
          answerConceptIds: ["dsa.made-up"],
        },
        { text: "Too short.", answerConceptIds: [sliding.id] },
      ],
      ids,
    );
    expect(kept).toHaveLength(1);
  });

  it("turns solved problems with patterns into recall prompts", () => {
    const state = {
      problemId: "lc-3",
      status: "solved",
      summary: "Longest run without repeats.",
      insight: "Move the left edge past the repeat.",
    } as ProblemState;
    const prompts = solvedProblemPrompts(
      { "lc-3": state, "lc-4": { ...state, problemId: "lc-4", status: "attempted" } },
      () => ({
        title: "Longest Substring Without Repeating Characters",
        conceptIds: [sliding.id],
        difficulty: "medium",
      }),
    );
    expect(prompts).toHaveLength(1);
    expect(prompts[0]).toMatchObject({
      id: "solved-lc-3",
      answerConceptIds: [sliding.id],
      keyInsight: "Move the left edge past the repeat.",
      source: "solved",
    });
    expect(prompts[0]!.text).toContain("Longest run without repeats.");
  });
});

describe("quick quiz", () => {
  const questions: QuizQuestion[] = [
    {
      type: "mcq",
      question: "Q1",
      options: ["a", "b", "c"],
      answerIndex: 1,
      explanation: "",
      conceptId: "c1",
    },
    {
      type: "mcq",
      question: "Bad index",
      options: ["a", "b"],
      answerIndex: 5,
      explanation: "",
      conceptId: "c1",
    },
    {
      type: "mcq",
      question: "Duplicate options",
      options: ["a", "a"],
      answerIndex: 0,
      explanation: "",
      conceptId: "c1",
    },
    {
      type: "short",
      question: "Q2",
      modelAnswer: "Because",
      explanation: "",
      conceptId: "unknown",
    },
    { type: "short", question: "Q3", modelAnswer: "Yes", explanation: "", conceptId: "c2" },
  ];

  it("drops questions it can't grade and maps unknown concepts to the first one", () => {
    const clean = cleanQuiz(questions, ["c1", "c2"]);
    expect(clean.map((q) => q.question)).toEqual(["Q1", "Q2", "Q3"]);
    expect(clean[1]!.conceptId).toBe("c1");
  });

  it("marks multiple choice at once, short answers from grades, and averages per concept", () => {
    const clean = cleanQuiz(questions, ["c1", "c2"]);
    const results = scoreQuiz(
      clean,
      [{ choice: 1 }, { text: "because it is" }, { text: "" }],
      [{ index: 1, score: 0.5, feedback: "Half right." }],
    );
    expect(results.map((r) => r.score)).toEqual([1, 0.5, 0]);
    expect(results[2]!.feedback).toBe("No answer given.");
    expect(quizChecks(results)).toEqual([
      { conceptId: "c1", score: 0.75, count: 2 },
      { conceptId: "c2", score: 0, count: 1 },
    ]);
  });
});

describe("review tags and Claude-written study text", () => {
  it("matches suggested tag labels to live tags, ignoring case and punctuation", () => {
    const tags: Record<string, MistakeTag> = {
      "mt-off-by-one": {
        id: "mt-off-by-one",
        label: "Off-by-one",
        category: "edge-case",
        custom: false,
        updatedAt: "",
      },
      "mt-old": {
        id: "mt-old",
        label: "Old tag",
        category: "other",
        custom: true,
        archived: true,
        updatedAt: "",
      },
    };
    const matched = matchTags(["off by one", "Old tag", "Something else"], tags);
    expect(matched.map((m) => m.tag?.id)).toEqual(["mt-off-by-one", undefined, undefined]);
  });

  it("uses what Claude wrote only when nothing is written", () => {
    const empty = { simple: "", interview: [], questions: [] };
    const generated = {
      simple: "S",
      interview: ["I"],
      questions: [{ q: "Q", a: "A" }],
      createdAt: "",
    };
    expect(studyContent(empty, generated)).toMatchObject({ simple: "S", interview: ["I"] });
    const written = { simple: "Written", interview: ["W"], questions: [] };
    expect(studyContent(written, generated)).toBe(written);
    expect(studyContent(empty, undefined)).toBe(empty);
  });
});
