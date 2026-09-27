// Ticks off Today plan items when the owner does the thing somewhere else (F16 "items complete
// themselves"): saving an attempt (re-solves, new problems), a check or "Mark as studied"
// (concepts), finishing a drill session, reading or saving a revision sheet. A flashcard bundle
// is done once every concept in it has had a check that day.
import type { Repository } from "@/lib/storage/Repository";
import { nowIso } from "@/lib/time";
import type { PlanItem } from "@/lib/types";
import { recordActivity } from "./activityStore";
import { notePlanWritten, usePlanStore } from "./planStore";

let fallbackRepo: Repository | null = null;

/** The repository planEffects writes through when a caller has none of its own (drill, sheets). */
export function setPlanEffectsRepository(repo: Repository | null): void {
  fallbackRepo = repo;
}

export interface MarkOptions {
  /** Only items this returns true for (a bundle whose concepts are all checked). */
  isComplete?: (item: PlanItem) => boolean;
}

/**
 * Marks matching items done: of one of `kinds`, pointing at `refId` (any item of those kinds
 * when refId is null). Skipped items that the owner did anyway count as done too.
 * Returns how many were marked.
 */
export async function markPlanItemDone(
  repo: Repository | null,
  date: string,
  refId: string | null,
  kinds: PlanItem["kind"][],
  options: MarkOptions = {},
): Promise<number> {
  const store = repo ?? fallbackRepo;
  if (!store) return 0;
  try {
    const plan = usePlanStore.getState().plans[date] ?? (await store.dayPlans.get(date));
    if (!plan) return 0;
    let marked = 0;
    const items = plan.items.map((item) => {
      if (item.done || !kinds.includes(item.kind)) return item;
      if (refId !== null && item.refId !== refId && !item.refIds?.includes(refId)) return item;
      if (options.isComplete && !options.isComplete(item)) return item;
      marked++;
      return { ...item, done: true, skipped: false };
    });
    if (marked === 0) return 0;
    const next = { ...plan, items, updatedAt: nowIso() };
    // The store first, so a second mark right after this one reads the updated plan.
    notePlanWritten(next);
    recordActivity(date, { planItemsDone: marked });
    await store.dayPlans.put(next);
    return marked;
  } catch {
    return 0;
  }
}
