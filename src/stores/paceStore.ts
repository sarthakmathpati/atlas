// The owner's pace per kind of plan item (F32, part 3): the latest 20 finished items' planned and
// actual minutes, one record per kind (synced as one `paceStats` document in the artifact).
// In ADHD mode the median ratio scales the estimates shown and the Now card's disc.
import { create } from "zustand";
import { paceRatio, withSample } from "@/lib/adhd/pace";
import type { Repository } from "@/lib/storage/Repository";
import { nowIso } from "@/lib/time";
import type { PaceSample, PaceStat, PlanItem } from "@/lib/types";

type Kind = PlanItem["kind"];

interface PaceState {
  stats: Partial<Record<Kind, PaceStat>>;
}

export const usePaceStore = create<PaceState>(() => ({ stats: {} }));

let repo: Repository | null = null;

export async function hydratePace(repository: Repository): Promise<void> {
  repo = repository;
  const list = await repository.paceStats.list();
  const stats: PaceState["stats"] = {};
  for (const s of list) stats[s.kind] = s;
  usePaceStore.setState({ stats });
}

export function detachPace(): void {
  repo = null;
  usePaceStore.setState({ stats: {} });
}

/** Adds a finished item's minutes to its kind's record and saves it. */
export function recordPace(kind: Kind, sample: PaceSample): void {
  const { stats } = usePaceStore.getState();
  const next = withSample(stats[kind], kind, sample, nowIso());
  usePaceStore.setState({ stats: { ...stats, [kind]: next } });
  repo?.paceStats.put(next).catch(() => undefined);
}

/** The pace for a kind (null until three items of it were timed). */
export function paceFor(kind: Kind): number | null {
  return paceRatio(usePaceStore.getState().stats[kind]?.samples);
}

/** The pace for a kind, re-rendering when it changes. */
export function usePace(kind: Kind | undefined): number | null {
  return usePaceStore((s) => (kind ? paceRatio(s.stats[kind]?.samples) : null));
}
