// Behavioral story bank (BUILD_SPEC.md F27): pure helpers for the Stories page. Stories link to
// questions from the bank many-to-many; the story's `questionIds` is the one record of a link, so
// "questions of a story" and "stories for a question" always agree. The coverage matrix is
// questions × stories. Practice answers are timed (2 minutes) and measured in words and speaking
// time at 140 words a minute (CLAUDE.md decision 73).
import { storyCritiqueSchema, type StoryCritique } from "@/lib/ai/schemas";
import type { BehavioralQuestion, Story, StoryPractice } from "@/lib/types";

/** Practice without a story is kept on this one (F27: a story titled "Unsorted practice"). */
export const UNSORTED_STORY_ID = "story-unsorted";
export const UNSORTED_TITLE = "Unsorted practice";
/** The "Tell me about yourself" script from the builder, kept as a story of kind "intro". */
export const INTRO_STORY_ID = "story-intro";
export const TMAY_QUESTION_ID = "bq-tell-me-about-yourself";

export const WORDS_PER_MINUTE = 140;
export const PRACTICE_SECONDS = 120;
/** The builder aims for a 90-second script: about 210 words at 140 words a minute. */
export const INTRO_TARGET_SECONDS = 90;

/** Stories the owner wrote (not the unsorted practice holder). */
export function ownStories(stories: readonly Story[]): Story[] {
  return stories.filter((s) => s.id !== UNSORTED_STORY_ID);
}

export function isIntro(story: Pick<Story, "kind" | "id">): boolean {
  return story.kind === "intro" || story.id === INTRO_STORY_ID;
}

// ----- links, both ways ---------------------------------------------------------------------------

/** Stories linked to a question. */
export function storiesForQuestion(stories: readonly Story[], questionId: string): Story[] {
  return ownStories(stories).filter((s) => s.questionIds.includes(questionId));
}

/** A story with a question linked or unlinked (the change behind both views). */
export function withQuestion(story: Story, questionId: string, linked: boolean): Story {
  const has = story.questionIds.includes(questionId);
  if (has === linked) return story;
  return {
    ...story,
    questionIds: linked
      ? [...story.questionIds, questionId]
      : story.questionIds.filter((id) => id !== questionId),
  };
}

/**
 * Questions that suit a story by its tags, best first (most shared tags), leaving out the ones
 * already linked.
 */
export function suggestedQuestions(
  story: Pick<Story, "tags" | "questionIds">,
  questions: readonly BehavioralQuestion[],
  limit = 5,
): BehavioralQuestion[] {
  const tags = new Set(story.tags.map((t) => t.toLowerCase()));
  if (tags.size === 0) return [];
  return questions
    .filter((q) => !story.questionIds.includes(q.id))
    .map((q) => ({ q, shared: q.suggestedTags.filter((t) => tags.has(t)).length }))
    .filter((x) => x.shared > 0)
    .sort((a, b) => b.shared - a.shared)
    .slice(0, limit)
    .map((x) => x.q);
}

// ----- coverage matrix ----------------------------------------------------------------------------

export interface CoverageRow {
  question: BehavioralQuestion;
  /** Stories linked to it, in the matrix's column order. */
  storyIds: string[];
  covered: boolean;
}

export interface CoverageMatrix {
  /** Columns: the owner's stories (the unsorted holder left out), in the order given. */
  stories: Story[];
  rows: CoverageRow[];
  covered: number;
  /** Questions with no story yet. */
  uncovered: BehavioralQuestion[];
  /** For each story, how many questions it answers. */
  perStory: Record<string, number>;
}

export function coverageMatrix(
  stories: readonly Story[],
  questions: readonly BehavioralQuestion[],
): CoverageMatrix {
  const columns = ownStories(stories);
  const known = new Set(questions.map((q) => q.id));
  const rows = questions.map((question) => {
    const storyIds = columns.filter((s) => s.questionIds.includes(question.id)).map((s) => s.id);
    return { question, storyIds, covered: storyIds.length > 0 };
  });
  const perStory: Record<string, number> = {};
  for (const s of columns) perStory[s.id] = s.questionIds.filter((id) => known.has(id)).length;
  return {
    stories: columns,
    rows,
    covered: rows.filter((r) => r.covered).length,
    uncovered: rows.filter((r) => !r.covered).map((r) => r.question),
    perStory,
  };
}

