// All shared types (BUILD_SPEC.md section 4). Seed data (syllabus, problems, drills) is static and
// bundled; user data is everything the owner creates, stored through the Repository.
//
// Rule for user data: every stored entity has an `updatedAt` timestamp (ISO string). Import merge
// and multi-device sync rely on it ("newer updatedAt wins").

import type { CodeReview, MockFeedback } from "./ai/schemas";

export type { CodeReview, MockFeedback };

// ---------------------------------------------------------------------------------------------
// 4.1 Static seed types
// ---------------------------------------------------------------------------------------------

export type TrackId = "sde" | "quant";
export type Importance = "must" | "important" | "advanced"; // [M] [I] [A] in the syllabus
export type SubjectId = string; // "dsa", "os", …
export type TopicId = string; // "dsa.graph-basics"
export type ConceptId = string; // "dsa.graph-basics.bfs"

export interface Subject {
  id: SubjectId;
  name: string;
  shortName: string; // for small map labels
  tracks: TrackId[];
  /** Tracks for which the region shows on the map: any track one of its concepts belongs to. */
  mapTracks: TrackId[];
  order: number;
  icon: string; // lucide icon name
  regionHue: number; // 0-360, used only for the faint region tint
  description: string; // one sentence, plain language
}

export interface Topic {
  id: TopicId;
  subjectId: SubjectId;
  name: string;
  order: number;
  prereqTopics: TopicId[];
  tracks: TrackId[]; // defaults to the subject's tracks
}

export interface Concept {
  id: ConceptId;
  topicId: TopicId;
  subjectId: SubjectId;
  name: string;
  scope: string; // the detail text after the colon in the syllabus
  importance: Importance;
  tracks: TrackId[];
  order: number;
  prereqs: ConceptId[]; // concept-level prerequisites (DAG)
  related: CrossLink[]; // cross-subject and same-subject "see also" links
  estMinutes: number; // time to learn to interview level (default 25)
  isPattern: boolean; // true for DSA technique concepts that problems attach to
  content: ConceptContent;
}

export interface CrossLink {
  to: ConceptId;
  reason: string;
}

export interface ConceptContent {
  simple: string; // markdown, 2 to 4 sentences, everyday analogy ("" until written)
  interview: string[]; // 3 to 7 bullet points, markdown allowed
  deep?: string; // markdown article; required for "must" concepts
  questions: QA[]; // 3 to 5 interview-style questions with short model answers
  signals?: string[]; // patterns only: how to recognise this pattern in a problem
  template?: string; // patterns only: code template (C++), markdown code block
  needsReview?: boolean;
}

export interface QA {
  q: string;
  a: string;
}

export type ProblemSource = "leetcode" | "quant" | "design-lld" | "design-hld" | "custom";
export type Difficulty = "easy" | "medium" | "hard";

export interface SeedProblem {
  id: string; // "lc-1", "q-hh", "lld-parking-lot"
  source: ProblemSource;
  number?: number; // LeetCode number
  title: string;
  slug?: string; // LeetCode slug; url = https://leetcode.com/problems/<slug>/
  difficulty: Difficulty;
  topicId: TopicId;
  conceptIds: ConceptId[]; // 1 to 3 patterns
  premium?: boolean;
  /** LeetCode database problems are solved in SQL; the editor defaults to it. */
  language?: "sql";
  prompt?: string; // ONLY for original quant puzzles and design prompts written for this app
  answer?: string | null; // quant puzzles: checkable answer (null = open-ended)
  answerNote?: string; // quant puzzles: short reasoning shown after answering
  rubric?: string[]; // design prompts: must-discuss points
  needsReview?: boolean;
}

export interface DrillPrompt {
  // original mini-problems for pattern drill (F10)
  id: string;
  text: string; // 2 to 4 sentences, original wording
  answerConceptIds: ConceptId[];
  keyInsight: string;
  difficulty: Difficulty;
}

export interface BehavioralQuestion {
  id: string; // "bq-tell-me-about-yourself"
  text: string;
  suggestedTags: string[];
}

export interface Syllabus {
  formatVersion: number;
  counts: {
    subjects: number;
    topics: number;
    concepts: number;
    must: number;
    important: number;
    advanced: number;
    patterns: number;
    prereqEdges: number;
    connections: number;
  };
  subjects: Subject[];
  topics: Topic[];
  concepts: Concept[];
}

export interface MapLayout {
  formatVersion: number;
  inputHash: string;
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
  sizes: { bubbleRadius: Record<Importance, number> };
  regions: Record<
    SubjectId,
    { cx: number; cy: number; r: number; top: number; area: number; organic: boolean; path: string }
  >;
  topics: Record<TopicId, { r: number }>;
  positions: Record<string, { x: number; y: number }>;
}

// ---------------------------------------------------------------------------------------------
// 4.2 User data types
// ---------------------------------------------------------------------------------------------

