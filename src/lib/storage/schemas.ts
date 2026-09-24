// zod schemas for every user-data entity and for the backup file (F22). Imports are validated
// with these before anything is written, so a damaged or foreign file can never corrupt data.
// Each schema is checked against its TypeScript type (`z.ZodType<T>`), so the two stay in sync.
import { z } from "zod";
import { codeReviewSchema, mockFeedbackSchema } from "@/lib/ai/schemas";
import type {
  ActivityMonth,
  Attempt,
  Check,
  ConceptNote,
  ConceptState,
  CustomConcept,
  DayPlan,
  DesignAttempt,
  GeneratedDrill,
  MapOverride,
  MentalMathRun,
  MistakeTag,
  MockSession,
  ProblemState,
  Profile,
  SrsState,
  Story,
} from "@/lib/types";
import type { TableName, TableTypes } from "./tables";

const isoTime = z.string().min(1);
const localDay = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "expected a yyyy-mm-dd date");
const status = z.enum(["not_started", "learning", "strong", "fading"]);
const difficulty = z.enum(["easy", "medium", "hard"]);
const importance = z.enum(["must", "important", "advanced"]);
const language = z.enum(["cpp", "java", "python"]);
const aiMode = z.enum(["sample", "api", "copy"]);

export const profileSchema: z.ZodType<Profile> = z.object({
  name: z.string(),
  track: z.enum(["sde", "quant", "both"]),
  interviewDate: localDay.optional(),
  primaryLanguage: language,
  dailyMinutes: z
    .number()
    .int()
    .min(5)
    .max(24 * 60),
  balance: z.object({ problems: z.number().min(0).max(100), theory: z.number().min(0).max(100) }),
  focusSubjects: z.array(z.string()),
  theme: z.enum(["system", "light", "dark"]),
  ai: z.object({
    mode: aiMode,
    tierModels: z.object({ quick: z.string(), default: z.string(), complex: z.string() }),
  }),
  onboardingDone: z.boolean(),
  hidePremium: z.boolean(),
  reviewIntensity: z.enum(["gentle", "normal", "intense"]),
  prefs: z.object({
    reducedMotion: z.enum(["system", "on", "off"]),
    labelDensity: z.enum(["low", "normal", "high"]),
    showAdvanced: z.boolean(),
    streakFreeze: z.boolean(),
    focusMinutes: z.number().int().min(1).max(180),
    breakMinutes: z.number().int().min(1).max(60),
    timerAutoStart: z.boolean(),
    extraLanguages: z.array(language),
    backupReminder: z.boolean(),
  }),
  lastBackupAt: isoTime.optional(),
  backupReminderDismissedAt: isoTime.optional(),
  createdAt: isoTime,
  updatedAt: isoTime,
  schemaVersion: z.number().int().min(1),
});

export const srsSchema: z.ZodType<SrsState> = z.object({
  step: z.number().int().min(0),
  dueAt: localDay.optional(),
  lastReviewedAt: isoTime.optional(),
  lapses: z.number().int().min(0),
  soloStreak: z.number().int().min(0),
  retired: z.boolean().optional(),
});

export const conceptStateSchema: z.ZodType<ConceptState> = z.object({
  conceptId: z.string().min(1),
  status,
  manualStatus: status.optional(),
  neverFade: z.boolean().optional(),
  hidden: z.boolean().optional(),
  everStrong: z.boolean(),
  strongSince: isoTime.optional(),
  studied: z.boolean(),
  selfAssessed: z.union([z.literal(0.3), z.literal(0.5)]).optional(),
  lastLevelOpened: z.enum(["simple", "interview", "deep"]).optional(),
  knowledge: z.number().min(0).max(1),
  srs: srsSchema,
  firstActivityAt: isoTime.optional(),
  lastActivityAt: isoTime.optional(),
  updatedAt: isoTime,
});

const qaSchema = z.object({ q: z.string(), a: z.string() });

export const conceptNoteSchema: z.ZodType<ConceptNote> = z.object({
  conceptId: z.string().min(1),
  markdown: z.string(),
  savedAnswers: z.array(
    z.object({
      id: z.string().min(1),
      question: z.string(),
      answer: z.string(),
      createdAt: isoTime,
      source: aiMode,
    }),
  ),
  generated: z
    .object({
      simple: z.string().optional(),
      interview: z.array(z.string()).optional(),
      questions: z.array(qaSchema).optional(),
      createdAt: isoTime,
    })
    .optional(),
  updatedAt: isoTime,
});

