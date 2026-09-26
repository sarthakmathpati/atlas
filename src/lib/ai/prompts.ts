// The prompt library (BUILD_SPEC.md 10.4): one function per prompt, each returning the task,
// instructions, input, tier and (for JSON tasks) the zod schema its reply must match. Every set of
// instructions starts with the shared preamble; code is written in the learner's main language
// (C++ by default, CLAUDE.md decision 58). Context blocks come from lib/ai/context.ts.
import type { ZodType } from "zod";
import type { Tier } from "@/lib/types";
import type { AITask, ChatTurn } from "./AIProvider";
import { jsonInstruction } from "./json";
import {
  codeReviewSchema,
  conceptSuggestionSchema,
  designReviewSchema,
  drillGenerationSchema,
  drillGradeSchema,
  explainGradeSchema,
  generatedContentSchema,
  mistakeAdviceSchema,
  mockFeedbackSchema,
  puzzleGradeSchema,
  quizSchema,
  shortAnswerGradesSchema,
  storyCritiqueSchema,
  weeklyFocusSchema,
} from "./schemas";

export interface PromptSpec<T = unknown> {
  task: AITask;
  instructions: string;
  input: string | ChatTurn[];
  tier: Tier;
  json?: ZodType<T>;
  /** API mode: a larger output budget for long answers. */
  maxTokens?: number;
}

/** What every prompt needs to know about the learner. */
export interface PromptEnv {
  /** The learner's main language for code: "C++", "Java" or "Python". */
  language: string;
  /** The Markdown fence name for that language: "cpp", "java", "python". */
  fence: string;
}

export function preamble(env: PromptEnv): string {
  return [
    "You are the tutor inside Atlas, a study app for a student preparing for SDE and quant interviews.",
    "Write in plain, friendly English with short sentences. Use markdown. Use the learner's primary language for code unless asked otherwise.",
    "Be accurate. If you are not sure about something, say so. Never invent facts. When you describe a known problem, use your own words and don't claim to quote its official statement.",
    `Tailor explanations to what the learner already knows (see "Strong concepts").`,
    `The learner's primary language is ${env.language}. Write every code example in ${env.language} (in \`\`\`${env.fence} blocks) unless the learner asks for another language.`,
  ].join("\n");
}

function instructions(env: PromptEnv, ...parts: string[]): string {
  return [preamble(env), ...parts.filter(Boolean)].join("\n\n");
}

function withContext(context: string, ask: string): string {
  return context.trim() ? `${context.trim()}\n\n## Request\n${ask.trim()}` : ask.trim();
}

// ----- 1. explain a concept at a level --------------------------------------------------------

export type ExplainLevel = "simple" | "interview" | "deep";

export function explainConceptPrompt(
  env: PromptEnv,
  context: string,
  concept: string,
  level: ExplainLevel,
): PromptSpec {
  return {
    task: "explain",
    tier: level === "deep" ? "complex" : "default",
    instructions: instructions(
      env,
      `Explain ${concept} at the ${level} level. Simple: 2 to 4 sentences with one everyday analogy. Interview: 4 to 7 bullets covering definition, key facts, complexity, when to use it, common follow-ups and pitfalls. Deep: a structured explanation with intuition, a small worked example traced step by step, code, complexity, edge cases and variants. Where helpful, connect it to one of the learner's strong concepts.`,
    ),
    input: withContext(context, `Explain ${concept} at the ${level} level.`),
  };
}

// ----- 2. generate missing seed-style content -------------------------------------------------

export function generateContentPrompt(
  env: PromptEnv,
  context: string,
  concept: string,
  isPattern: boolean,
): PromptSpec {
  const shape = `{
  "simple": "2 to 4 sentences with one everyday analogy",
  "interview": ["4 to 7 bullet points: definition, key facts, complexity, when to use it, follow-ups, pitfalls"],
  "questions": [{ "q": "an interview-style question", "a": "a short model answer" }]${isPattern ? ',\n  "signals": ["how to recognise this pattern in a problem"]' : ""}
}`;
  return {
    task: "generate-content",
    tier: "complex",
    json: generatedContentSchema,
    instructions: instructions(
      env,
      `Write study material for the concept ${concept}, in the same style as the rest of the app: a simple level, interview points and 3 to 5 interview questions with short model answers. Stay within the concept's scope. Mark nothing as certain that you are unsure about; say so in the text instead.`,
      jsonInstruction(shape),
    ),
    input: withContext(context, `Write the study material for ${concept}.`),
  };
}

