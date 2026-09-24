// Concept statuses (section 4.2 ConceptState.status, section 11.2). The status is derived from
// evidence (checks, linked problem attempts, the review schedule) and cached in ConceptState, so
// the map and every list read it cheaply. `refreshConcepts` recomputes the given concepts and
// writes only the ones that changed; it runs after attempts are saved, on start and each new day.
import { create } from "zustand";
import { conceptById } from "@/data/syllabus";
import { computeStatus, nextConceptState } from "@/lib/mastery/status";
import { conceptsOfProblem, problemsForConcept } from "@/lib/problems/catalog";
import type { Repository } from "@/lib/storage/Repository";
import { localDate } from "@/lib/time";
import type { Check, ConceptState, Status } from "@/lib/types";
import { useProblemStore } from "./problemStore";
import { useProfileStore } from "./profileStore";

interface ConceptStateStore {
  states: Record<string, ConceptState>;
  /** Checks per concept (quiz, explain-back, flashcards, drills), newest last. */
  checks: Record<string, Check[]>;
}

export const useConceptStateStore = create<ConceptStateStore>(() => ({ states: {}, checks: {} }));

let repo: Repository | null = null;

export async function hydrateConceptStates(repository: Repository): Promise<void> {
  repo = repository;
  const [list, checkList] = await Promise.all([
    repository.conceptStates.list(),
    repository.checks.list(),
  ]);
  const states: Record<string, ConceptState> = {};
  for (const s of list) states[s.conceptId] = s;
  const checks: Record<string, Check[]> = {};
  for (const c of checkList.sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))) {
    (checks[c.conceptId] ??= []).push(c);
  }
  useConceptStateStore.setState({ states, checks });
}

export function detachConceptStates(): void {
  repo = null;
  useConceptStateStore.setState({ states: {}, checks: {} });
}

/**
 * Recomputes the status of each concept and saves the ones that changed. With `activityAt`, the
 * concepts' activity times are updated too (an attempt touched them). Returns how many of them
 * had no activity yet today (for the day's "concepts touched" counter).
 */
export function refreshConcepts(
  conceptIds: readonly string[],
  options: { activityAt?: string; now?: Date } = {},
): number {
  const now = options.now ?? new Date();
  const today = localDate(now);
  const intensity = useProfileStore.getState().profile?.reviewIntensity ?? "normal";
  const problems = useProblemStore.getState().states;
  const { states, checks } = useConceptStateStore.getState();
  const changed: ConceptState[] = [];
  let firstToday = 0;
  for (const id of new Set(conceptIds)) {
    const concept = conceptById.get(id);
    if (!concept) continue;
    const prev = states[id];
    const linked = problemsForConcept(id, problems).map((p) => ({
      id: p.id,
      difficulty: p.difficulty,
      state: problems[p.id],
    }));
    const result = computeStatus({
      concept,
      state: prev,
      checks: checks[id] ?? [],
      linked,
      today,
      now,
      intensity,
    });
    if (options.activityAt) {
      const last = prev?.lastActivityAt;
      if (!last || localDate(new Date(last)) !== today) firstToday++;
    }
    const next = nextConceptState(id, prev, result, now, options.activityAt);
    if (next) changed.push(next);
  }
  if (changed.length > 0) {
    const nextStates = { ...states };
    for (const s of changed) nextStates[s.conceptId] = s;
    useConceptStateStore.setState({ states: nextStates });
    repo?.conceptStates.bulkPut(changed).catch(() => undefined);
  }
  return firstToday;
}

/** Every concept with stored progress or a linked problem that has attempts. */
export function refreshAllConcepts(now: Date = new Date()): void {
  const ids = new Set(Object.keys(useConceptStateStore.getState().states));
  for (const s of Object.values(useProblemStore.getState().states)) {
    if (s.attempts.length === 0) continue;
    for (const c of conceptsOfProblem(s.problemId, s)) ids.add(c);
  }
  refreshConcepts([...ids], { now });
}

/** One concept's status; re-renders only when that concept's status changes. */
export function useConceptStatus(conceptId: string): Status {
  return useConceptStateStore((s) => s.states[conceptId]?.status ?? "not_started");
}