export const attemptSchema: z.ZodType<Attempt> = z.object({
  id: z.string().min(1),
  problemId: z.string().min(1),
  startedAt: isoTime,
  finishedAt: isoTime.optional(),
  minutes: z.number().min(0).optional(),
  language: z.string(),
  code: z.string(),
  result: z.enum(["solved_alone", "solved_with_hints", "saw_solution", "not_solved"]).optional(),
  hintsUsed: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]),
  approach: z.string().optional(),
  timeComplexity: z.string().optional(),
  spaceComplexity: z.string().optional(),
  mistakeTagIds: z.array(z.string()),
  mode: z.enum(["normal", "resolve", "mock"]),
  review: codeReviewSchema.optional(),
  dryRuns: z
    .array(z.object({ input: z.string(), output: z.string(), createdAt: isoTime }))
    .optional(),
});

export const problemStateSchema: z.ZodType<ProblemState> = z.object({
  problemId: z.string().min(1),
  custom: z
    .object({
      title: z.string().min(1),
      url: z.string().optional(),
      difficulty,
      source: z.enum(["leetcode", "quant", "design-lld", "design-hld", "custom"]),
      topicId: z.string().optional(),
      conceptIds: z.array(z.string()),
      prompt: z.string().optional(),
    })
    .optional(),
  status: z.enum(["todo", "attempted", "solved"]),
  insight: z.string().optional(),
  summary: z.string().optional(),
  myNotes: z.string().optional(),
  starred: z.boolean(),
  tags: z.array(z.string()),
  urlOverride: z.string().optional(),
  srs: srsSchema,
  inReview: z.boolean(),
  attempts: z.array(attemptSchema),
  draft: z
    .object({
      language: z.string(),
      code: z.string(),
      updatedAt: isoTime,
      mode: z.enum(["normal", "resolve"]).optional(),
      startedAt: isoTime.optional(),
      elapsedMs: z.number().min(0).optional(),
      hintsUsed: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]).optional(),
      sawSolution: z.boolean().optional(),
      revealed: z.boolean().optional(),
    })
    .optional(),
  hints: z
    .array(
      z.object({
        level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        text: z.string(),
        createdAt: isoTime,
      }),
    )
    .optional(),
  updatedAt: isoTime,
});

export const mistakeTagSchema: z.ZodType<MistakeTag> = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  category: z.enum(["edge-case", "logic", "complexity", "pattern", "language", "reading", "other"]),
  custom: z.boolean(),
  description: z.string().optional(),
  howToAvoid: z.string().optional(),
  archived: z.boolean().optional(),
  updatedAt: isoTime,
});

export const checkSchema: z.ZodType<Check> = z.object({
  id: z.string().min(1),
  conceptId: z.string().min(1),
  kind: z.enum(["quiz", "explain", "flashcard", "drill", "manual"]),
  score: z.number().min(0).max(1),
  detail: z.unknown().optional(),
  createdAt: isoTime,
  updatedAt: isoTime,
});

export const dayPlanSchema: z.ZodType<DayPlan> = z.object({
  date: localDay,
  budgetMinutes: z.number().min(0),
  minimumDay: z.boolean(),
  items: z.array(
    z.object({
      id: z.string().min(1),
      kind: z.enum([
        "resolve",
        "review-concept",
        "learn-concept",
        "new-problem",
        "drill",
        "mock",
        "mental-math",
        "revision",
        "design",
        "story",
      ]),
      refId: z.string().optional(),
      refIds: z.array(z.string()).optional(),
      title: z.string(),
      reason: z.string(),
      estMinutes: z.number().min(0),
      done: z.boolean(),
      skipped: z.boolean(),
    }),
  ),
  generatedAt: isoTime,
  updatedAt: isoTime,
});

export const activityMonthSchema: z.ZodType<ActivityMonth> = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "expected a yyyy-mm month"),
  days: z.record(
    localDay,
    z.object({
      minutes: z.number().min(0),
      problemsSolved: z.number().int().min(0),
      reviews: z.number().int().min(0),
      conceptsTouched: z.number().int().min(0),
      attempts: z.number().int().min(0).optional(),
      checks: z.number().int().min(0).optional(),
      planItemsDone: z.number().int().min(0).optional(),
      turnedStrong: z.number().int().min(0).optional(),
      turnedFading: z.number().int().min(0).optional(),
    }),
  ),
  streakFreezeUsed: z.array(localDay).optional(),
  updatedAt: isoTime,
});

const chatTurn = z.object({ role: z.enum(["user", "assistant"]), content: z.string() });

