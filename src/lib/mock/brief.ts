// The interview brief (F15): what the interviewer needs to know for each type, sent with every
// turn as context (and inside the copy prompt script). For coding, Claude gets the problem's
// title and patterns and states it in its own words; the app never stores or shows a LeetCode
// statement.
import type { MockKind } from "./mock";
import { MOCK_TYPES } from "./mock";

export type MockBriefInput =
  | {
      kind: "dsa";
      problem: { label: string; difficulty: string; patterns: string[]; leetcode: boolean };
      language: string;
      code?: string;
    }
  | { kind: "theory"; subjects: string[] }
  | {
      kind: "design";
      design: { title: string; lld: boolean; prompt: string; rubric: string[] };
      sections?: Record<string, string>;
    }
  | { kind: "behavioral"; questions: string[] };

export function mockBrief(input: MockBriefInput): string {
  const t = MOCK_TYPES[input.kind as MockKind];
  const head = `## Interview brief\nType: ${t.label.toLowerCase()} (${t.minutes} minutes).`;
  switch (input.kind) {
    case "dsa": {
      const p = input.problem;
      const code = input.code?.trim();
      return [
        head,
        `Problem to give: ${p.label} (${p.difficulty})${p.leetcode ? ", a LeetCode problem" : ""}. Patterns it tests: ${p.patterns.join(", ") || "not tagged"}.`,
        "Describe the problem in your own words, the way an interviewer would, with one small example. Don't quote or claim to quote an official statement, and don't name the pattern.",
        `The candidate writes ${input.language} in an editor beside the chat; their current code comes with each message.`,
        input.code === undefined
          ? ""
          : code
            ? `## Candidate's code so far (${input.language})\n\n${code}`
            : "The candidate hasn't written code yet.",
      ]
        .filter(Boolean)
        .join("\n");
    }
    case "theory":
      return [
        head,
        `Subjects: ${input.subjects.join(", ")}.`,
        "Ask short interview questions across these subjects, one at a time. After each answer give one or two lines of feedback (what was right, what was missing), then the next question. Mix easy and harder ones: about 8 to 12 questions in 20 minutes.",
      ].join("\n");
    case "design": {
      const d = input.design;
      const sections = Object.entries(input.sections ?? {})
        .filter(([, v]) => v.trim())
        .map(([k, v]) => `### ${k}\n${v.trim()}`)
        .join("\n\n");
      return [
        head,
        `A ${d.lld ? "low-level (classes and code)" : "system"} design: ${d.title}.`,
        `The prompt, written for this app: ${d.prompt}`,
        `Points a strong answer covers; probe them if the candidate doesn't raise them: ${d.rubric.join("; ")}.`,
        "The candidate writes the design in a workspace with sections and a box-and-arrow sketch.",
        sections ? `## Candidate's design so far\n\n${sections}` : "The workspace is still empty.",
      ].join("\n");
    }
    case "behavioral":
      return [
        head,
        `Questions to ask, in order, as time allows:\n${input.questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`,
        "Probe like a real interviewer: what exactly did you do, what was the result in numbers, what would you change. About 3 or 4 questions in 20 minutes.",
      ].join("\n");
  }
}
