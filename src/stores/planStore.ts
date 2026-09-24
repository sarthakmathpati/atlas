// Today's plan (F16). The planner that fills it arrives in phase 7; until then the owner adds
// items from the map ("Add to today's plan", "Show my path here") and ticks them off, and items
// complete themselves when the owner does the thing anywhere in the app (planEffects).
import { nanoid } from "nanoid";
import { create } from "zustand";
import type { Repository } from "@/lib/storage/Repository";
import { localDate, nowIso } from "@/lib/time";
import type { DayPlan, PlanItem } from "@/lib/types";
import { recordActivity } from "./activityStore";
import { toast } from "./toastStore";

interface PlanState {
  plans: Record<string, DayPlan>;
}

export const usePlanStore = create<PlanState>(() => ({ plans: {} }));

let repo: Repository | null = null;

export async function hydratePlan(repository: Repository, date = localDate()): Promise<void> {
  repo = repository;
  const plan = await repository.dayPlans.get(date);
  usePlanStore.setState((s) => {
    const plans = { ...s.plans };
    if (plan) plans[date] = plan;
    else delete plans[date];
    return { plans };
  });
}

export function detachPlan(): void {
  repo = null;
  usePlanStore.setState({ plans: {} });
}

/** Keeps the store in step with a plan written elsewhere (planEffects, another device). */
export function notePlanWritten(plan: DayPlan): void {
  usePlanStore.setState((s) => ({ plans: { ...s.plans, [plan.date]: plan } }));
}

const saveFailed = () =>
  toast("Couldn't save today's plan. Check that storage is available.", { tone: "error" });

function write(plan: DayPlan) {
  notePlanWritten(plan);
  repo?.dayPlans.put(plan).catch(saveFailed);
}

function emptyPlan(date: string, budget: number): DayPlan {
  const stamp = nowIso();
  return {
    date,
    budgetMinutes: budget,
    minimumDay: false,
    items: [],
    generatedAt: stamp,
    updatedAt: stamp,
  };
}

export type NewPlanItem = Omit<PlanItem, "id" | "done" | "skipped">;

/**
 * Adds items to a day's plan, skipping ones already on it (same kind and concept or problem).
 * Returns how many were added.
 */
export function addPlanItems(
  items: readonly NewPlanItem[],
  options: { date?: string; budget?: number } = {},
): number {
  const date = options.date ?? localDate();
  const current = usePlanStore.getState().plans[date] ?? emptyPlan(date, options.budget ?? 90);
  const fresh = items.filter(
    (item) =>
      !current.items.some(
        (x) => x.kind === item.kind && x.refId !== undefined && x.refId === item.refId,
      ),
  );
  if (fresh.length === 0) return 0;
  write({
    ...current,
    items: [
      ...current.items,
      ...fresh.map((item) => ({ ...item, id: nanoid(10), done: false, skipped: false })),
    ],
    updatedAt: nowIso(),
  });
  return fresh.length;
}

export function setPlanItemDone(date: string, itemId: string, done: boolean): void {
  const plan = usePlanStore.getState().plans[date];
  const item = plan?.items.find((i) => i.id === itemId);
  if (!plan || !item || item.done === done) return;
  write({
    ...plan,
    items: plan.items.map((i) => (i.id === itemId ? { ...i, done } : i)),
    updatedAt: nowIso(),
  });
  recordActivity(date, { planItemsDone: done ? 1 : -1 });
}

/** Removes an item. Returns the plan before, for Undo. */
export function removePlanItem(date: string, itemId: string): DayPlan | null {
  const plan = usePlanStore.getState().plans[date];
  if (!plan || !plan.items.some((i) => i.id === itemId)) return null;
  write({ ...plan, items: plan.items.filter((i) => i.id !== itemId), updatedAt: nowIso() });
  return plan;
}

export function restorePlan(plan: DayPlan): void {
  write({ ...plan, updatedAt: nowIso() });
}
