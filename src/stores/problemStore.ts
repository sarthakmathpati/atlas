// Problem progress (F6, F7, F9): every ProblemState the owner has touched, keyed by problem id.
// Changes apply at once (optimistic) and are written through the Repository in the background.
// Saving an attempt also reschedules the problem (section 11.1), refreshes the linked concepts'
// statuses (section 11.2), logs activity and ticks off a matching Today item.
import { nanoid } from "nanoid";
import { create } from "zustand";
import { ATTEMPT_CAP, ATTEMPT_WARN } from "@/lib/constants";
import { csvAttemptId, type CsvImportOptions, type CsvPlan } from "@/lib/problems/csv";
import { conceptsOfProblem, problemInfo } from "@/lib/problems/catalog";
import { attemptsInOrder } from "@/lib/problems/progress";
import { replaySchedule, scheduleProblem, type ProblemScheduleResult } from "@/lib/srs/problem";
import { createProblemState } from "@/lib/storage/defaults";
import type { Repository } from "@/lib/storage/Repository";
import { localDate, nowIso } from "@/lib/time";
import type { Attempt, CustomProblem, ProblemDraft, ProblemState, Profile } from "@/lib/types";
import { recordActivity } from "./activityStore";
import { refreshConcepts } from "./conceptStateStore";
import { markPlanItemDone } from "./planEffects";
import { useProfileStore } from "./profileStore";
import { toast } from "./toastStore";

interface ProblemStoreState {
  states: Record<string, ProblemState>;
  loaded: boolean;
}

export const useProblemStore = create<ProblemStoreState>(() => ({ states: {}, loaded: false }));

let repo: Repository | null = null;

export async function hydrateProblems(repository: Repository): Promise<void> {
  repo = repository;
  const list = await repository.problemStates.list();
  const states: Record<string, ProblemState> = {};
  for (const s of list) states[s.problemId] = s;
  useProblemStore.setState({ states, loaded: true });
}

export function detachProblems(): void {
  repo = null;
  useProblemStore.setState({ states: {}, loaded: false });
}

function writeFailed() {
  toast("Couldn't save that change. Check that storage is available, then try again.", {
    tone: "error",
    id: "problem-write",
  });
}

/** Puts states in the store and writes them through. */
function commit(...next: ProblemState[]): void {
  if (next.length === 0) return;
  const states = { ...useProblemStore.getState().states };
  for (const s of next) states[s.problemId] = s;
  useProblemStore.setState({ states });
  if (!repo) return;
  (next.length === 1 ? repo.problemStates.put(next[0]!) : repo.problemStates.bulkPut(next)).catch(
    writeFailed,
  );
}

function intensity(): Profile["reviewIntensity"] {
  return useProfileStore.getState().profile?.reviewIntensity ?? "normal";
}

export function getProblemState(id: string): ProblemState | undefined {
  return useProblemStore.getState().states[id];
}

function stateOrNew(id: string): ProblemState {
  return getProblemState(id) ?? createProblemState(id);
}

/** Edits the owner's fields (insight, summary, notes, star, tags, link, review switch). */
export function updateProblem(
  id: string,
  changes: Partial<
    Pick<
      ProblemState,
      "insight" | "summary" | "myNotes" | "starred" | "tags" | "urlOverride" | "inReview"
    >
  >,
): void {
  const current = stateOrNew(id);
  const next: ProblemState = { ...current, ...changes, updatedAt: nowIso() };
  for (const key of Object.keys(changes) as (keyof typeof changes)[]) {
    if (changes[key] === undefined || changes[key] === "") delete next[key];
  }
  if (next.tags === undefined) next.tags = [];
  if (next.starred === undefined) next.starred = false;
  if (next.inReview === undefined) next.inReview = false;
  commit(next);
}

/** Saves (or clears, with null) the autosaved draft for a problem. */
export function saveDraft(id: string, draft: ProblemDraft | null): void {
  const current = getProblemState(id);
  if (!draft && !current?.draft) return;
  const base = current ?? createProblemState(id);
  const next: ProblemState = { ...base, updatedAt: nowIso() };
  if (draft) next.draft = draft;
  else delete next.draft;
  commit(next);
}

/** Puts a saved copy back (Undo). */
export function restoreProblem(state: ProblemState | null, id: string): void {
  if (state) {
    commit({ ...state, updatedAt: nowIso() });
    refreshConcepts(conceptsOfProblem(id, state));
    return;
  }
  const states = { ...useProblemStore.getState().states };
  const previous = states[id];
  delete states[id];
  useProblemStore.setState({ states });
  repo?.problemStates.delete(id).catch(writeFailed);
  if (previous) refreshConcepts(conceptsOfProblem(id, previous));
}

// ----- the owner's own problems ------------------------------------------------------------------

export function addCustomProblem(custom: CustomProblem, extra: { summary?: string } = {}): string {
  const id = `custom-${nanoid(10)}`;
  const state: ProblemState = { ...createProblemState(id), custom };
  if (extra.summary?.trim()) state.summary = extra.summary.trim();
  commit(state);
  return id;
}

