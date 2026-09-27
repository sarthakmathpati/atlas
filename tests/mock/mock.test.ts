import { describe, expect, it } from "vitest";
import { BEHAVIORAL_QUESTIONS } from "@/data/behavioral.seed";
import { LEETCODE_PROBLEMS } from "@/data/problems.seed";
import { mockFeedbackPrompt, mockInterviewerPrompt, mockScriptPrompt } from "@/lib/ai/prompts";
import { mockFeedbackSchema } from "@/lib/ai/schemas";
import { mockBrief } from "@/lib/mock/brief";
import {
  currentPhase,
  feedbackMean,
  mockAttemptResult,
  mockDates,
  MOCK_TYPES,
  phaseNote,
  remainingMs,
  scoreTrend,
  stripNote,
  transcript,
  turnsToSend,
} from "@/lib/mock/mock";
import { pickBehavioralQuestions, pickMockProblem, pickTheorySubjects } from "@/lib/mock/pick";
import { allProblems } from "@/lib/problems/catalog";
import { demoSampleResponder } from "@/lib/runtime/fakeSampleDemo";
import { createProblemState } from "@/lib/storage/defaults";
import type { MockFeedback, MockSession } from "@/lib/types";

const env = { language: "C++", fence: "cpp" };

function session(extra: Partial<MockSession>): MockSession {
  return {
    id: "m1",
    kind: "dsa",
    turns: [],
    startedAt: "2026-09-27T10:00:00.000Z",
    updatedAt: "2026-09-27T10:00:00.000Z",
    ...extra,
  };
}

const feedback = (scores: Record<string, number>): MockFeedback => ({
  scores,
  strengths: [],
  improvements: [],
  hireSignal: "yes",
  summary: "",
});

describe("the four types", () => {
  it("have the F15 lengths, phases and rubrics", () => {
    expect(MOCK_TYPES.dsa.minutes).toBe(45);
    expect(MOCK_TYPES.theory.minutes).toBe(20);
    expect(MOCK_TYPES.design.minutes).toBe(45);
    expect(MOCK_TYPES.behavioral.minutes).toBe(20);
    expect(MOCK_TYPES.dsa.phases).toEqual([
      "Clarify",
      "Approach",
      "Code",
      "Test",
      "Complexity",
      "Follow-ups",
    ]);
    expect(MOCK_TYPES.dsa.scoreKeys).toEqual([
      "problemSolving",
      "communication",
      "codeQuality",
      "complexity",
      "edgeCases",
    ]);
    expect(MOCK_TYPES.design.scoreKeys).toEqual([
      "requirements",
      "highLevelDesign",
      "deepDive",
      "tradeOffs",
      "communication",
    ]);
    expect(MOCK_TYPES.behavioral.scoreKeys).toEqual([
      "structure",
      "specificity",
      "impact",
      "reflection",
      "communication",
    ]);
  });
});

describe("time and phase notes", () => {
  it("writes the note every candidate turn starts with, and strips it for display", () => {
    expect(phaseNote("Code", 18 * 60_000)).toBe("[Phase: Code | 18 min left]");
    expect(phaseNote("Code", 17 * 60_000 + 1)).toBe("[Phase: Code | 18 min left]");
    expect(phaseNote("Wrap-up", 0)).toBe("[Phase: Wrap-up | time is up]");
    expect(stripNote("[Phase: Code | 18 min left] Here's my loop.")).toBe("Here's my loop.");
    expect(stripNote("No note")).toBe("No note");
  });

  it("counts down from the type's length and knows the phase", () => {
    expect(remainingMs(session({}), 10 * 60_000)).toBe(35 * 60_000);
    expect(remainingMs(session({ kind: "theory" }), 25 * 60_000)).toBe(0);
    expect(currentPhase(session({}))).toBe("Clarify");
    expect(currentPhase(session({ phase: "Test" }))).toBe("Test");
    expect(currentPhase(session({ phase: "Nonsense" }))).toBe("Clarify");
  });
});