export const mockSessionSchema: z.ZodType<MockSession> = z.object({
  id: z.string().min(1),
  kind: z.enum(["dsa", "theory", "design", "behavioral"]),
  topicOrProblemId: z.string().optional(),
  turns: z.array(chatTurn),
  code: z.string().optional(),
  feedback: mockFeedbackSchema.optional(),
  phase: z.string().optional(),
  startedAt: isoTime,
  endedAt: isoTime.optional(),
  updatedAt: isoTime,
});

export const designAttemptSchema: z.ZodType<DesignAttempt> = z.object({
  id: z.string().min(1),
  problemId: z.string().min(1),
  sections: z.record(z.string(), z.string()),
  review: z.unknown().optional(),
  createdAt: isoTime,
  updatedAt: isoTime,
});

export const storySchema: z.ZodType<Story> = z.object({
  id: z.string().min(1),
  title: z.string(),
  situation: z.string(),
  task: z.string(),
  action: z.string(),
  result: z.string(),
  tags: z.array(z.string()),
  questionIds: z.array(z.string()),
  review: z.unknown().optional(),
  practice: z
    .array(
      z.object({
        questionId: z.string(),
        answer: z.string(),
        critique: z.unknown().optional(),
        createdAt: isoTime,
      }),
    )
    .optional(),
  updatedAt: isoTime,
});

export const mentalMathRunSchema: z.ZodType<MentalMathRun> = z.object({
  id: z.string().min(1),
  mode: z.string(),
  correct: z.number().int().min(0),
  total: z.number().int().min(0),
  seconds: z.number().min(0),
  createdAt: isoTime,
  updatedAt: isoTime,
});

export const mapOverrideSchema: z.ZodType<MapOverride> = z.object({
  nodeId: z.string().min(1),
  x: z.number(),
  y: z.number(),
  updatedAt: isoTime,
});

export const customConceptSchema: z.ZodType<CustomConcept> = z.object({
  id: z.string().regex(/^custom\.[A-Za-z0-9_-]+$/, 'custom concept ids look like "custom.<id>"'),
  topicId: z.string().min(1),
  name: z.string().min(1),
  scope: z.string(),
  importance,
  createdAt: isoTime,
  updatedAt: isoTime,
});

export const generatedDrillSchema: z.ZodType<GeneratedDrill> = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  answerConceptIds: z.array(z.string()).min(1),
  keyInsight: z.string(),
  difficulty,
  createdAt: isoTime,
  updatedAt: isoTime,
});

export const TABLE_SCHEMAS: { [K in TableName]: z.ZodType<TableTypes[K]> } = {
  conceptStates: conceptStateSchema,
  conceptNotes: conceptNoteSchema,
  problemStates: problemStateSchema,
  mistakeTags: mistakeTagSchema,
  checks: checkSchema,
  dayPlans: dayPlanSchema,
  activity: activityMonthSchema,
  mocks: mockSessionSchema,
  designs: designAttemptSchema,
  stories: storySchema,
  mentalMath: mentalMathRunSchema,
  mapOverrides: mapOverrideSchema,
  customConcepts: customConceptSchema,
  generatedDrills: generatedDrillSchema,
};

/** The "data" part of a backup file. */
export type ExportData = { profile: Profile | null } & { [K in TableName]: TableTypes[K][] };

/** A backup file: `{ app, schemaVersion, exportedAt, data }` (section 4.4). */
export interface AtlasExport {
  app: string;
  schemaVersion: number;
  exportedAt: string;
  data: ExportData;
}

export const exportDataSchema: z.ZodType<ExportData> = z.object({
  profile: profileSchema.nullable(),
  conceptStates: z.array(conceptStateSchema),
  conceptNotes: z.array(conceptNoteSchema),
  problemStates: z.array(problemStateSchema),
  mistakeTags: z.array(mistakeTagSchema),
  checks: z.array(checkSchema),
  dayPlans: z.array(dayPlanSchema),
  activity: z.array(activityMonthSchema),
  mocks: z.array(mockSessionSchema),
  designs: z.array(designAttemptSchema),
  stories: z.array(storySchema),
  mentalMath: z.array(mentalMathRunSchema),
  mapOverrides: z.array(mapOverrideSchema),
  customConcepts: z.array(customConceptSchema),
  generatedDrills: z.array(generatedDrillSchema),
});

/** The file envelope before migrations: only the fields needed to decide how to read it. */
export const exportEnvelopeSchema = z.object({
  app: z.string(),
  schemaVersion: z.number().int().min(1),
  exportedAt: z.string(),
  data: z.record(z.string(), z.unknown()),
});
