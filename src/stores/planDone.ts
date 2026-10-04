// What happens to a plan item at the moment it turns done, wherever that happens (Done on Today,
// or an item completing itself through planEffects). ADHD mode (F32) registers a finisher that
// ticks the item's remaining steps, notes how long it took and records the pace; without one,
// or with ADHD mode off, the item is written as it is. A registry rather than an import, so the
// plan store doesn't depend on the stores that read it.
import type { PlanItem } from "@/lib/types";

export interface DoneContext {
  /** Minutes the caller knows the work took (a saved attempt's minutes). */
  took?: number;
}

/** Returns the item to store (a copy with changes, or the same item). */
export type PlanItemFinisher = (date: string, item: PlanItem, context: DoneContext) => PlanItem;

/** Hears a day's plan after an item turned done (ADHD mode's finished-day flag). */
export type PlanDoneListener = (date: string, items: readonly PlanItem[]) => void;

let finisher: PlanItemFinisher | null = null;
let listener: PlanDoneListener | null = null;

export function setPlanItemFinisher(next: PlanItemFinisher | null): void {
  finisher = next;
}

export function setPlanDoneListener(next: PlanDoneListener | null): void {
  listener = next;
}

/** The item as it should be stored now that it is done. */
export function finishPlanItem(date: string, item: PlanItem, context: DoneContext = {}): PlanItem {
  if (!finisher) return item;
  try {
    return finisher(date, item, context);
  } catch (e) {
    console.error("Finishing a plan item failed", e);
    return item;
  }
}

/** Tells the listener a day's items after some turned done. */
export function notePlanItemsDone(date: string, items: readonly PlanItem[]): void {
  try {
    listener?.(date, items);
  } catch (e) {
    console.error("A plan listener failed", e);
  }
}
