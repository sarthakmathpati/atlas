// Concept statuses (section 4.2 ConceptState.status, section 11.2). The status is derived from
// evidence (checks, linked problem attempts, the review schedule) and cached in ConceptState, so
// the map and every list read it cheaply. `refreshConcepts` recomputes the given concepts and
// writes only the ones that changed; it runs after attempts and checks are saved, after the
// owner marks a concept studied or sets a status, on start and each new day.
//
// The owner's actions on a concept (mark studied, manual status, never fade, hide, checks from
// flashcards and explain-it-back) live here too, so the review schedule (section 11.1, concepts),
// the status and the day's activity always move together.
import { nanoid } from "nanoid";
import { create } from "zustand";
import { computeStatus, nextConceptState, type StatusResult } from "@/lib/mastery/status";
import { conceptsOfProblem, problemsForConcept } from "@/lib/problems/catalog";
import { applyConceptReview, startConceptReview } from "@/lib/srs/concept";
import { createConceptState } from "@/lib/storage/defaults";
import type { Repository } from "@/lib/storage/Repository";
import { localDate, nowIso } from "@/lib/time";
import type { Check, ConceptState, Status } from "@/lib/types";
import { recordActivity } from "./activityStore";
import { findConcept } from "./customConceptStore";
import { noteInked } from "./inkStore";
import { markPlanItemDone } from "./planEffects";
import { useProblemStore } from "./problemStore";
import { useProfileStore } from "./profileStore";
import { toast } from "./toastStore";

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

const intensity = () => useProfileStore.getState().profile?.reviewIntensity ?? "normal";

const saveFailed = () =>
  toast("Couldn't save that change. Check that storage is available, then try again.", {
    tone: "error",
    id: "concept-save",
  });

/** Writes concept states to the store and to storage. */
function commitStates(list: ConceptState[]): void {
  if (list.length === 0) return;
  const states = { ...useConceptStateStore.getState().states };
  for (const s of list) states[s.conceptId] = s;
  useConceptStateStore.setState({ states });
  repo?.conceptStates.bulkPut(list).catch(saveFailed);
}

/** The status engine's full result for one concept, from the stores (for "Why this color?"). */
export function evaluateConcept(conceptId: string, now: Date = new Date()): StatusResult | null {
  const concept = findConcept(conceptId);
  if (!concept) return null;
  const problems = useProblemStore.getState().states;
  const { states, checks } = useConceptStateStore.getState();
  return computeStatus({
    concept,
    state: states[conceptId],
    checks: checks[conceptId] ?? [],
    linked: problemsForConcept(conceptId, problems).map((p) => ({
      id: p.id,
      difficulty: p.difficulty,
      state: problems[p.id],
    })),
    today: localDate(now),
    now,
    intensity: intensity(),
  });
}

/**
 * Recomputes the status of each concept and saves the ones that changed. With `activityAt`, the
 * concepts' activity times are updated too (an attempt or check touched them). Returns how many
 * of them had no activity yet today (for the day's "concepts touched" counter).
 */