export function updateCustomProblem(id: string, changes: Partial<CustomProblem>): void {
  const current = getProblemState(id);
  if (!current?.custom) return;
  const before = current.custom.conceptIds;
  const next: ProblemState = {
    ...current,
    custom: { ...current.custom, ...changes },
    updatedAt: nowIso(),
  };
  commit(next);
  refreshConcepts([...new Set([...before, ...(next.custom?.conceptIds ?? [])])]);
}

/** Deletes one of the owner's own problems; returns the removed state for Undo. */
export function deleteCustomProblem(id: string): ProblemState | null {
  const current = getProblemState(id);
  if (!current?.custom) return null;
  restoreProblem(null, id);
  return current;
}

// ----- attempts ------------------------------------------------------------------------------

export interface NewAttempt {
  problemId: string;
  startedAt: string;
  minutes?: number;
  language: string;
  code: string;
  result: NonNullable<Attempt["result"]>;
  hintsUsed: Attempt["hintsUsed"];
  approach?: string;
  timeComplexity?: string;
  spaceComplexity?: string;
  mistakeTagIds: string[];
  mode: Attempt["mode"];
  /** Replaces the problem's insight when given. */
  insight?: string;
}

export interface SavedAttempt {
  attempt: Attempt;
  state: ProblemState;
  previous: ProblemState | null;
  schedule: ProblemScheduleResult;
  /** "Attempt saved. Next review in 3 days." */
  message: string;
  trimmed: number;
}

function capAttempts(attempts: Attempt[]): { attempts: Attempt[]; trimmed: number } {
  const ordered = [...attempts].sort((a, b) =>
    (a.finishedAt ?? a.startedAt) < (b.finishedAt ?? b.startedAt) ? -1 : 1,
  );
  const trimmed = Math.max(0, ordered.length - ATTEMPT_CAP);
  return { attempts: trimmed ? ordered.slice(trimmed) : ordered, trimmed };
}

function nextReviewMessage(schedule: ProblemScheduleResult, inReview: boolean): string {
  if (schedule.newlyRetired) return "Attempt saved. Mastered: it won't come back for review.";
  if (schedule.srs.retired || !inReview) return "Attempt saved.";
  const d = schedule.intervalDays;
  return `Attempt saved. Next review ${d === 1 ? "tomorrow" : `in ${d} days`}.`;
}

/** Saves an attempt and everything that follows from it (F7 "On save"). */
export function saveAttempt(input: NewAttempt, now: Date = new Date()): SavedAttempt {
  const previous = getProblemState(input.problemId) ?? null;
  const base = previous ?? createProblemState(input.problemId, now);
  const info = problemInfo(input.problemId, base);
  const stamp = nowIso(now);
  const today = localDate(now);
  const attempt: Attempt = {
    id: nanoid(12),
    problemId: input.problemId,
    startedAt: input.startedAt,
    finishedAt: stamp,
    language: input.language,
    code: input.code,
    result: input.result,
    hintsUsed: input.hintsUsed,
    mistakeTagIds: [...new Set(input.mistakeTagIds)],
    mode: input.mode,
  };
  if (input.minutes !== undefined) attempt.minutes = input.minutes;
  for (const key of ["approach", "timeComplexity", "spaceComplexity"] as const) {
    const v = input[key]?.trim();
    if (v) attempt[key] = v;
  }

  const schedule = scheduleProblem({
    srs: base.srs,
    status: base.status,
    result: input.result,
    today,
    reviewedAt: stamp,
    difficulty: info?.difficulty ?? "medium",
    intensity: intensity(),
  });
  const firstAttempt = base.srs.dueAt === undefined;
  const { attempts, trimmed } = capAttempts([...base.attempts, attempt]);
  const next: ProblemState = {
    ...base,
    status: schedule.status,
    srs: schedule.srs,
    inReview: firstAttempt ? true : base.inReview,
    attempts,
    updatedAt: stamp,
  };
  delete next.draft;
  if (input.insight !== undefined) {
    const insight = input.insight.trim();
    if (insight) next.insight = insight;
    else delete next.insight;
  }
  commit(next);

  const solved = input.result === "solved_alone" || input.result === "solved_with_hints";
  const conceptIds = conceptsOfProblem(input.problemId, next);
  const touched = refreshConcepts(conceptIds, { activityAt: stamp, now });
  recordActivity(today, {
    attempts: 1,
    problemsSolved: solved ? 1 : 0,
    reviews: schedule.case === "due" ? 1 : 0,
    conceptsTouched: touched,
  });
  void markPlanItemDone(repo, today, input.problemId, ["resolve", "new-problem"]);

  let message = nextReviewMessage(schedule, next.inReview);
  if (trimmed > 0) message += ` The oldest attempt was removed to stay within ${ATTEMPT_CAP}.`;
  else if (attempts.length > ATTEMPT_WARN)
    message += ` ${attempts.length} attempts saved; Atlas keeps the latest ${ATTEMPT_CAP}.`;
  return { attempt, state: next, previous, schedule, message, trimmed };
}

