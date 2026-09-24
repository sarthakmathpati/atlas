// Mistake tags (F8): the 33 defaults plus the owner's own. Add, rename, edit "how to avoid it",
// archive, and merge (which re-tags every attempt that used the merged tag).
import { create } from "zustand";
import { mergeTagInStates, newTagId } from "@/lib/mistakes/stats";
import type { Repository } from "@/lib/storage/Repository";
import { nowIso } from "@/lib/time";
import type { MistakeCategory, MistakeTag, ProblemState } from "@/lib/types";
import { restoreProblem, useProblemStore } from "./problemStore";
import { toast } from "./toastStore";

interface MistakeTagState {
  tags: Record<string, MistakeTag>;
  loaded: boolean;
}

export const useMistakeTagStore = create<MistakeTagState>(() => ({ tags: {}, loaded: false }));

let repo: Repository | null = null;

export async function hydrateMistakeTags(repository: Repository): Promise<void> {
  repo = repository;
  const list = await repository.mistakeTags.list();
  const tags: Record<string, MistakeTag> = {};
  for (const t of list) tags[t.id] = t;
  useMistakeTagStore.setState({ tags, loaded: true });
}

export function detachMistakeTags(): void {
  repo = null;
  useMistakeTagStore.setState({ tags: {}, loaded: false });
}

function failed() {
  toast("Couldn't save that change. Check that storage is available, then try again.", {
    tone: "error",
    id: "tag-write",
  });
}

function put(tag: MistakeTag): void {
  useMistakeTagStore.setState((s) => ({ tags: { ...s.tags, [tag.id]: tag } }));
  repo?.mistakeTags.put(tag).catch(failed);
}

export function addMistakeTag(
  label: string,
  category: MistakeCategory,
  howToAvoid?: string,
): MistakeTag {
  const tags = useMistakeTagStore.getState().tags;
  const existing = Object.values(tags).find(
    (t) => t.label.trim().toLowerCase() === label.trim().toLowerCase(),
  );
  if (existing) {
    if (existing.archived) updateMistakeTag(existing.id, { archived: false });
    return existing;
  }
  const tag: MistakeTag = {
    id: newTagId(label, new Set(Object.keys(tags))),
    label: label.trim(),
    category,
    custom: true,
    updatedAt: nowIso(),
  };
  if (howToAvoid?.trim()) tag.howToAvoid = howToAvoid.trim();
  put(tag);
  return tag;
}

export function updateMistakeTag(
  id: string,
  changes: Partial<
    Pick<MistakeTag, "label" | "category" | "howToAvoid" | "description" | "archived">
  >,
): void {
  const current = useMistakeTagStore.getState().tags[id];
  if (!current) return;
  const next: MistakeTag = { ...current, ...changes, updatedAt: nowIso() };
  if (!next.howToAvoid?.trim()) delete next.howToAvoid;
  if (!next.description?.trim()) delete next.description;
  if (!next.archived) delete next.archived;
  put(next);
}

/**
 * Merges `fromId` into `intoId`: every attempt tagged `fromId` gets `intoId` instead, and the
 * merged tag is removed. Returns an undo function that puts both back exactly.
 */
export function mergeMistakeTags(
  fromId: string,
  intoId: string,
): { attempts: number; undo: () => void } {
  const tags = useMistakeTagStore.getState().tags;
  const from = tags[fromId];
  if (!from || !tags[intoId] || fromId === intoId) return { attempts: 0, undo: () => {} };
  const problems = useProblemStore.getState().states;
  const { changed, attempts } = mergeTagInStates(problems, fromId, intoId, nowIso());
  const before: ProblemState[] = changed.map((c) => problems[c.problemId]!);
  useProblemStore.setState({
    states: { ...problems, ...Object.fromEntries(changed.map((c) => [c.problemId, c])) },
  });
  if (repo && changed.length) repo.problemStates.bulkPut(changed).catch(failed);
  const rest = { ...useMistakeTagStore.getState().tags };
  delete rest[fromId];
  useMistakeTagStore.setState({ tags: rest });
  repo?.mistakeTags.delete(fromId).catch(failed);
  return {
    attempts,
    undo: () => {
      put({ ...from, updatedAt: nowIso() });
      for (const s of before) restoreProblem(s, s.problemId);
    },
  };
}
