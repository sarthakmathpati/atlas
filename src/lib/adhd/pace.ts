// The owner's pace (F32, part 3, "time you can see"): for each kind of plan item, the median
// ratio of the minutes it took to the minutes planned, over the latest 20 finished items. In ADHD
// mode estimates are shown scaled by it ("15 min planned, about 22 at your pace") and the Now
// card's disc runs for the scaled time. The plan itself is still fitted with the planner's own
// estimates (11.4), so it stays the same on every device and with ADHD mode off.
import { PACE_SAMPLES } from "@/lib/constants";
import type { PaceSample, PaceStat, PlanItem } from "@/lib/types";

/** A pace shows (and scales estimates) once this many items of a kind were timed. */
export const MIN_PACE_SAMPLES = 3;
/** Ratios are kept within these bounds, so one strange day can't make estimates absurd. */
export const PACE_MIN = 0.5;
export const PACE_MAX = 3;

export function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** The median ratio of took to planned, or null with fewer than MIN_PACE_SAMPLES samples. */
export function paceRatio(samples: readonly PaceSample[] | undefined): number | null {
  const ratios = (samples ?? []).filter((s) => s.planned > 0).map((s) => s.took / s.planned);
  if (ratios.length < MIN_PACE_SAMPLES) return null;
  const m = median(ratios)!;
  return Math.min(PACE_MAX, Math.max(PACE_MIN, m));
}

/** Minutes scaled by a pace (whole minutes, at least 1); unchanged without a pace. */
export function scaleMinutes(minutes: number, ratio: number | null): number {
  if (ratio === null || minutes <= 0) return minutes;
  return Math.max(1, Math.round(minutes * ratio));
}

/** Whole minutes from milliseconds of work (at least 1). */
export function tookMinutes(ms: number): number {
  return Math.max(1, Math.round(ms / 60_000));
}

/** The sample's id: the day and the plan item, so finishing an item twice counts once. */
export function sampleId(date: string, itemId: string): string {
  return `${date}:${itemId}`;
}

/** A kind's record with one more sample (replacing one with the same id), newest 20 kept. */
export function withSample(
  stat: PaceStat | undefined,
  kind: PlanItem["kind"],
  sample: PaceSample,
  stamp: string,
): PaceStat {
  const samples = (stat?.samples ?? []).filter((s) => s.id !== sample.id);
  samples.push(sample);
  samples.sort((a, b) => (a.at < b.at ? -1 : a.at > b.at ? 1 : 0));
  return { kind, samples: samples.slice(-PACE_SAMPLES), updatedAt: stamp };
}

/** "About the time planned", "about 1.4 times the plan" or "about 0.8 times the plan". */
export function describePace(ratio: number): string {
  if (ratio >= 0.9 && ratio <= 1.1) return "about the time planned";
  return `about ${ratio.toFixed(1)} times the plan`;
}

/** "Planned 15, took 22" after an item (F32). */
export function plannedTook(planned: number, took: number): string {
  return `Planned ${planned}, took ${took}`;
}