export function refreshConcepts(
  conceptIds: readonly string[],
  options: { activityAt?: string; now?: Date } = {},
): number {
  const now = options.now ?? new Date();
  const today = localDate(now);
  const { states } = useConceptStateStore.getState();
  const changed: ConceptState[] = [];
  const inked: string[] = [];
  let firstToday = 0;
  let turnedStrong = 0;
  let turnedFading = 0;
  for (const id of new Set(conceptIds)) {
    const result = evaluateConcept(id, now);
    if (!result) continue;
    const prev = states[id];
    if (options.activityAt) {
      const last = prev?.lastActivityAt;
      if (!last || localDate(new Date(last)) !== today) firstToday++;
    }
    const next = nextConceptState(id, prev, result, now, options.activityAt);
    if (!next) continue;
    changed.push(next);
    const before = prev?.status ?? "not_started";
    if (next.status !== before) {
      if (next.status === "strong") {
        turnedStrong++;
        inked.push(id);
      } else if (next.status === "fading") turnedFading++;
    }
  }
  commitStates(changed);
  if (inked.length) noteInked(inked);
  if (turnedStrong || turnedFading) recordActivity(today, { turnedStrong, turnedFading });
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

export function useConceptState(conceptId: string): ConceptState | undefined {
  return useConceptStateStore((s) => s.states[conceptId]);
}

// ----- the owner's actions on a concept ------------------------------------------------------

/**
 * Changes one concept's stored state, then recomputes its status. Returns the state before the
 * change (null when there was none), so the caller can offer Undo.
 */
function editConcept(
  conceptId: string,
  change: (state: ConceptState) => void,
  options: { activity?: boolean; now?: Date } = {},
): ConceptState | null {
  const now = options.now ?? new Date();
  const prev = useConceptStateStore.getState().states[conceptId] ?? null;
  const next = structuredClone(prev ?? createConceptState(conceptId, now));
  change(next);
  next.updatedAt = nowIso(now);
  commitStates([next]);
  const stamp = nowIso(now);
  const touched = refreshConcepts([conceptId], {
    now,
    activityAt: options.activity ? stamp : undefined,
  });
  if (options.activity && touched) recordActivity(localDate(now), { conceptsTouched: touched });
  return prev;
}

/** Puts a concept's state back as it was (Undo). */
export function restoreConceptState(conceptId: string, previous: ConceptState | null): void {
  const now = new Date();
  if (previous) commitStates([{ ...previous, updatedAt: nowIso(now) }]);
  else {
    const states = { ...useConceptStateStore.getState().states };
    delete states[conceptId];
    useConceptStateStore.setState({ states });
    repo?.conceptStates.delete(conceptId).catch(saveFailed);
  }
  refreshConcepts([conceptId], { now });
}

/** "Mark as studied": knowledge is at least 0.3 and the concept enters review (due in 2 days). */
export function markStudied(conceptId: string, studied = true): ConceptState | null {
  const today = localDate();
  const prev = editConcept(
    conceptId,
    (s) => {
      s.studied = studied;
      if (studied) s.srs = startConceptReview(s.srs, today, intensity());
    },
    { activity: studied },
  );
  if (studied) void markPlanItemDone(repo, today, conceptId, ["learn-concept"]);
  return prev;
}

/**
 * Sets (or with null, clears) the owner's manual status. A manual "strong" also records a manual
 * check (it counts as 0.8 knowledge, section 11.2), which starts the review schedule, so it still
 * fades when a review is overdue unless "never fade" is on.
 */
export function setManualStatus(conceptId: string, status: Status | null): ConceptState | null {
  const prev = editConcept(conceptId, (s) => {
    if (status) s.manualStatus = status;
    else delete s.manualStatus;
  });
  if (status === "strong") recordChecks([{ conceptId, kind: "manual", score: 1 }]);
  return prev;
}

export function setNeverFade(conceptId: string, on: boolean): ConceptState | null {
  return editConcept(conceptId, (s) => {
    if (on) s.neverFade = true;
    else delete s.neverFade;
  });
}

export function setHidden(conceptId: string, hidden: boolean): ConceptState | null {
  return editConcept(conceptId, (s) => {
    if (hidden) s.hidden = true;
    else delete s.hidden;
  });
}

/** Remembers the depth last opened (Simple, Interview, Deep) for this concept. */
export function setLastLevel(conceptId: string, level: ConceptState["lastLevelOpened"]): void {
  const prev = useConceptStateStore.getState().states[conceptId];
  if (prev?.lastLevelOpened === level) return;
  const next = structuredClone(prev ?? createConceptState(conceptId));
  next.lastLevelOpened = level;
  next.updatedAt = nowIso();
  commitStates([next]);
}

/** Writes onboarding self-assessment results and recomputes their statuses. */
export function applyConceptStates(list: ConceptState[]): void {
  commitStates(list);
  refreshConcepts(list.map((s) => s.conceptId));
}

export interface NewCheck {
  conceptId: string;
  kind: Check["kind"];
  score: number;
  detail?: unknown;
}

export interface RecordedChecks {
  checks: Check[];
  /** Concepts whose review schedule moved (they were due, or this was a review session). */
  reviewed: string[];
}

/**
 * Records checks (flashcards, explain it back, manual) and updates each concept's review schedule
 * (section 11.1, concepts): the first check puts a concept into review; a check while it is due
 * moves the step by the score. Then statuses, the day's activity and a matching Today item.
 * With `session`, the checks come from an explicit concept review and count even before the due
 * date.
 */
export function recordChecks(
  entries: readonly NewCheck[],
  options: { session?: boolean; now?: Date } = {},
): RecordedChecks {
  const now = options.now ?? new Date();
  const stamp = nowIso(now);
  const today = localDate(now);
  const { states, checks } = useConceptStateStore.getState();
  const created: Check[] = [];
  const nextChecks = { ...checks };
  const nextStates: ConceptState[] = [];
  const reviewed: string[] = [];
  for (const e of entries) {
    if (!findConcept(e.conceptId)) continue;
    const check: Check = {
      id: nanoid(12),
      conceptId: e.conceptId,
      kind: e.kind,
      score: Math.min(1, Math.max(0, e.score)),
      createdAt: stamp,
      updatedAt: stamp,
    };
    if (e.detail !== undefined) check.detail = e.detail;
    created.push(check);
    nextChecks[e.conceptId] = [...(nextChecks[e.conceptId] ?? []), check];

    const prev = nextStates.find((s) => s.conceptId === e.conceptId) ?? states[e.conceptId];
    const state = structuredClone(prev ?? createConceptState(e.conceptId, now));
    const srs = applyConceptReview(state.srs, {
      score: check.score,
      today,
      reviewedAt: stamp,
      intensity: intensity(),
      session: options.session,
    });
    if (srs.lastReviewedAt === stamp && state.srs.lastReviewedAt !== stamp)
      reviewed.push(e.conceptId);
    state.srs = srs;
    state.updatedAt = stamp;
    const at = nextStates.findIndex((s) => s.conceptId === e.conceptId);
    if (at >= 0) nextStates[at] = state;
    else nextStates.push(state);
  }
  if (created.length === 0) return { checks: [], reviewed: [] };
  useConceptStateStore.setState({ checks: nextChecks });
  repo?.checks.bulkPut(created).catch(saveFailed);
  commitStates(nextStates);
  const ids = nextStates.map((s) => s.conceptId);
  const touched = refreshConcepts(ids, { activityAt: stamp, now });
  recordActivity(today, {
    checks: created.length,
    reviews: reviewed.length,
    conceptsTouched: touched,
  });
  for (const id of ids) {
    void markPlanItemDone(repo, today, id, ["review-concept", "learn-concept"]);
  }
  return { checks: created, reviewed };
}