// ----- 3. hint ladder --------------------------------------------------------------------------

export function hintPrompt(env: PromptEnv, context: string, level: 1 | 2 | 3): PromptSpec {
  return {
    task: "hint",
    tier: "default",
    instructions: instructions(
      env,
      `The learner is stuck on this problem. Give ONLY hint level ${level}. Level 1: one guiding question or observation; do not name the technique or data structure. Level 2: name the technique and explain the key idea in words; no code, no pseudocode. Level 3: numbered pseudocode steps; no real code in any language. Respond to where the learner's code currently is. Keep it under 120 words. Never reveal the full solution.`,
    ),
    input: withContext(context, `Give hint level ${level} for this problem.`),
  };
}

// ----- 4. code review --------------------------------------------------------------------------

export const CODE_REVIEW_SHAPE = `{
  "verdict": "correct" | "likely correct" | "has bugs" | "incomplete",
  "correctnessConcerns": [{ "line": 12, "issue": "string" }],
  "timeComplexity": "O(n log n)",
  "spaceComplexity": "O(n)",
  "isOptimal": true,
  "optimalComplexity": "O(n)",
  "edgeCasesMissed": ["string"],
  "betterApproach": "string (words only, no code)",
  "codeQuality": ["string"],
  "suggestedInsight": "one line, under 20 words",
  "suggestedMistakeTags": ["exact labels from the provided tag list"]
}`;

export function codeReviewPrompt(
  env: PromptEnv,
  context: string,
  opts: { tags: string[]; claimedTime?: string; claimedSpace?: string },
): PromptSpec {
  const claims = [
    opts.claimedTime ? `time ${opts.claimedTime}` : "",
    opts.claimedSpace ? `space ${opts.claimedSpace}` : "",
  ]
    .filter(Boolean)
    .join(", ");
  return {
    task: "review",
    tier: "default",
    json: codeReviewSchema,
    instructions: instructions(
      env,
      "Review the learner's code for this problem like a careful interviewer. Check correctness first (with line numbers from the code as shown), then time and space complexity and whether it is optimal (give the optimal complexity), edge cases it misses, a better approach in words only (no code), and code quality notes on naming, structure and idiomatic use of the language. Suggest a one-line insight worth remembering, and suggest mistake tags only from the provided list, using their exact labels.",
      `Mistake tags to choose from: ${opts.tags.join("; ")}`,
      jsonInstruction(CODE_REVIEW_SHAPE),
    ),
    input: withContext(
      context,
      `Review my code.${claims ? ` I think its complexity is ${claims}.` : ""}`,
    ),
  };
}

// ----- 5. dry run --------------------------------------------------------------------------------

