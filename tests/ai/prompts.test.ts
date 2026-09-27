// The context builder (BUILD_SPEC.md 10.3) and the prompt library (10.4): block formats, the
// 48 KiB budget with its trimming order, and every prompt's preamble, language, tier and schema.
import { describe, expect, it } from "vitest";
import { z } from "zod";
import {
  byteLength,
  clipMiddle,
  codeBlock,
  conceptBlock,
  fitToBudget,
  learnerBlock,
  notesBlock,
  PROMPT_BUDGET_BYTES,
  problemBlock,
  type ContextBlock,
} from "@/lib/ai/context";
import {
  chatPrompt,
  codeReviewPrompt,
  conceptSuggestPrompt,
  designReviewPrompt,
  drillGeneratePrompt,
  drillGradePrompt,
  dryRunPrompt,
  explainConceptPrompt,
  explainGradePrompt,
  fullSolutionPrompt,
  generateContentPrompt,
  hintPrompt,
  mistakeAdvicePrompt,
  mockFeedbackPrompt,
  mockInterviewerPrompt,
  parseWeeklyReflection,
  preamble,
  puzzleGradePrompt,
  quizGradePrompt,
  quizPrompt,
  revisionTightenPrompt,
  storyCritiquePrompt,
  testConnectionPrompt,
  weeklyReflectionPrompt,
  type PromptEnv,
  type PromptSpec,
} from "@/lib/ai/prompts";
import {
  codeReviewSchema,
  explainGradeSchema,
  quizSchema,
  shortAnswerGradesSchema,
} from "@/lib/ai/schemas";
import { fitPrompt } from "@/features/ai/gather";

const cpp: PromptEnv = { language: "C++", fence: "cpp" };
const ctx = "## Learner\nTrack: SDE | Primary language: C++";

describe("context blocks", () => {
  it("formats the learner with at most 15 strong concepts and 5 mistakes", () => {
    const text = learnerBlock({
      track: "sde",
      language: "C++",
      daysToInterview: 41,
      strongConcepts: Array.from({ length: 20 }, (_, i) => `C${i}`),
      frequentMistakes: ["Off-by-one", "Empty input", "Overflow", "A", "B", "C", "D"],
    });
    expect(text).toContain("## Learner");
    expect(text).toContain("Track: SDE | Primary language: C++ | Interview in 41 days");
    expect(text).toContain("C14");
    expect(text).not.toContain("C15");
    expect(text).toContain("Frequent mistakes: Off-by-one, Empty input, Overflow, A, B");
    expect(text).not.toContain(", C,");
    const none = learnerBlock({
      track: "both",
      language: "C++",
      strongConcepts: [],
      frequentMistakes: [],
    });
    expect(none).toContain("none yet");
  });

  it("formats a concept and a problem with trimmed text", () => {
    const text = conceptBlock({
      name: "Dijkstra's algorithm",
      subjectName: "DSA",
      topicName: "Shortest paths",
      importance: "must",
      status: "Learning",
      scope: "min-heap, non-negative weights",
      simple: "x ".repeat(1000),
      interview: ["Uses a min-heap."],
    });
    expect(text).toContain(
      "Name: Dijkstra's algorithm (DSA › Shortest paths) | Importance: must | Status: Learning",
    );
    expect(text.length).toBeLessThan(1200);
    const problem = problemBlock({
      label: "LC 743 Network Delay Time",
      difficulty: "medium",
      patterns: ["Dijkstra's algorithm"],
      summary: "Signal from k to all nodes.",
    });
    expect(problem).toContain(
      "LC 743 Network Delay Time (medium) | Patterns: Dijkstra's algorithm",
    );
  });

  it("keeps the start and end of long code", () => {
    const code = `START${"x".repeat(20_000)}END`;
    const clipped = clipMiddle(code, 1000);
    expect(clipped.startsWith("START")).toBe(true);
    expect(clipped.endsWith("END")).toBe(true);
    expect(clipped).toMatch(/characters left out/);
    expect(codeBlock("C++", "cpp", code)).toContain("```cpp");
  });

  it("trims older turns first, then notes, then code, never the instructions or the request", () => {
    const instructions = "I".repeat(4000);
    const ask = "Explain this.";
    const blocks: ContextBlock[] = [
      { kind: "learner", text: "## Learner\nTrack: SDE" },
      {
        kind: "notes",
        text: notesBlock("Notes", "n ".repeat(20_000), 40_000),
        shrink: (m) => notesBlock("Notes", "n ".repeat(20_000), m),
      },
      {
        kind: "code",
        text: codeBlock("C++", "cpp", "c".repeat(12_000)),
        shrink: (m) => codeBlock("C++", "cpp", "c".repeat(12_000), m),
      },
    ];
    const turns = Array.from({ length: 10 }, (_, i) => ({
      role: (i % 2 === 0 ? "user" : "assistant") as "user" | "assistant",
      content: `turn ${i} ${"t".repeat(2000)}`,
    }));
    turns.push({ role: "user", content: "the new question" });
    const fit = fitToBudget({ instructions, blocks, ask, turns });
    expect(fit.bytes).toBeLessThanOrEqual(PROMPT_BUDGET_BYTES);
    expect(fit.trimmed).toBe(true);
    // Every older turn went first; the newest message survives. Then the notes were cut, and
    // that was enough, so the code is whole.
    expect(fit.turns).toEqual([{ role: "user", content: "the new question" }]);
    const notesLen = fit.context.split("## Learner's code")[0]!.length;
    expect(notesLen).toBeLessThan(5000);
    expect(fit.context).toContain("c".repeat(12_000));

    // Without chat turns, a huge code block alone is cut to fit.
    const big = fitToBudget({
      instructions,
      ask,
      blocks: [
        {
          kind: "code",
          text: codeBlock("C++", "cpp", "c".repeat(200_000), 200_000),
          shrink: (m) => codeBlock("C++", "cpp", "c".repeat(200_000), m),
        },
      ],
    });
    expect(big.bytes).toBeLessThanOrEqual(PROMPT_BUDGET_BYTES);
  });

  it("fits a whole prompt under 48 KiB without touching its instructions", () => {
    const blocks: ContextBlock[] = [
      {
        kind: "code",
        text: codeBlock("C++", "cpp", "c".repeat(60_000), 60_000),
        shrink: (m) => codeBlock("C++", "cpp", "c".repeat(60_000), m),
      },
    ];
    const { spec, trimmed } = fitPrompt(blocks, (context) => hintPrompt(cpp, context, 2));
    expect(trimmed).toBe(true);
    expect(spec.instructions).toBe(hintPrompt(cpp, "", 2).instructions);
    expect(byteLength(spec.instructions) + byteLength(String(spec.input))).toBeLessThanOrEqual(
      PROMPT_BUDGET_BYTES,
    );
  });
});