export type Status = "not_started" | "learning" | "strong" | "fading";
export type Track = "sde" | "quant" | "both";
export type PrimaryLanguage = "cpp" | "java" | "python";
export type AIMode = "sample" | "api" | "copy";
export type Tier = "quick" | "default" | "complex";

export interface Profile {
  name: string;
  track: Track;
  interviewDate?: string; // ISO date (yyyy-mm-dd)
  primaryLanguage: PrimaryLanguage; // the editor also supports JavaScript and SQL
  dailyMinutes: number; // default 90
  balance: { problems: number; theory: number }; // default 60/40
  focusSubjects: SubjectId[]; // "this week" focus, optional
  theme: "system" | "light" | "dark";
  ai: { mode: AIMode; tierModels: Record<Tier, string> };
  onboardingDone: boolean;
  hidePremium: boolean;
  reviewIntensity: "gentle" | "normal" | "intense";
  prefs: {
    reducedMotion: "system" | "on" | "off";
    labelDensity: "low" | "normal" | "high";
    showAdvanced: boolean;
    streakFreeze: boolean;
    focusMinutes: number; // default 25
    breakMinutes: number; // default 5
    timerAutoStart: boolean; // start the attempt timer on the first keystroke
    extraLanguages: PrimaryLanguage[]; // other language topics the owner wants counted
    backupReminder: boolean;
  };
  lastBackupAt?: string;
  /** When the owner last dismissed the backup banner (it stays hidden for 3 days). */
  backupReminderDismissedAt?: string;
  createdAt: string;
  updatedAt: string;
  schemaVersion: number;
}

/** IndexedDB only. Never exported. Never written to the artifact db. */
export interface Secrets {
  anthropicApiKey?: string;
}

export interface SrsState {
  step: number; // index into the steps array
  dueAt?: string; // local date, yyyy-mm-dd
  lastReviewedAt?: string;
  lapses: number;
  soloStreak: number; // consecutive solo solves at due time (problems)
  retired?: boolean; // mastered, only shows in revision sheets
}

export interface ConceptState {
  conceptId: ConceptId;
  status: Status; // derived, cached; see section 11.2
  manualStatus?: Status; // owner override
  neverFade?: boolean;
  hidden?: boolean; // owner hid it from the map
  everStrong: boolean;
  strongSince?: string;
  studied: boolean; // owner marked "I've studied this" or read interview level fully
  selfAssessed?: 0.3 | 0.5; // from onboarding self-assessment (F5)
  lastLevelOpened?: "simple" | "interview" | "deep";
  knowledge: number; // 0..1, best recent check result
  srs: SrsState; // concept review schedule
  firstActivityAt?: string;
  lastActivityAt?: string;
  updatedAt: string;
}

export interface SavedAnswer {
  id: string;
  question: string;
  answer: string;
  createdAt: string;
  source: AIMode;
}

export interface ConceptNote {
  conceptId: ConceptId;
  markdown: string;
  savedAnswers: SavedAnswer[]; // AI answers the owner chose to keep
  /** "Explain with Claude" output for concepts without seed content. */
  generated?: { simple?: string; interview?: string[]; questions?: QA[]; createdAt: string };
  updatedAt: string;
}

export type AttemptResult = "solved_alone" | "solved_with_hints" | "saw_solution" | "not_solved";

export interface Attempt {
  id: string;
  problemId: string;
  startedAt: string;
  finishedAt?: string;
  minutes?: number;
  language: string;
  code: string;
  result?: AttemptResult;
  hintsUsed: 0 | 1 | 2 | 3;
  approach?: string; // markdown notes on the approach
  timeComplexity?: string;
  spaceComplexity?: string;
  mistakeTagIds: string[];
  mode: "normal" | "resolve" | "mock";
  review?: CodeReview; // AI code review result (F12)
  dryRuns?: { input: string; output: string; createdAt: string }[];
}

export interface CustomProblem {
  // problemId for custom problems: "custom-<nanoid>"
  title: string;
  url?: string;
  difficulty: Difficulty;
  source: ProblemSource;
  topicId?: TopicId;
  conceptIds: ConceptId[];
  prompt?: string;
}

/**
 * Autosaved, unsaved work in the workspace (F7). Besides the spec's language, code and updatedAt,
 * it keeps the attempt in progress (timer, hints, re-solve mode, reveals), so a reload never
 * loses work or quietly forgets that a hint was used.
 */
export interface ProblemDraft {
  language: string;
  code: string;
  updatedAt: string;
  mode?: "normal" | "resolve";
  /** When the attempt in progress started (ISO). */
  startedAt?: string;
  /** Time on the attempt timer. */
  elapsedMs?: number;
  /** Highest hint level shown during this attempt. */
  hintsUsed?: 0 | 1 | 2 | 3;
  /** The full solution was opened, or hidden notes were revealed in re-solve mode. */
  sawSolution?: boolean;
  /** Re-solve mode: the owner revealed the hidden attempts, insight and notes. */
  revealed?: boolean;
}

