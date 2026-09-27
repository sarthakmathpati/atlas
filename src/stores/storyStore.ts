// The behavioral story bank (F27): stories, their links to questions, the "Tell me about
// yourself" script and every practice answer. Saving a practice records a check on the matching
// career.behavioral concepts, logs activity and ticks off today's story item (F16). Stored through
// the Repository (one document per story in the artifact).
import { nanoid } from "nanoid";
import { create } from "zustand";
import {
  INTRO_STORY_ID,
  practiceConcepts,
  TMAY_QUESTION_ID,
  UNSORTED_STORY_ID,
  UNSORTED_TITLE,
} from "@/lib/stories/stories";
import type { Repository } from "@/lib/storage/Repository";
import { localDate, nowIso } from "@/lib/time";
import type { Story, StoryPractice } from "@/lib/types";
import { recordChecks } from "./conceptStateStore";
import { markPlanItemDone } from "./planEffects";
import { toast } from "./toastStore";

interface StoryState {
  stories: Record<string, Story>;
  loaded: boolean;
}

export const useStoryStore = create<StoryState>(() => ({ stories: {}, loaded: false }));

let repo: Repository | null = null;

const saveFailed = () =>
  toast("Couldn't save the story. Check that storage is available, then try again.", {
    tone: "error",
    id: "story-save",
  });

export async function hydrateStories(repository: Repository): Promise<void> {
  repo = repository;
  const list = await repository.stories.list();
  useStoryStore.setState({
    stories: Object.fromEntries(list.map((s) => [s.id, s])),
    loaded: true,
  });
}

export function detachStories(): void {
  repo = null;
  useStoryStore.setState({ stories: {}, loaded: false });
}

function commit(story: Story): void {
  useStoryStore.setState((s) => ({ stories: { ...s.stories, [story.id]: story } }));
  repo?.stories.put(story).catch(saveFailed);
}

export function getStory(id: string): Story | undefined {
  return useStoryStore.getState().stories[id];
}

function blank(id: string, title: string, now: string): Story {
  return {
    id,
    kind: "star",
    title,
    situation: "",
    task: "",
    action: "",
    result: "",
    tags: [],
    questionIds: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** A new, empty story; returns its id. */
export function addStory(
  init: Partial<Pick<Story, "title" | "questionIds" | "tags">> = {},
): string {
  const stamp = nowIso();
  const story = blank(`story-${nanoid(10)}`, init.title?.trim() || "Untitled story", stamp);
  if (init.questionIds) story.questionIds = [...init.questionIds];
  if (init.tags) story.tags = [...init.tags];
  commit(story);
  return story.id;
}

export type StoryChanges = Partial<
  Pick<
    Story,
    "title" | "situation" | "task" | "action" | "result" | "tags" | "questionIds" | "review"
  >
>;

export function updateStory(id: string, changes: StoryChanges): void {
  const current = getStory(id);
  if (!current) return;
  const next: Story = { ...current, ...changes, updatedAt: nowIso() };
  if (changes.review === undefined && "review" in changes) delete next.review;
  commit(next);
}

/** Links or unlinks a question (the one record behind both directions). */
export function linkQuestion(storyId: string, questionId: string, linked: boolean): void {
  const current = getStory(storyId);
  if (!current) return;
  const has = current.questionIds.includes(questionId);
  if (has === linked) return;
  updateStory(storyId, {
    questionIds: linked
      ? [...current.questionIds, questionId]
      : current.questionIds.filter((q) => q !== questionId),
  });
}

/** Deletes a story; returns it for Undo. Practice on it goes with it. */
export function deleteStory(id: string): Story | null {
  const current = getStory(id);
  if (!current) return null;
  useStoryStore.setState((s) => {
    const stories = { ...s.stories };
    delete stories[id];
    return { stories };
  });
  repo?.stories.delete(id).catch(saveFailed);
  return current;
}

export function restoreStory(story: Story): void {
  commit({ ...story, updatedAt: nowIso() });
}

// ----- "Tell me about yourself" ----------------------------------------------------------------

export interface IntroParts {
  present: string;
  past: string;
  why: string;
}

/** The builder's script, kept as a story of kind "intro" linked to the question. */
export function saveIntro(parts: IntroParts): void {
  const stamp = nowIso();
  const current = getStory(INTRO_STORY_ID) ?? {
    ...blank(INTRO_STORY_ID, "Tell me about yourself", stamp),
    kind: "intro" as const,
    questionIds: [TMAY_QUESTION_ID],
  };
  commit({
    ...current,
    kind: "intro",
    situation: parts.present,
    task: parts.past,
    action: parts.why,
    updatedAt: stamp,
  });
}

export function introParts(story: Story | undefined): IntroParts {
  return {
    present: story?.situation ?? "",
    past: story?.task ?? "",
    why: story?.action ?? "",
  };
}

// ----- practice --------------------------------------------------------------------------------

export interface NewPractice {
  questionId: string;
  answer: string;
  /** The story it's about (or delivered); none keeps it under "Unsorted practice". */
  storyId?: string;
  mode: "typed" | "story";
  seconds?: number;
  critique?: unknown;
  /** 0 to 1: the critique's mean or the self-check. */
  score: number;
  selfCheck?: string[];
}

/** Saves a practice answer and records its check (F27). Returns the story it was saved on. */
export function savePractice(input: NewPractice, now: Date = new Date()): Story {
  const stamp = nowIso(now);
  const target =
    (input.storyId ? getStory(input.storyId) : undefined) ??
    getStory(UNSORTED_STORY_ID) ??
    blank(UNSORTED_STORY_ID, UNSORTED_TITLE, stamp);
  const entry: StoryPractice = {
    questionId: input.questionId,
    answer: input.answer.trim(),
    createdAt: stamp,
    mode: input.mode,
    score: Math.min(1, Math.max(0, input.score)),
  };
  if (input.seconds !== undefined) entry.seconds = Math.round(input.seconds);
  if (input.critique !== undefined) entry.critique = input.critique;
  if (input.selfCheck?.length) entry.selfCheck = input.selfCheck;
  const next: Story = {
    ...target,
    practice: [...(target.practice ?? []), entry],
    updatedAt: stamp,
  };
  commit(next);
  const fromStory = Boolean(input.storyId) && input.storyId !== UNSORTED_STORY_ID;
  recordChecks(
    practiceConcepts(input.questionId, fromStory).map((conceptId) => ({
      conceptId,
      kind: "explain" as const,
      score: entry.score!,
      detail: {
        source: "story-practice",
        questionId: input.questionId,
        storyId: next.id,
        mode: input.mode,
      },
    })),
    { now },
  );
  void markPlanItemDone(repo, localDate(now), null, ["story"]);
  return next;
}

/** Keeps Claude's critique on a practice saved earlier (asked for after saving). */
export function setPracticeCritique(storyId: string, createdAt: string, critique: unknown): void {
  const story = getStory(storyId);
  if (!story?.practice) return;
  const practice = story.practice.map((p) => (p.createdAt === createdAt ? { ...p, critique } : p));
  commit({ ...story, practice, updatedAt: nowIso() });
}

/** Deletes one practice entry; returns the story before, for Undo. */
export function deletePractice(storyId: string, createdAt: string): Story | null {
  const story = getStory(storyId);
  if (!story?.practice) return null;
  commit({
    ...story,
    practice: story.practice.filter((p) => p.createdAt !== createdAt),
    updatedAt: nowIso(),
  });
  return story;
}
