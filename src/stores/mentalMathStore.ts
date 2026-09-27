// Mental math runs (F28): every finished sprint, kept for the history chart. Finishing a sprint
// also records a check on the mode's concepts, logs the activity and ticks off today's mental
// math item (F16). Stored through the Repository (one grouped document in the artifact, latest
// 300 runs).
import { nanoid } from "nanoid";
import { create } from "zustand";
import {
  SPRINT_MODES,
  sprintCheckScore,
  type SprintMode,
  type SprintTier,
} from "@/lib/quant/mentalMath";
import type { Repository } from "@/lib/storage/Repository";
import { localDate, nowIso } from "@/lib/time";
import type { MentalMathRun } from "@/lib/types";
import { recordChecks } from "./conceptStateStore";
import { markPlanItemDone } from "./planEffects";
import { toast } from "./toastStore";

interface MentalMathState {
  runs: Record<string, MentalMathRun>;
  loaded: boolean;
}

export const useMentalMathStore = create<MentalMathState>(() => ({ runs: {}, loaded: false }));

let repo: Repository | null = null;

const saveFailed = () =>
  toast("Couldn't save the sprint. Check that storage is available, then try again.", {
    tone: "error",
    id: "mental-math-save",
  });

export async function hydrateMentalMath(repository: Repository): Promise<void> {
  repo = repository;
  const list = await repository.mentalMath.list();
  useMentalMathStore.setState({
    runs: Object.fromEntries(list.map((r) => [r.id, r])),
    loaded: true,
  });
}

export function detachMentalMath(): void {
  repo = null;
  useMentalMathStore.setState({ runs: {}, loaded: false });
}

export interface FinishedSprint {
  mode: SprintMode;
  tier: SprintTier;
  correct: number;
  answered: number;
  seconds: number;
}

/** Saves a finished sprint and everything that follows from it. */
export function saveSprint(run: FinishedSprint, now: Date = new Date()): MentalMathRun {
  const stamp = nowIso(now);
  const total = SPRINT_MODES[run.mode].count;
  const record: MentalMathRun = {
    id: nanoid(12),
    mode: run.mode,
    tier: run.tier,
    correct: run.correct,
    total,
    answered: run.answered,
    seconds: Math.round(run.seconds),
    createdAt: stamp,
    updatedAt: stamp,
  };
  useMentalMathStore.setState((s) => ({ runs: { ...s.runs, [record.id]: record } }));
  repo?.mentalMath.put(record).catch(saveFailed);
  const score = sprintCheckScore(run.correct, total, run.tier);
  recordChecks(
    SPRINT_MODES[run.mode].conceptIds.map((conceptId) => ({
      conceptId,
      kind: "quiz" as const,
      score,
      detail: {
        source: "mental-math",
        mode: run.mode,
        tier: run.tier,
        correct: run.correct,
        total,
        seconds: record.seconds,
      },
    })),
    { now },
  );
  void markPlanItemDone(repo, localDate(now), null, ["mental-math"]);
  return record;
}

/** Runs of one mode, oldest first. */
export function runsOf(
  runs: Readonly<Record<string, MentalMathRun>>,
  mode: SprintMode,
): MentalMathRun[] {
  return Object.values(runs)
    .filter((r) => r.mode === mode)
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}
