// Design practice (F26): every DesignAttempt, one per sitting. Sections autosave as the owner
// types; finishing an attempt keeps Claude's review or the owner's own review with it and saves
// an attempt on the design problem, so it counts as practice evidence for the classic concept
// (section 11.2) and ticks off today's design item (F16). Stored through the Repository (one
// document per attempt in the artifact).
import { nanoid } from "nanoid";
import { create } from "zustand";
import { overallFromPoints, readReview, resultFromOverall } from "@/lib/designs/designs";
import type { Repository } from "@/lib/storage/Repository";
import { localDate, nowIso } from "@/lib/time";
import type { DesignAttempt } from "@/lib/types";
import { markPlanItemDone } from "./planEffects";
import { saveAttempt, type SavedAttempt } from "./problemStore";
import { toast } from "./toastStore";

interface DesignState {
  attempts: Record<string, DesignAttempt>;
  loaded: boolean;
}

export const useDesignStore = create<DesignState>(() => ({ attempts: {}, loaded: false }));

let repo: Repository | null = null;

const saveFailed = () =>
  toast("Couldn't save the design. Check that storage is available, then try again.", {
    tone: "error",
    id: "design-save",
  });

export async function hydrateDesigns(repository: Repository): Promise<void> {
  repo = repository;
  const list = await repository.designs.list();
  useDesignStore.setState({
    attempts: Object.fromEntries(list.map((a) => [a.id, a])),
    loaded: true,
  });
}

export function detachDesigns(): void {
  repo = null;
  useDesignStore.setState({ attempts: {}, loaded: false });
}

function commit(a: DesignAttempt): void {
  useDesignStore.setState((s) => ({ attempts: { ...s.attempts, [a.id]: a } }));
  repo?.designs.put(a).catch(saveFailed);
}

export function getDesignAttempt(id: string): DesignAttempt | undefined {
  return useDesignStore.getState().attempts[id];
}

export function attemptsForProblem(
  attempts: Readonly<Record<string, DesignAttempt>>,
  problemId: string,
): DesignAttempt[] {
  return Object.values(attempts)
    .filter((a) => a.problemId === problemId)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

/** A new attempt (its sections empty); returns it. */
export function startDesign(
  problemId: string,
  options: { mode?: DesignAttempt["mode"]; mockId?: string } = {},
): DesignAttempt {
  const stamp = nowIso();
  const attempt: DesignAttempt = {
    id: `design-${nanoid(10)}`,
    problemId,
    sections: {},
    elapsedMs: 0,
    createdAt: stamp,
    updatedAt: stamp,
  };
  if (options.mode) attempt.mode = options.mode;
  if (options.mockId) attempt.mockId = options.mockId;
  commit(attempt);
  return attempt;
}

export function updateSection(id: string, key: string, value: string): void {
  const current = getDesignAttempt(id);
  if (!current || current.sections[key] === value) return;
  const sections = { ...current.sections };
  if (value.trim()) sections[key] = value;
  else delete sections[key];
  commit({ ...current, sections, updatedAt: nowIso() });
}

export function setDesignElapsed(id: string, elapsedMs: number): void {
  const current = getDesignAttempt(id);
  if (!current || Math.abs((current.elapsedMs ?? 0) - elapsedMs) < 1000) return;
  commit({ ...current, elapsedMs: Math.round(elapsedMs), updatedAt: nowIso() });
}

export function setDesignReview(id: string, review: unknown): void {
  const current = getDesignAttempt(id);
  if (!current) return;
  commit({ ...current, review, updatedAt: nowIso() });
}

export function setSelfReview(id: string, points: number[]): void {
  const current = getDesignAttempt(id);
  if (!current) return;
  commit({ ...current, selfReview: points, updatedAt: nowIso() });
}

/** Deletes an attempt; returns it for Undo. */
export function deleteDesignAttempt(id: string): DesignAttempt | null {
  const current = getDesignAttempt(id);
  if (!current) return null;
  useDesignStore.setState((s) => {
    const attempts = { ...s.attempts };
    delete attempts[id];
    return { attempts };
  });
  repo?.designs.delete(id).catch(saveFailed);
  return current;
}

export function restoreDesignAttempt(a: DesignAttempt): void {
  commit({ ...a, updatedAt: nowIso() });
}

/**
 * Finishes an attempt: stamps it, and saves an attempt on the design problem whose result comes
 * from the review (Claude's overall, else the owner's review of the rubric points), so it counts
 * as practice for the linked classic concept. Returns the saved problem attempt.
 */
export function finishDesign(id: string, now: Date = new Date()): SavedAttempt | null {
  const current = getDesignAttempt(id);
  if (!current) return null;
  const review = readReview(current.review);
  const overall = review
    ? review.overall
    : current.selfReview?.length
      ? overallFromPoints(current.selfReview)
      : null;
  if (overall === null) return null;
  const stamp = nowIso(now);
  commit({ ...current, finishedAt: stamp, updatedAt: stamp });
  const minutes = Math.max(1, Math.round((current.elapsedMs ?? 0) / 60_000));
  const saved = saveAttempt(
    {
      problemId: current.problemId,
      startedAt: current.createdAt,
      minutes,
      language: "text",
      code: current.sections.code ?? "",
      result: resultFromOverall(overall),
      hintsUsed: 0,
      approach: current.sections.sketch ? `Sketch:\n\n${current.sections.sketch}` : undefined,
      mistakeTagIds: [],
      mode: current.mode === "mock" ? "mock" : "normal",
      designAttemptId: current.id,
      keepOutOfReview: true,
    },
    now,
  );
  void markPlanItemDone(repo, localDate(now), null, ["design"]);
  return saved;
}

/** Dates of finished attempts (the planner's weekly design practice reads them). */
export function designDates(
  attempts: Readonly<Record<string, DesignAttempt>>,
  toLocalDate: (iso: string) => string,
): string[] {
  return [
    ...new Set(
      Object.values(attempts)
        .filter((a) => a.finishedAt)
        .map((a) => toLocalDate(a.finishedAt!)),
    ),
  ].sort();
}