// ----- words and time -----------------------------------------------------------------------------

export function wordCount(text: string): number {
  const words = text.trim().match(/[\p{L}\p{N}][\p{L}\p{N}'’.,%-]*/gu);
  return words ? words.length : 0;
}

/** Speaking time in seconds at 140 words a minute. */
export function speakingSeconds(words: number, wpm = WORDS_PER_MINUTE): number {
  return Math.round((words * 60) / wpm);
}

/** 90 → "1:30". */
export function clockText(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** How a spoken length compares with a target: short, about right (±15 s) or long. */
export function lengthVerdict(seconds: number, target: number): "short" | "right" | "long" {
  if (seconds < target - 15) return "short";
  if (seconds > target + 15) return "long";
  return "right";
}

/** A story as one spoken answer (the STAR parts in order). */
export function storyText(story: Pick<Story, "situation" | "task" | "action" | "result">): string {
  return [story.situation, story.task, story.action, story.result]
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n\n");
}

/** The "Tell me about yourself" script from its three parts (present, past, why this role). */
export function introScript(parts: { present: string; past: string; why: string }): string {
  return [parts.present, parts.past, parts.why]
    .map((p) => p.trim())
    .filter(Boolean)
    .join("\n\n");
}

// ----- practice -----------------------------------------------------------------------------------

/** Concepts a practice answer records a check on (F27: career.behavioral concepts). */
export function practiceConcepts(questionId: string, fromStory: boolean): string[] {
  const c = (id: string) => `career.behavioral.${id}`;
  switch (questionId) {
    case TMAY_QUESTION_ID:
      return [c("tell-me-about-yourself")];
    case "bq-why-this-company":
    case "bq-why-this-role":
      return [c("why-this-company-and-why-this-role")];
    case "bq-do-you-have-any-questions-for-us":
      return [c("questions-to-ask-the-interviewer")];
    case "bq-where-do-you-see-yourself-in-3-years":
    case "bq-what-are-your-strengths-and-weaknesses":
    case "bq-why-should-we-hire-you":
    case "bq-what-would-you-do-in-your-first-90-days":
      return [c("company-values-questions")];
    default:
      return fromStory
        ? [c("the-star-method"), c("building-a-story-bank")]
        : [c("the-star-method")];
  }
}

/** The offline self-check after a practice answer: score = ticked / total. */
export const SELF_CHECK = [
  "I set the scene in a sentence or two.",
  "I said what I was responsible for.",
  "I said what I did, using “I”, not “we”.",
  "I gave a result with a number or a clear outcome.",
  "I said what I learned or would do differently.",
  "I finished within two minutes.",
] as const;

/** A 1 to 5 critique (prompt 13) as a check score: the mean of its four scores, out of 5. */
export function critiqueScore(c: {
  clarity: number;
  specificity: number;
  impact: number;
  structure: number;
}): number {
  return (c.clarity + c.specificity + c.impact + c.structure) / 20;
}

/** A random question for practice, from a seed (a given question wins). */
export function pickQuestion(
  questions: readonly BehavioralQuestion[],
  seed: number,
  avoid?: string,
): BehavioralQuestion | undefined {
  const pool = questions.filter((q) => q.id !== avoid);
  if (pool.length === 0) return questions[0];
  return pool[Math.abs(Math.floor(seed)) % pool.length];
}

/** Every practice with its story, newest first. */
export function allPractice(
  stories: readonly Story[],
): { story: Story; practice: StoryPractice }[] {
  return stories
    .flatMap((story) => (story.practice ?? []).map((practice) => ({ story, practice })))
    .sort((a, b) => (a.practice.createdAt < b.practice.createdAt ? 1 : -1));
}

/** Local dates with a practice, for the planner's history (story practice twice a week). */
export function practiceDates(stories: readonly Story[], toLocalDate: (iso: string) => string) {
  return [...new Set(allPractice(stories).map((p) => toLocalDate(p.practice.createdAt)))].sort();
}

/** A stored critique (typed unknown in the data) if it has the right shape. */
export function readCritique(value: unknown): StoryCritique | null {
  const parsed = storyCritiqueSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