describe("turns and transcript", () => {
  it("merges repeated speakers and starts with the candidate", () => {
    expect(
      turnsToSend([
        { role: "assistant", content: "stray" },
        { role: "user", content: "a" },
        { role: "user", content: "b" },
        { role: "assistant", content: "" },
        { role: "assistant", content: "c" },
        { role: "user", content: "d" },
      ]),
    ).toEqual([
      { role: "user", content: "a\n\nb" },
      { role: "assistant", content: "c" },
      { role: "user", content: "d" },
    ]);
  });

  it("builds the transcript with the final code and design sections", () => {
    const t = transcript(
      session({
        turns: [
          { role: "user", content: "[Phase: Clarify | 45 min left] Hi" },
          { role: "assistant", content: "Hello" },
        ],
        code: "int main() {}",
        language: "cpp",
      }),
    );
    expect(t).toContain("Candidate: [Phase: Clarify | 45 min left] Hi");
    expect(t).toContain("Interviewer: Hello");
    expect(t).toContain("## Candidate's final code (cpp)");
    const d = transcript(session({ kind: "design", turns: [] }), { design: { API: "GET /x" } });
    expect(d).toContain("### API\nGET /x");
  });
});

describe("results", () => {
  it("averages the scores and maps problem solving to the attempt result", () => {
    expect(feedbackMean(feedback({ a: 4, b: 3, c: 5 }))).toBe(4);
    expect(mockAttemptResult(feedback({ problemSolving: 4, communication: 2 }))).toBe(
      "solved_alone",
    );
    expect(mockAttemptResult(feedback({ problemSolving: 3 }))).toBe("solved_with_hints");
    expect(mockAttemptResult(feedback({ problemSolving: 2 }))).toBe("not_solved");
  });

  it("lists the dates of finished mocks for the planner, and the score trend", () => {
    const done = session({
      endedAt: "2026-09-20T10:00:00.000Z",
      feedback: feedback({ problemSolving: 4, communication: 4 }),
    });
    const later = session({
      id: "m2",
      endedAt: "2026-09-25T10:00:00.000Z",
      feedback: feedback({ problemSolving: 2, communication: 4 }),
    });
    const open = session({ id: "m3" });
    expect(mockDates([done, later, open], (iso) => iso.slice(0, 10))).toEqual([
      "2026-09-20",
      "2026-09-25",
    ]);
    expect(scoreTrend([later, open, done], "dsa").map((r) => r.mean)).toEqual([4, 3]);
  });
});

describe("the interview brief", () => {
  it("never contains a LeetCode statement: Claude states the problem in its own words", () => {
    const brief = mockBrief({
      kind: "dsa",
      problem: {
        label: "LC 739 Daily Temperatures",
        difficulty: "medium",
        patterns: ["Monotonic stack"],
        leetcode: true,
      },
      language: "C++",
    });
    expect(brief).toContain("Describe the problem in your own words");
    expect(brief).toContain("don't name the pattern");
    expect(brief).not.toContain("hasn't written code");
    // The seed never stores statements for LeetCode problems.
    for (const p of LEETCODE_PROBLEMS) expect(p.prompt).toBeUndefined();
  });

  it("covers theory subjects, design prompts and behavioral questions", () => {
    expect(mockBrief({ kind: "theory", subjects: ["Operating systems"] })).toContain(
      "Subjects: Operating systems.",
    );
    const d = mockBrief({
      kind: "design",
      design: {
        title: "URL shortener",
        lld: false,
        prompt: "Design it.",
        rubric: ["IDs", "Cache"],
      },
    });
    expect(d).toContain("probe them if the candidate doesn't raise them: IDs; Cache");
    const b = mockBrief({ kind: "behavioral", questions: ["Tell me about yourself"] });
    expect(b).toContain("1. Tell me about yourself");
  });

  it("gives copy prompt mode a whole script ending in the feedback JSON", () => {
    const script = mockScriptPrompt(env, "dsa", "## Interview brief", 45);
    expect(script).toContain("The interview lasts 45 minutes");
    expect(script).toContain("When I write END");
    expect(script).toContain('"problemSolving": 1-5');
    expect(script).toContain("## Interview brief");
  });
});

