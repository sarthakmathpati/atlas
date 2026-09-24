// A complete, realistic set of user data touching every table and every optional field, used by
// the storage round-trip and merge tests.
import { createDefaultProfile } from "@/lib/storage/defaults";
import type { AtlasExport, ExportData } from "@/lib/storage/schemas";
import type { Attempt, ProblemState } from "@/lib/types";

export const T0 = "2026-09-01T10:00:00.000Z";
export const T1 = "2026-09-10T10:00:00.000Z";
export const T2 = "2026-09-20T10:00:00.000Z";

export function makeAttempt(
  problemId: string,
  n: number,
  overrides: Partial<Attempt> = {},
): Attempt {
  const day = String(1 + (n % 28)).padStart(2, "0");
  return {
    id: `${problemId}-a${n}`,
    problemId,
    startedAt: `2026-08-${day}T09:${String(n % 60).padStart(2, "0")}:00.000Z`,
    finishedAt: `2026-08-${day}T09:59:00.000Z`,
    minutes: 20 + n,
    language: "cpp",
    code: `class Solution {\n public:\n  int solve() { return ${n}; }\n};\n`,
    result: n % 2 === 0 ? "solved_alone" : "solved_with_hints",
    hintsUsed: (n % 2) as 0 | 1,
    mistakeTagIds: n % 3 === 0 ? ["mt-off-by-one"] : [],
    mode: "normal",
    ...overrides,
  };
}

export function makeProblem(problemId: string, attempts: number, updatedAt = T1): ProblemState {
  return {
    problemId,
    status: attempts > 0 ? "solved" : "todo",
    insight: "Store what you've seen in a hash map.",
    summary: "Find two indices whose values add up to a target.",
    myNotes: "One pass with a map from value to index.",
    starred: true,
    tags: ["google", "warm-up"],
    srs: { step: 2, dueAt: "2026-09-25", lastReviewedAt: T1, lapses: 1, soloStreak: 1 },
    inReview: attempts > 0,
    attempts: Array.from({ length: attempts }, (_, i) => makeAttempt(problemId, i)),
    updatedAt,
  };
}