export function dryRunPrompt(
  env: PromptEnv,
  context: string,
  opts: { input?: string; expected?: string },
): PromptSpec {
  const input = opts.input?.trim() ? opts.input.trim() : "choose a small, revealing input";
  return {
    task: "dry-run",
    tier: "default",
    instructions: instructions(
      env,
      `Trace the learner's code on this input: ${input}. Show a markdown table of the important variables after each meaningful step (at most 15 rows), then the final output, then say whether it matches the expected answer and where it first goes wrong if not.`,
      "State the input you traced first. Trace the code exactly as written, including its bugs; don't fix it silently.",
    ),
    input: withContext(
      context,
      [
        `Dry run my code on: ${input}.`,
        opts.expected?.trim() ? `The expected output is: ${opts.expected.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
  };
}

// ----- 6. explain-it-back grader -----------------------------------------------------------------

const EXPLAIN_GRADE_SHAPE = `{
  "score": 0-5,
  "correctPoints": ["string"],
  "missingPoints": ["string"],
  "misconceptions": ["string"],
  "betterExplanation": "3 to 5 sentences",
  "followUpQuestion": "string"
}`;

export function explainGradePrompt(
  env: PromptEnv,
  context: string,
  opts: {
    concept: string;
    points: string[];
    explanation: string;
    followUp?: { question: string; answer: string };
  },
): PromptSpec {
  const ask = [
    `My explanation of ${opts.concept}:`,
    opts.explanation.trim(),
    opts.followUp
      ? `\nYou then asked: ${opts.followUp.question}\nMy answer: ${opts.followUp.answer.trim()}\nGrade my explanation together with this answer.`
      : "",
  ].join("\n");
  return {
    task: "explain-grade",
    tier: "default",
    json: explainGradeSchema,
    instructions: instructions(
      env,
      `Grade the learner's explanation of ${opts.concept} against the concept's interview points below. Rubric: 5 = complete, accurate, clear, with an example; 4 = accurate with one minor gap; 3 = mostly right, missing an important point; 2 = partial understanding or one misconception; 1 = mostly incorrect; 0 = off-topic. Be kind and specific. List what was right, what was missing and any misconceptions, write a better short explanation (3 to 5 sentences), and ask one follow-up question that checks the most important gap.`,
      `Interview points to grade against:\n${opts.points.map((p) => `- ${p}`).join("\n")}`,
      jsonInstruction(EXPLAIN_GRADE_SHAPE),
    ),
    input: withContext(context, ask),
  };
}

// ----- 7. quiz generator and short-answer grading -----------------------------------------------

const QUIZ_SHAPE = `[{ "type": "mcq", "question": "string", "options": ["a","b","c","d"], "answerIndex": 2, "explanation": "string", "conceptId": "string" },
 { "type": "short", "question": "string", "modelAnswer": "string", "explanation": "string", "conceptId": "string" }]`;

export function quizPrompt(
  env: PromptEnv,
  context: string,
  opts: { scope: string; concepts: { id: string; name: string }[]; count?: number },
): PromptSpec {
  const count = opts.count ?? 5;
  return {
    task: "quiz",
    tier: "default",
    json: quizSchema,
    instructions: instructions(
      env,
      `Write a quick quiz of ${count} questions on ${opts.scope}: a mix of multiple choice (4 options, exactly one correct) and short answer (one or two sentences expected). Test understanding and interview-style reasoning, not trivia. Each question has a short explanation of the answer and the id of the concept it checks, taken from the list below.`,
      `Concept ids to use:\n${opts.concepts.map((c) => `- ${c.id}: ${c.name}`).join("\n")}`,
      jsonInstruction(QUIZ_SHAPE),
    ),
    input: withContext(context, `Write a ${count}-question quiz on ${opts.scope}.`),
  };
}

export function quizGradePrompt(
  env: PromptEnv,
  items: { index: number; question: string; modelAnswer: string; answer: string }[],
): PromptSpec {
  const list = items
    .map(
      (i) =>
        `Question ${i.index}: ${i.question}\nModel answer: ${i.modelAnswer}\nLearner's answer: ${i.answer.trim() || "(no answer)"}`,
    )
    .join("\n\n");
  return {
    task: "quiz-grade",
    tier: "quick",
    json: shortAnswerGradesSchema,
    instructions: instructions(
      env,
      "Grade each short answer against its model answer. Score from 0 to 1 (partial credit is fine: 0.5 for half right). Judge meaning, not wording. Give one sentence of feedback each.",
      jsonInstruction('[{ "index": 0, "score": 0-1, "feedback": "string" }]'),
    ),
    input: list,
  };
}

// ----- 8. drill approach grader -------------------------------------------------------------------

export function drillGradePrompt(
  env: PromptEnv,
  opts: {
    prompt: string;
    correct: string[];
    picked: string[];
    approach: string;
    keyInsight: string;
  },
): PromptSpec {
  return {
    task: "drill-grade",
    tier: "quick",
    json: drillGradeSchema,
    instructions: instructions(
      env,
      "The learner read a short problem and named the pattern they would use, with a one or two line approach. Say whether the pattern is right, score the approach from 0 to 1, and give one or two sentences of feedback.",
      jsonInstruction(
        '{ "patternCorrect": boolean, "approachScore": 0-1, "feedback": "one or two sentences" }',
      ),
    ),
    input: [
      `Problem: ${opts.prompt}`,
      `Correct pattern: ${opts.correct.join(" or ")}`,
      `Key insight: ${opts.keyInsight}`,
      `Learner picked: ${opts.picked.join(", ") || "nothing"}`,
      `Learner's approach: ${opts.approach.trim() || "(none)"}`,
    ].join("\n"),
  };
}

// ----- 9. drill prompt generator -----------------------------------------------------------------

export function drillGeneratePrompt(
  env: PromptEnv,
  opts: { patterns: { id: string; name: string }[]; focus: string[]; count?: number },
): PromptSpec {
  const count = opts.count ?? 5;
  return {
    task: "drill-generate",
    tier: "default",
    json: drillGenerationSchema,
    instructions: instructions(
      env,
      `Write ${count} original pattern-recognition prompts. Each is 2 to 4 sentences describing a small problem in an everyday setting, without naming the technique. Never copy or paraphrase a known problem statement. Each prompt lists the id of its main pattern first (one or two ids, only from the allowed list), a one-line key insight and a difficulty.`,
      `Focus on these patterns: ${opts.focus.join(", ")}`,
      `Allowed pattern ids:\n${opts.patterns.map((p) => `- ${p.id}: ${p.name}`).join("\n")}`,
      jsonInstruction(
        '[{ "text": "string", "answerConceptIds": ["pattern id"], "keyInsight": "string", "difficulty": "easy" | "medium" | "hard" }]',
      ),
    ),
    input: `Write ${count} new drill prompts for: ${opts.focus.join(", ")}.`,
  };
}

// ----- 10 and 11. mock interviews (used by the mock interview feature) ---------------------------

export type MockKind = "dsa" | "theory" | "design" | "behavioral";

export const MOCK_PHASES: Record<MockKind, string[]> = {
  dsa: ["Clarify", "Approach", "Code", "Test", "Complexity", "Follow-ups"],
  theory: ["Warm-up", "Rapid fire", "Wrap-up"],
  design: ["Requirements", "High-level design", "Deep dive", "Trade-offs", "Wrap-up"],
  behavioral: ["Introduction", "Questions", "Probing", "Wrap-up"],
};

export const MOCK_SCORE_KEYS: Record<MockKind, string[]> = {
  dsa: ["problemSolving", "communication", "codeQuality", "complexity", "edgeCases"],
  theory: ["accuracy", "depth", "clarity", "breadth", "communication"],
  design: ["requirements", "highLevelDesign", "deepDive", "tradeOffs", "communication"],
  behavioral: ["structure", "specificity", "impact", "reflection", "communication"],
};

export function mockInterviewerPrompt(
  env: PromptEnv,
  context: string,
  kind: MockKind,
  turns: ChatTurn[],
): PromptSpec {
  return {
    task: "mock",
    tier: "default",
    instructions: instructions(
      env,
      `Act as a friendly but rigorous interviewer at a top tech company for a ${kind} interview. Run the phases in order: ${MOCK_PHASES[kind].join(", ")}. Ask one thing at a time. Don't give away the solution; if the candidate is stuck for a while, offer a small hint and note it. Ask realistic follow-ups. Keep replies short, like a real interviewer speaking. When the candidate says they're done or time is almost up, wrap up politely.`,
      "Each candidate turn starts with a note like [Phase: Code | 18 min left]; use it to pace the interview.",
      context,
    ),
    input: turns,
  };
}

export function mockFeedbackPrompt(env: PromptEnv, kind: MockKind, transcript: string): PromptSpec {
  const keys = MOCK_SCORE_KEYS[kind].map((k) => `"${k}": 1-5`).join(", ");
  return {
    task: "mock-feedback",
    tier: "complex",
    json: mockFeedbackSchema,
    instructions: instructions(
      env,
      "Give feedback on this mock interview as the interviewer would write it for a hiring committee, but kindly and usefully for the candidate. Scores from 1 to 5.",
      jsonInstruction(
        `{ "scores": { ${keys} }, "strengths": ["string"], "improvements": ["string"], "hireSignal": "strong yes" | "yes" | "lean no" | "no", "summary": "3 to 5 sentences" }`,
      ),
    ),
    input: transcript,
  };
}

// ----- 12. design review -------------------------------------------------------------------------

export function designReviewPrompt(
  env: PromptEnv,
  opts: { prompt: string; rubric: string[]; sections: Record<string, string> },
): PromptSpec {
  const sections = Object.entries(opts.sections)
    .filter(([, v]) => v.trim())
    .map(([k, v]) => `### ${k}\n${v.trim()}`)
    .join("\n\n");
  return {
    task: "design-review",
    tier: "complex",
    json: designReviewSchema,
    instructions: instructions(
      env,
      "Review the learner's design against the rubric. Score each rubric point 0 (missing), 1 (partly covered) or 2 (well covered) with a short comment, list what they missed, suggest improvements, and give an overall score from 1 to 5.",
      jsonInstruction(
        '{ "rubric": [{ "point": "string", "score": 0-2, "comment": "string" }], "missed": ["string"], "suggestions": ["string"], "overall": 1-5 }',
      ),
    ),
    input: `## Design prompt\n${opts.prompt}\n\n## Rubric\n${opts.rubric.map((r) => `- ${r}`).join("\n")}\n\n## Learner's design\n${sections || "(empty)"}`,
  };
}

// ----- 13. story critique ------------------------------------------------------------------------

export function storyCritiquePrompt(
  env: PromptEnv,
  story: { title: string; situation: string; task: string; action: string; result: string },
  question?: string,
): PromptSpec {
  return {
    task: "story-critique",
    tier: "default",
    json: storyCritiqueSchema,
    instructions: instructions(
      env,
      "Critique this STAR story for a behavioral interview. Score clarity, specificity, impact and structure from 1 to 5, comment on its length when spoken (about 140 words a minute), write a tighter version in the first person, and give a few concrete tips.",
      jsonInstruction(
        '{ "clarity": 1-5, "specificity": 1-5, "impact": 1-5, "structure": 1-5, "lengthNote": "string", "tighterVersion": "string", "tips": ["string"] }',
      ),
    ),
    input: [
      question ? `Interview question: ${question}` : "",
      `Story: ${story.title}`,
      `Situation: ${story.situation}`,
      `Task: ${story.task}`,
      `Action: ${story.action}`,
      `Result: ${story.result}`,
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

// ----- 14. weekly reflection -----------------------------------------------------------------------

export function weeklyReflectionPrompt(
  env: PromptEnv,
  summary: string,
  subjects: { id: string; name: string }[],
): PromptSpec {
  return {
    task: "weekly-reflection",
    tier: "default",
    instructions: instructions(
      env,
      "Write a short, kind, specific reflection on the learner's week (under 150 words of markdown): what went well, what to watch, one concrete suggestion. Never guilt-trip. Then, on the very last line, write only this JSON with up to 3 subject ids to focus on next week:",
      '{ "focusSubjects": ["dsa", "os"] }',
      `Subject ids: ${subjects.map((s) => `${s.id} (${s.name})`).join(", ")}`,
    ),
    input: summary,
  };
}

/** Splits the reflection into its Markdown and the JSON on the last line. */
export function parseWeeklyReflection(
  text: string,
  validIds: ReadonlySet<string>,
): { markdown: string; focusSubjects: string[] } {
  const lines = text.trimEnd().split("\n");
  for (let i = lines.length - 1; i >= Math.max(0, lines.length - 3); i--) {
    const line = lines[i]!.trim().replace(/^```(json)?|```$/g, "");
    if (!line.startsWith("{")) continue;
    try {
      const parsed = weeklyFocusSchema.safeParse(JSON.parse(line));
      if (parsed.success) {
        const markdown = lines
          .slice(0, i)
          .join("\n")
          .replace(/```(json)?\s*$/, "")
          .trim();
        return {
          markdown,
          focusSubjects: parsed.data.focusSubjects.filter((id) => validIds.has(id)).slice(0, 3),
        };
      }
    } catch {
      /* not the JSON line */
    }
  }
  return { markdown: text.trim(), focusSubjects: [] };
}

// ----- 15. revision sheet tightening -------------------------------------------------------------

export function revisionTightenPrompt(env: PromptEnv, sheet: string, words: number): PromptSpec {
  return {
    task: "revision-tighten",
    tier: "complex",
    maxTokens: 32000,
    instructions: instructions(
      env,
      `Compress this revision sheet to about ${words} words, keeping every formula, complexity and mistake item; remove repetition; keep the section structure.`,
    ),
    input: sheet,
  };
}

// ----- 16. open-ended puzzle grader -----------------------------------------------------------------

export function puzzleGradePrompt(
  env: PromptEnv,
  opts: { prompt: string; reference?: string; answer: string },
): PromptSpec {
  return {
    task: "puzzle-grade",
    tier: "default",
    json: puzzleGradeSchema,
    instructions: instructions(
      env,
      "Grade the learner's answer to this puzzle. Judge the reasoning as well as the final answer. Score from 0 to 1, say whether it is correct, give short feedback, and write the ideal reasoning briefly.",
      jsonInstruction(
        '{ "correct": boolean, "score": 0-1, "feedback": "string", "idealReasoning": "string" }',
      ),
    ),
    input: [
      `Puzzle: ${opts.prompt}`,
      opts.reference ? `Reference note: ${opts.reference}` : "",
      `Learner's answer and reasoning:\n${opts.answer.trim()}`,
    ]
      .filter(Boolean)
      .join("\n\n"),
  };
}

// ----- 17. concept suggestions for a custom problem ---------------------------------------------------

export function conceptSuggestPrompt(
  env: PromptEnv,
  opts: { title: string; link?: string; notes?: string; allowed: { id: string; name: string }[] },
): PromptSpec {
  return {
    task: "concept-suggest",
    tier: "quick",
    json: conceptSuggestionSchema,
    instructions: instructions(
      env,
      "Suggest the 1 to 3 patterns this problem most likely uses and its difficulty. Use only ids from the allowed list. If you don't recognise the problem, judge from its title and say nothing you can't support.",
      `Allowed pattern ids:\n${opts.allowed.map((c) => `- ${c.id}: ${c.name}`).join("\n")}`,
      jsonInstruction('{ "conceptIds": ["pattern id"], "difficulty": "easy" | "medium" | "hard" }'),
    ),
    input: [
      `Problem: ${opts.title}`,
      opts.link ? `Link: ${opts.link}` : "",
      opts.notes?.trim() ? `Learner's notes: ${opts.notes.trim()}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

// ----- 18. mistake "how to avoid" suggestions ------------------------------------------------------------

export function mistakeAdvicePrompt(
  env: PromptEnv,
  tags: { label: string; category: string; description?: string; examples?: string[] }[],
): PromptSpec {
  return {
    task: "mistake-advice",
    tier: "quick",
    json: mistakeAdviceSchema,
    instructions: instructions(
      env,
      "For each mistake the learner keeps making in coding interviews, write one practical line on how to avoid it (a habit or check they can do during an interview). Keep each under 20 words. Use each tag label exactly as given.",
      jsonInstruction('[{ "tag": "exact label", "howToAvoid": "one line" }]'),
    ),
    input: tags
      .map(
        (t) =>
          `- ${t.label} (${t.category})${t.description ? `: ${t.description}` : ""}${t.examples?.length ? `. Seen in: ${t.examples.join(", ")}` : ""}`,
      )
      .join("\n"),
  };
}

// ----- 19. full solution ---------------------------------------------------------------------------------

export function fullSolutionPrompt(env: PromptEnv, context: string): PromptSpec {
  return {
    task: "full-solution",
    tier: "default",
    instructions: instructions(
      env,
      "Explain a complete, optimal solution to this problem: the key insight, the approach step by step, clean code in the learner's language with brief comments, time and space complexity, and the edge cases handled. Then give a one-line insight the learner should remember.",
    ),
    input: withContext(context, "Show me the full solution."),
  };
}

// ----- chat (F20) --------------------------------------------------------------------------------------------

export function chatInstructions(env: PromptEnv, context: string): string {
  return instructions(
    env,
    "The learner is chatting with you from inside the app. Answer what they ask about the material on screen. Keep answers focused and short unless they ask for depth. Prefer questions back and hints over handing out full solutions to practice problems.",
    context.trim() ? `What the learner has on screen:\n\n${context.trim()}` : "",
  );
}

/** The quick actions under each chat answer (F20). */
export const QUICK_ACTIONS = {
  simpler: "Explain that more simply, with an everyday analogy.",
  deeper: "Go deeper: the details, edge cases and what an interviewer might ask next.",
  example: "Give a small, concrete example, traced step by step.",
  quiz: "Quiz me on this: ask me 3 short questions, one at a time, and wait for each answer.",
} as const;

export type QuickAction = keyof typeof QUICK_ACTIONS;

export function chatPrompt(env: PromptEnv, context: string, turns: ChatTurn[]): PromptSpec {
  return {
    task: "chat",
    tier: "default",
    instructions: chatInstructions(env, context),
    input: turns,
  };
}

// ----- test connection ------------------------------------------------------------------------------------------

export function testConnectionPrompt(tier: Tier): PromptSpec {
  return {
    task: "test-connection",
    tier,
    instructions: "This is a connection test from a study app.",
    input: "Reply with the single word OK.",
    maxTokens: tier === "quick" ? 16 : 1024,
  };
}