describe("the stand-in interviewer", () => {
  it("opens, follows the phases, wraps up near time and writes valid feedback", () => {
    const ask = (last: string) => {
      const spec = mockInterviewerPrompt(env, "", "dsa", [{ role: "user", content: last }]);
      return demoSampleResponder([
        { role: "user", content: spec.instructions },
        ...(spec.input as { role: "user" | "assistant"; content: string }[]),
      ]);
    };
    expect(ask("[Phase: Clarify | 45 min left] Hello, I'm ready to begin.")).toMatch(/in my words/);
    expect(ask("[Phase: Complexity | 12 min left] O(n).")).toMatch(/space complexity/);
    expect(ask("[Phase: Follow-ups | 2 min left] Thanks.")).toMatch(/almost out of time/);
    const fb = mockFeedbackPrompt(env, "behavioral", "## Transcript");
    const reply = demoSampleResponder(`${fb.instructions}\n\n${fb.input as string}`);
    const parsed = mockFeedbackSchema.parse(JSON.parse(reply));
    expect(Object.keys(parsed.scores)).toEqual(MOCK_TYPES.behavioral.scoreKeys);
  });
});

describe("picking what the round is about", () => {
  const problems = allProblems({});

  it("picks an unsolved medium problem on the weakest pattern under way", () => {
    const patterns = [
      {
        id: "dsa.sliding-window.variable-size-window",
        status: "learning" as const,
        practice: 0.2,
        order: 1,
      },
      {
        id: "dsa.hashing.frequency-counting",
        status: "learning" as const,
        practice: 0.8,
        order: 0,
      },
      {
        id: "dsa.two-pointers.opposite-ends-pointers",
        status: "not_started" as const,
        practice: 0,
        order: 2,
      },
    ];
    const pick = pickMockProblem({ patterns, problems, states: {}, hidePremium: true, seed: "s" });
    expect(pick?.patternId).toBe("dsa.sliding-window.variable-size-window");
    const info = problems.find((p) => p.id === pick!.problemId)!;
    expect(info.conceptIds).toContain(pick!.patternId);
    expect(info.difficulty).toBe("medium");
    expect(info.premium).toBeFalsy();
    // Solved problems are skipped.
    const solved = {
      [pick!.problemId]: { ...createProblemState(pick!.problemId), status: "solved" as const },
    };
    const again = pickMockProblem({
      patterns,
      problems,
      states: solved,
      hidePremium: true,
      seed: "s",
    });
    expect(again?.problemId).not.toBe(pick!.problemId);
  });

  it("picks focus subjects first, then the weakest that count", () => {
    const readiness = [
      { subjectId: "os", readiness: 40, weight: 8 },
      { subjectId: "cn", readiness: 20, weight: 7 },
      { subjectId: "dsa", readiness: 5, weight: 34 },
      { subjectId: "prob", readiness: 1, weight: 0 },
    ];
    expect(pickTheorySubjects({ readiness, focus: [] })).toEqual(["cn", "os"]);
    expect(pickTheorySubjects({ readiness, focus: ["dbms"] })).toEqual(["dbms", "cn"]);
  });

  it("starts behavioral rounds with Tell me about yourself", () => {
    const qs = pickBehavioralQuestions(BEHAVIORAL_QUESTIONS, 7);
    expect(qs).toHaveLength(4);
    expect(qs[0]).toBe("bq-tell-me-about-yourself");
    expect(new Set(qs).size).toBe(4);
    expect(qs).not.toContain("bq-do-you-have-any-questions-for-us");
  });
});
