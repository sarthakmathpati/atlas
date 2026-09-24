// Ticks off a Today plan item when the owner does it somewhere else (F7 "mark a matching Today
// item done"). The planner arrives in phase 7; this already works on any stored plan.
import type { Repository } from "@/lib/storage/Repository";
import { nowIso } from "@/lib/time";
import type { PlanItem } from "@/lib/types";
import { recordActivity } from "./activityStore";
import { notePlanWritten, usePlanStore } from "./planStore";

export async function markPlanItemDone(
  repo: Repository | null,
  date: string,
  refId: string,
  kinds: PlanItem["kind"][],
): Promise<boolean> {
  if (!repo) return false;
  try {
    const plan = usePlanStore.getState().plans[date] ?? (await repo.dayPlans.get(date));
    if (!plan) return false;
    const index = plan.items.findIndex(
      (item) =>
        !item.done &&
        kinds.includes(item.kind) &&
        (item.refId === refId || item.refIds?.includes(refId)),
    );
    if (index < 0) return false;
    const items = plan.items.map((item, i) => (i === index ? { ...item, done: true } : item));
    const next = { ...plan, items, updatedAt: nowIso() };
    await repo.dayPlans.put(next);
    notePlanWritten(next);
    recordActivity(date, { planItemsDone: 1 });
    return true;
  } catch {
    return false;
  }
}