/** Deletes one attempt (the schedule stays as it is). Returns the state before, for Undo. */
export function deleteAttempt(problemId: string, attemptId: string): ProblemState | null {
  const current = getProblemState(problemId);
  if (!current) return null;
  const attempts = current.attempts.filter((a) => a.id !== attemptId);
  if (attempts.length === current.attempts.length) return null;
  const hasSolve = attempts.some(
    (a) => a.result === "solved_alone" || a.result === "solved_with_hints",
  );
  const status: ProblemState["status"] = hasSolve
    ? "solved"
    : attempts.length > 0
      ? "attempted"
      : current.srs.dueAt
        ? "attempted"
        : "todo";
  commit({ ...current, attempts, status, updatedAt: nowIso() });
  refreshConcepts(conceptsOfProblem(problemId, current));
  return current;
}

// ----- CSV import --------------------------------------------------------------------------------

export interface CsvImportResult {
  problems: number;
  attempts: number;
  created: number;
  duplicates: number;
  snapshot: Record<string, ProblemState | null>;
}

/** Applies a CSV plan: attempts without code, new problems for unmatched rows, fresh schedules. */
export function applyCsvPlan(
  plan: CsvPlan,
  options: Pick<CsvImportOptions, "addUnmatched">,
  now: Date = new Date(),
): CsvImportResult {
  const stamp = nowIso(now);
  const working = new Map<string, ProblemState>();
  const snapshot: Record<string, ProblemState | null> = {};
  const newIds = new Map<string, string>();
  let attempts = 0;
  let duplicates = 0;
  let created = 0;

  const load = (id: string): ProblemState => {
    const existing = working.get(id) ?? getProblemState(id);
    if (!(id in snapshot)) snapshot[id] = getProblemState(id) ?? null;
    const s = existing
      ? { ...existing, attempts: [...existing.attempts] }
      : createProblemState(id, now);
    working.set(id, s);
    return s;
  };

  for (const row of plan.rows) {
    let id: string | undefined;
    if (row.status === "matched" && row.match) id = row.match.id;
    else if (row.status === "new" && options.addUnmatched && row.newKey) {
      id = newIds.get(row.newKey);
      if (!id) {
        id = `custom-${nanoid(10)}`;
        newIds.set(row.newKey, id);
        const s = load(id);
        s.custom = {
          title: row.title,
          difficulty: row.difficulty,
          source: row.url && /leetcode\./i.test(row.url) ? "leetcode" : "custom",
          conceptIds: [],
        };
        if (row.url) s.custom.url = row.url;
        created++;
      }
    }
    if (!id) continue;
    const s = load(id);
    const attemptId = csvAttemptId(id, row);
    if (s.attempts.some((a) => a.id === attemptId)) {
      duplicates++;
      continue;
    }
    const at = row.date ? `${row.date}T12:00:00` : null;
    const when = at ? new Date(at).toISOString() : stamp;
    const attempt: Attempt = {
      id: attemptId,
      problemId: id,
      startedAt: when,
      finishedAt: when,
      language: row.match?.language === "sql" ? "sql" : "text",
      code: "",
      result: row.result,
      hintsUsed: row.result === "solved_with_hints" ? 1 : 0,
      mistakeTagIds: [],
      mode: "normal",
    };
    if (row.minutes !== null) attempt.minutes = row.minutes;
    s.attempts.push(attempt);
    if (row.notes.trim()) {
      const note = row.notes.trim();
      if (!(s.myNotes ?? "").includes(note))
        s.myNotes = s.myNotes ? `${s.myNotes}\n\n${note}` : note;
    }
    attempts++;
  }

  const changed: ProblemState[] = [];
  for (const [id, s] of working) {
    const info = problemInfo(id, s);
    const { attempts: capped } = capAttempts(s.attempts);
    const replay = replaySchedule(
      attemptsInOrder({ ...s, attempts: capped }).map((a) => ({
        result: a.result,
        date: localDate(new Date(a.finishedAt ?? a.startedAt)),
        reviewedAt: a.finishedAt ?? a.startedAt,
      })),
      info?.difficulty ?? "medium",
      intensity(),
    );
    const hadSchedule = s.srs.dueAt !== undefined;
    changed.push({
      ...s,
      attempts: capped,
      srs: replay.srs,
      status: replay.status,
      inReview: hadSchedule ? s.inReview : capped.length > 0,
      updatedAt: stamp,
    });
  }
  commit(...changed);
  refreshConcepts([...new Set(changed.flatMap((s) => conceptsOfProblem(s.problemId, s)))]);
  return { problems: changed.length, attempts, created, duplicates, snapshot };
}

/** Undo for a CSV import: puts every touched problem back as it was. */
export function restoreSnapshot(snapshot: Record<string, ProblemState | null>): void {
  for (const [id, state] of Object.entries(snapshot)) restoreProblem(state, id);
}