export function fullFixture(): ExportData {
  const profile = {
    ...createDefaultProfile(new Date(T0)),
    name: "Sam",
    track: "sde" as const,
    interviewDate: "2026-11-15",
  };
  const reviewed = makeProblem("lc-1", 3);
  reviewed.attempts[2] = {
    ...reviewed.attempts[2]!,
    approach: "Hash map of complements.",
    timeComplexity: "O(n)",
    spaceComplexity: "O(n)",
    review: {
      verdict: "correct",
      correctnessConcerns: [{ line: 4, issue: "Returns an empty vector when no pair exists." }],
      timeComplexity: "O(n)",
      spaceComplexity: "O(n)",
      isOptimal: true,
      optimalComplexity: "O(n)",
      edgeCasesMissed: ["Duplicate values"],
      betterApproach: "",
      codeQuality: ["Name the map by what it stores."],
      suggestedInsight: "Look up target minus x before inserting x.",
      suggestedMistakeTags: ["Duplicates not handled"],
    },
    dryRuns: [{ input: "[2,7,11,15], 9", output: "[0,1]", createdAt: T1 }],
  };
  reviewed.draft = { language: "python", code: "def f():\n    pass\n", updatedAt: T2 };
  reviewed.hints = [
    { level: 1, text: "What would you need to remember as you scan?", createdAt: T1 },
  ];

  return {
    profile,
    conceptStates: [
      {
        conceptId: "dsa.hashing.complement-lookup",
        status: "strong",
        everStrong: true,
        strongSince: T1,
        studied: true,
        lastLevelOpened: "interview",
        knowledge: 0.9,
        srs: { step: 2, dueAt: "2026-10-02", lastReviewedAt: T1, lapses: 0, soloStreak: 0 },
        firstActivityAt: T0,
        lastActivityAt: T1,
        updatedAt: T1,
      },
      {
        conceptId: "os.deadlocks.deadlock-conditions",
        status: "learning",
        manualStatus: "learning",
        neverFade: true,
        hidden: false,
        everStrong: false,
        studied: false,
        selfAssessed: 0.3,
        knowledge: 0.3,
        srs: { step: 0, lapses: 0, soloStreak: 0 },
        updatedAt: T0,
      },
      {
        conceptId: "custom.abc123",
        status: "not_started",
        everStrong: false,
        studied: false,
        knowledge: 0,
        srs: { step: 0, lapses: 0, soloStreak: 0 },
        updatedAt: T0,
      },
    ],
    conceptNotes: [
      {
        conceptId: "dsa.graph-basics.bfs",
        markdown: "# BFS\n\nRings of ripples. $O(V + E)$.",
        savedAnswers: [
          {
            id: "sa1",
            question: "Why a queue?",
            answer: "FIFO keeps levels in order.",
            createdAt: T0,
            source: "sample",
          },
        ],
        generated: {
          simple: "BFS explores in rings.",
          interview: ["Uses a queue."],
          questions: [{ q: "Q?", a: "A." }],
          createdAt: T0,
        },
        updatedAt: T1,
      },
    ],
    problemStates: [
      reviewed,
      makeProblem("lc-146", 0, T0),
      {
        ...makeProblem("custom-Xy_9-k", 1),
        custom: {
          title: "Rotate a ring buffer",
          url: "https://example.com/problem",
          difficulty: "medium",
          source: "custom",
          topicId: "dsa.arrays",
          conceptIds: ["dsa.arrays.in-place-array-tricks"],
          prompt: "My own summary.",
        },
        urlOverride: "https://leetcode.com/problems/two-sum/",
      },
    ],
    mistakeTags: [
      {
        id: "mt-off-by-one",
        label: "Off-by-one",
        category: "logic",
        custom: false,
        howToAvoid: "Check bounds.",
        updatedAt: T0,
      },
      {
        id: "mt-custom-1",
        label: "Forgot modulo",
        category: "language",
        custom: true,
        description: "1e9+7",
        archived: true,
        updatedAt: T1,
      },
    ],
    checks: [
      {
        id: "c1",
        conceptId: "dsa.hashing.complement-lookup",
        kind: "quiz",
        score: 0.8,
        detail: { answers: [1, 2, 0] },
        createdAt: T1,
        updatedAt: T1,
      },
      {
        id: "c2",
        conceptId: "os.deadlocks.deadlock-conditions",
        kind: "flashcard",
        score: 0.4,
        createdAt: T0,
        updatedAt: T0,
      },
      {
        id: "c3",
        conceptId: "dsa.sliding-window.variable-size-window",
        kind: "drill",
        score: 1,
        detail: {
          promptId: "d1",
          correctConceptIds: ["x"],
          pickedConceptIds: ["x"],
          correct: true,
        },
        createdAt: T2,
        updatedAt: T2,
      },
    ],
    dayPlans: [
      {
        date: "2026-09-20",
        budgetMinutes: 60,
        minimumDay: false,
        items: [
          {
            id: "p1",
            kind: "resolve",
            refId: "lc-1",
            title: "Re-solve: Two Sum",
            reason: "Due for review.",
            estMinutes: 15,
            done: true,
            skipped: false,
          },
          {
            id: "p2",
            kind: "review-concept",
            refIds: ["os.deadlocks.deadlock-conditions"],
            title: "Flashcards",
            reason: "Fading.",
            estMinutes: 10,
            done: false,
            skipped: true,
          },
        ],
        generatedAt: T2,
        updatedAt: T2,
      },
    ],
    activity: [
      {
        month: "2026-09",
        days: {
          "2026-09-01": { minutes: 45, problemsSolved: 1, reviews: 2, conceptsTouched: 3 },
          "2026-09-20": { minutes: 60, problemsSolved: 2, reviews: 1, conceptsTouched: 1 },
        },
        streakFreezeUsed: ["2026-09-05"],
        updatedAt: T2,
      },
    ],
    mocks: [
      {
        id: "m1",
        kind: "dsa",
        topicOrProblemId: "lc-1",
        turns: [
          { role: "assistant", content: "Tell me your approach." },
          { role: "user", content: "A hash map." },
        ],
        code: "int main() {}",
        feedback: {
          scores: {
            problemSolving: 4,
            communication: 3,
            codeQuality: 4,
            complexity: 5,
            edgeCases: 3,
          },
          strengths: ["Clear approach"],
          improvements: ["Test earlier"],
          hireSignal: "yes",
          summary: "Solid.",
        },
        phase: "Complexity",
        startedAt: T1,
        endedAt: T1,
        updatedAt: T1,
      },
    ],
    designs: [
      {
        id: "d1",
        problemId: "hld-url-shortener",
        sections: { requirements: "100M links a month", diagram: "Client -> API : HTTPS" },
        review: { overall: 4 },
        createdAt: T0,
        updatedAt: T1,
      },
    ],
    stories: [
      {
        id: "s1",
        title: "The migration",
        situation: "Legacy DB",
        task: "Move it",
        action: "Planned phases",
        result: "Zero downtime",
        tags: ["ownership"],
        questionIds: ["bq-a-time-you-took-ownership-beyond-your-role"],
        practice: [
          {
            questionId: "bq-your-most-challenging-project",
            answer: "…",
            critique: { clarity: 4 },
            createdAt: T1,
          },
        ],
        updatedAt: T1,
      },
    ],
    mentalMath: [
      {
        id: "mm1",
        mode: "speed",
        correct: 70,
        total: 80,
        seconds: 480,
        createdAt: T1,
        updatedAt: T1,
      },
    ],
    mapOverrides: [{ nodeId: "dsa.graph-basics.bfs", x: 120.5, y: -40, updatedAt: T1 }],
    customConcepts: [
      {
        id: "custom.abc123",
        topicId: "dsa.arrays",
        name: "Ring buffers",
        scope: "wrap-around indexing",
        importance: "important",
        createdAt: T0,
        updatedAt: T0,
      },
    ],
    generatedDrills: [
      {
        id: "g1",
        text: "A bakery tracks sales each hour. Find the longest run where sales stayed under 50.",
        answerConceptIds: ["dsa.sliding-window.variable-size-window"],
        keyInsight: "Shrink from the left when the condition breaks.",
        difficulty: "easy",
        createdAt: T1,
        updatedAt: T1,
      },
    ],
  };
}

export function asBackup(data: ExportData): AtlasExport {
  return { app: "Atlas", schemaVersion: 1, exportedAt: T2, data };
}