export interface ProblemState {
  problemId: string;
  custom?: CustomProblem; // present when the owner added a problem not in the seed
  status: "todo" | "attempted" | "solved";
  insight?: string; // one-line insight
  summary?: string; // owner's short restatement; stays visible in re-solve mode
  myNotes?: string; // owner's approach notes; hidden in re-solve mode until revealed
  starred: boolean;
  tags: string[]; // owner tags, e.g. company names
  /** Owner-corrected link, when the seed slug is wrong. */
  urlOverride?: string;
  srs: SrsState;
  inReview: boolean; // default true once solved
  attempts: Attempt[]; // newest last; cap at 30, warn the owner past 20
  draft?: ProblemDraft; // autosaved unsaved work
  hints?: { level: 1 | 2 | 3; text: string; createdAt: string }[]; // cached hint ladder output
  updatedAt: string;
}

export type MistakeCategory =
  "edge-case" | "logic" | "complexity" | "pattern" | "language" | "reading" | "other";

export interface MistakeTag {
  id: string;
  label: string;
  category: MistakeCategory;
  custom: boolean;
  description?: string;
  howToAvoid?: string;
  archived?: boolean;
  updatedAt: string;
}

export interface Check {
  id: string;
  conceptId: ConceptId;
  kind: "quiz" | "explain" | "flashcard" | "drill" | "manual";
  score: number; // 0..1
  detail?: unknown; // quiz answers, explain-back feedback JSON
  createdAt: string;
  updatedAt: string;
}

export interface PlanItem {
  id: string;
  kind:
    | "resolve"
    | "review-concept"
    | "learn-concept"
    | "new-problem"
    | "drill"
    | "mock"
    | "mental-math"
    | "revision"
    | "design"
    | "story";
  refId?: string; // conceptId or problemId
  refIds?: string[]; // for bundles, e.g. a flashcard item covering several concepts
  title: string;
  reason: string; // plain-language "why this is here"
  estMinutes: number;
  done: boolean;
  skipped: boolean;
}

export interface DayPlan {
  date: string; // yyyy-mm-dd, local time
  budgetMinutes: number;
  minimumDay: boolean;
  items: PlanItem[];
  generatedAt: string;
  updatedAt: string;
}

export interface ActivityDay {
  minutes: number;
  problemsSolved: number;
  reviews: number;
  conceptsTouched: number;
  /** Counters for "any attempt, check, or completed plan item" (section 11.7 active days). */
  attempts?: number;
  checks?: number;
  planItemsDone?: number;
  /** Concepts whose status changed to strong or fading that day (F4 "status changes are logged"). */
  turnedStrong?: number;
  turnedFading?: number;
}

export interface ActivityMonth {
  // aggregated to stay small
  month: string; // yyyy-mm
  days: Record<string, ActivityDay>; // key: yyyy-mm-dd
  streakFreezeUsed?: string[];
  updatedAt: string;
}

export interface MockSession {
  id: string;
  kind: "dsa" | "theory" | "design" | "behavioral";
  topicOrProblemId?: string;
  turns: { role: "user" | "assistant"; content: string }[];
  code?: string;
  feedback?: MockFeedback;
  phase?: string; // current phase, so a reload resumes correctly
  startedAt: string;
  endedAt?: string;
  updatedAt: string;
}

export interface DesignAttempt {
  // LLD and HLD practice (F26)
  id: string;
  problemId: string;
  sections: Record<string, string>; // requirements, entities, api, dataModel, diagram, tradeoffs…
  review?: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface StoryPractice {
  questionId: string;
  answer: string;
  critique?: unknown;
  createdAt: string;
}

export interface Story {
  // behavioral STAR story bank (F27)
  id: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  tags: string[];
  questionIds: string[];
  review?: unknown;
  practice?: StoryPractice[];
  updatedAt: string;
}

export interface CustomConcept {
  // owner-added bubble (F2)
  id: string; // "custom.<nanoid>"
  topicId: TopicId;
  name: string;
  scope: string;
  importance: Importance;
  createdAt: string;
  updatedAt: string;
}

export interface MentalMathRun {
  id: string;
  mode: string;
  correct: number;
  total: number;
  seconds: number;
  createdAt: string;
  updatedAt: string;
}

/** A bubble the owner dragged to a new place on the map. */
export interface MapOverride {
  nodeId: string;
  x: number;
  y: number;
  updatedAt: string;
}

/** A drill prompt Claude generated for the owner's weakest patterns (saved to the bank). */
export interface GeneratedDrill extends DrillPrompt {
  createdAt: string;
  updatedAt: string;
}