type Case = [string, PromptSpec, PromptSpec["tier"], boolean];

describe("prompt library", () => {
  const cases: Case[] = [
    ["1 explain (simple)", explainConceptPrompt(cpp, ctx, "BFS", "simple"), "default", false],
    ["1 explain (deep)", explainConceptPrompt(cpp, ctx, "BFS", "deep"), "complex", false],
    ["2 generate content", generateContentPrompt(cpp, ctx, "Euler tour", false), "complex", true],
    ["3 hint", hintPrompt(cpp, ctx, 1), "default", false],
    ["4 code review", codeReviewPrompt(cpp, ctx, { tags: ["Off-by-one"] }), "default", true],
    ["5 dry run", dryRunPrompt(cpp, ctx, {}), "default", false],
    [
      "6 explain grade",
      explainGradePrompt(cpp, ctx, {
        concept: "BFS",
        points: ["Queue"],
        explanation: "It uses a queue.",
      }),
      "default",
      true,
    ],
    [
      "7 quiz",
      quizPrompt(cpp, ctx, { scope: "BFS", concepts: [{ id: "dsa.x", name: "BFS" }] }),
      "default",
      true,
    ],
    [
      "7 quiz grade",
      quizGradePrompt(cpp, [{ index: 0, question: "Q", modelAnswer: "A", answer: "A" }]),
      "quick",
      true,
    ],
    [
      "8 drill grade",
      drillGradePrompt(cpp, {
        prompt: "P",
        correct: ["Two pointers"],
        picked: ["Two pointers"],
        approach: "",
        keyInsight: "K",
      }),
      "quick",
      true,
    ],
    [
      "9 drill generate",
      drillGeneratePrompt(cpp, { patterns: [{ id: "dsa.x", name: "X" }], focus: ["X"] }),
      "default",
      true,
    ],
    [
      "10 mock",
      mockInterviewerPrompt(cpp, ctx, "dsa", [{ role: "user", content: "Hi" }]),
      "default",
      false,
    ],
    ["11 mock feedback", mockFeedbackPrompt(cpp, "dsa", "transcript"), "complex", true],
    [
      "12 design review",
      designReviewPrompt(cpp, { prompt: "P", rubric: ["R"], sections: { api: "GET /x" } }),
      "complex",
      true,
    ],
    [
      "13 story critique",
      storyCritiquePrompt(cpp, { title: "T", situation: "S", task: "T", action: "A", result: "R" }),
      "default",
      true,
    ],
    [
      "14 weekly reflection",
      weeklyReflectionPrompt(cpp, "summary", [{ id: "dsa", name: "DSA" }]),
      "default",
      false,
    ],
    ["15 revision tighten", revisionTightenPrompt(cpp, "sheet", 500), "complex", false],
    ["16 puzzle grade", puzzleGradePrompt(cpp, { prompt: "P", answer: "A" }), "default", true],
    [
      "17 concept suggest",
      conceptSuggestPrompt(cpp, { title: "T", allowed: [{ id: "dsa.x", name: "X" }] }),
      "quick",
      true,
    ],
    [
      "18 mistake advice",
      mistakeAdvicePrompt(cpp, [{ label: "Off-by-one", category: "edge-case" }]),
      "quick",
      true,
    ],
    ["19 full solution", fullSolutionPrompt(cpp, ctx), "default", false],
    ["chat", chatPrompt(cpp, ctx, [{ role: "user", content: "Hi" }]), "default", false],
  ];

  it.each(cases)("%s: preamble, language, tier and JSON shape", (_name, spec, tier, json) => {
    expect(spec.instructions.startsWith(preamble(cpp))).toBe(true);
    expect(spec.instructions).toContain("The learner's primary language is C++");
    expect(spec.tier).toBe(tier);
    expect(Boolean(spec.json)).toBe(json);
    if (json)
      expect(spec.instructions).toMatch(
        /Reply with only JSON matching this shape|on the very last line/,
      );
    const input =
      typeof spec.input === "string" ? spec.input : spec.input.map((t) => t.content).join("\n");
    expect(input.trim().length).toBeGreaterThan(0);
  });

  it("uses the owner's language in the preamble", () => {
    const java = hintPrompt({ language: "Java", fence: "java" }, ctx, 2);
    expect(java.instructions).toContain("Write every code example in Java");
  });

  it("keeps hint level 1 from naming the technique and level 3 free of real code", () => {
    expect(hintPrompt(cpp, ctx, 1).instructions).toMatch(/Give ONLY hint level 1/);
    expect(hintPrompt(cpp, ctx, 1).instructions).toMatch(/do not name the technique/);
    expect(hintPrompt(cpp, ctx, 3).instructions).toMatch(/no real code in any language/);
  });

  it("gives the review the owner's tag list and the dry run its input", () => {
    const review = codeReviewPrompt(cpp, ctx, {
      tags: ["Off-by-one", "Empty input"],
      claimedTime: "O(n)",
    });
    expect(review.instructions).toContain("Mistake tags to choose from: Off-by-one; Empty input");
    expect(String(review.input)).toContain("time O(n)");
    expect(dryRunPrompt(cpp, ctx, { input: "[1,2,3]", expected: "6" }).instructions).toContain(
      "on this input: [1,2,3]",
    );
    expect(dryRunPrompt(cpp, ctx, {}).instructions).toContain("choose a small, revealing input");
  });

  it("includes a follow-up answer when regrading an explanation", () => {
    const spec = explainGradePrompt(cpp, ctx, {
      concept: "BFS",
      points: ["Queue"],
      explanation: "Levels.",
      followUp: { question: "Why a queue?", answer: "FIFO keeps levels in order." },
    });
    expect(String(spec.input)).toContain("You then asked: Why a queue?");
  });

  it("uses the schemas from lib/ai/schemas", () => {
    expect(codeReviewPrompt(cpp, ctx, { tags: [] }).json).toBe(codeReviewSchema);
    expect(explainGradePrompt(cpp, ctx, { concept: "B", points: [], explanation: "e" }).json).toBe(
      explainGradeSchema,
    );
    expect(quizPrompt(cpp, ctx, { scope: "B", concepts: [] }).json).toBe(quizSchema);
    expect(quizGradePrompt(cpp, []).json).toBe(shortAnswerGradesSchema);
  });

  it("uses small output budgets for the connection test", () => {
    expect(testConnectionPrompt("quick")).toMatchObject({
      task: "test-connection",
      tier: "quick",
      maxTokens: 16,
    });
  });

  it("splits a weekly reflection from its last-line JSON", () => {
    const parsed = parseWeeklyReflection(
      'A calm week.\n\nKeep going.\n{"focusSubjects": ["os", "zzz", "dsa"]}',
      new Set(["os", "dsa"]),
    );
    expect(parsed).toEqual({
      markdown: "A calm week.\n\nKeep going.",
      focusSubjects: ["os", "dsa"],
    });
    expect(parseWeeklyReflection("No JSON.", new Set()).focusSubjects).toEqual([]);
  });

  it("accepts realistic replies for each JSON schema", () => {
    expect(
      codeReviewSchema.parse({
        verdict: "has bugs",
        correctnessConcerns: [{ line: 4, issue: "Reads past the end." }],
        timeComplexity: "O(n)",
        spaceComplexity: "O(1)",
        isOptimal: true,
        suggestedMistakeTags: ["Off-by-one"],
      }).edgeCasesMissed,
    ).toEqual([]);
    expect(
      z.array(z.unknown()).parse(
        quizSchema.parse([
          {
            type: "mcq",
            question: "Q",
            options: ["a", "b"],
            answerIndex: 1,
            explanation: "E",
            conceptId: "c",
          },
        ]),
      ),
    ).toHaveLength(1);
  });
});
