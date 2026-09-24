// JSON shapes Claude returns for each AI task (BUILD_SPEC.md section 10.4). Every AI reply that
// claims to be JSON is validated against one of these before the app uses it. Stored results
// (a code review on an attempt, feedback on a mock) are validated again on import.
import { z } from "zod";

const text = z.string();
const textList = z.array(z.string()).default([]);

/** 2. Generate missing seed-style content for a concept. */
export const generatedContentSchema = z.object({
  simple: text,
  interview: z.array(text).min(1),
  questions: z.array(z.object({ q: text, a: text })).default([]),
  signals: z.array(text).optional(),
});
export type GeneratedContent = z.infer<typeof generatedContentSchema>;

/** 4. Code review. */
export const codeReviewSchema = z.object({
  verdict: z.enum(["correct", "likely correct", "has bugs", "incomplete"]),
  correctnessConcerns: z
    .array(z.object({ line: z.number().int().nullable().optional(), issue: text }))
    .default([]),
  timeComplexity: text,
  spaceComplexity: text,
  isOptimal: z.boolean(),
  optimalComplexity: text.default(""),
  edgeCasesMissed: textList,
  betterApproach: text.default(""),
  codeQuality: textList,
  suggestedInsight: text.default(""),
  suggestedMistakeTags: textList,
});
export type CodeReview = z.infer<typeof codeReviewSchema>;

/** 6. Explain-it-back grader. */
export const explainGradeSchema = z.object({
  score: z.number().min(0).max(5),
  correctPoints: textList,
  missingPoints: textList,
  misconceptions: textList,
  betterExplanation: text,
  followUpQuestion: text,
});
export type ExplainGrade = z.infer<typeof explainGradeSchema>;

/** 7. Quiz generator: five questions, multiple choice or short answer. */
export const quizQuestionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("mcq"),
    question: text,
    options: z.array(text).min(2).max(6),
    answerIndex: z.number().int().min(0),
    explanation: text,
    conceptId: text,
  }),
  z.object({
    type: z.literal("short"),
    question: text,
    modelAnswer: text,
    explanation: text,
    conceptId: text,
  }),
]);
export const quizSchema = z.array(quizQuestionSchema).min(1);
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

/** 7b. Batch grading of short quiz answers. */
export const shortAnswerGradesSchema = z.array(
  z.object({ index: z.number().int().min(0), score: z.number().min(0).max(1), feedback: text }),
);
export type ShortAnswerGrade = z.infer<typeof shortAnswerGradesSchema>[number];

/** 8. Drill approach grader. */
export const drillGradeSchema = z.object({
  patternCorrect: z.boolean(),
  approachScore: z.number().min(0).max(1),
  feedback: text,
});
export type DrillGrade = z.infer<typeof drillGradeSchema>;

/** 9. Drill prompt generator (ids are checked against the syllabus separately). */
export const drillGenerationSchema = z.array(
  z.object({
    text,
    answerConceptIds: z.array(text).min(1).max(2),
    keyInsight: text,
    difficulty: z.enum(["easy", "medium", "hard"]),
  }),
);

/** 11. Mock feedback. Score keys depend on the mock type (dsa, design, behavioral, theory). */
export const mockFeedbackSchema = z.object({
  scores: z.record(z.string(), z.number().min(1).max(5)),
  strengths: textList,
  improvements: textList,
  hireSignal: z.enum(["strong yes", "yes", "lean no", "no"]),
  summary: text,
});
export type MockFeedback = z.infer<typeof mockFeedbackSchema>;

/** 12. Design review against the rubric. */
export const designReviewSchema = z.object({
  rubric: z.array(z.object({ point: text, score: z.number().min(0).max(2), comment: text })),
  missed: textList,
  suggestions: textList,
  overall: z.number().min(1).max(5),
});
export type DesignReview = z.infer<typeof designReviewSchema>;

/** 13. Story critique. */
export const storyCritiqueSchema = z.object({
  clarity: z.number().min(1).max(5),
  specificity: z.number().min(1).max(5),
  impact: z.number().min(1).max(5),
  structure: z.number().min(1).max(5),
  lengthNote: text,
  tighterVersion: text,
  tips: textList,
});
export type StoryCritique = z.infer<typeof storyCritiqueSchema>;

/** 14. Weekly reflection: the JSON on the last line. */
export const weeklyFocusSchema = z.object({ focusSubjects: z.array(text).max(3) });

/** 16. Open-ended puzzle grader. */
export const puzzleGradeSchema = z.object({
  correct: z.boolean(),
  score: z.number().min(0).max(1),
  feedback: text,
  idealReasoning: text,
});
export type PuzzleGrade = z.infer<typeof puzzleGradeSchema>;

/** 17. Concept suggestions for a custom problem (ids are checked against the syllabus). */
export const conceptSuggestionSchema = z.object({
  conceptIds: z.array(text).min(1).max(3),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

/** 18. "How to avoid it" suggestions for mistake tags. */
export const mistakeAdviceSchema = z.array(z.object({ tag: text, howToAvoid: text }));
