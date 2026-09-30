// Today's plan (F16). The planner (lib/planner) fills it on the first open of each day; the owner
// changes the budget or switches to a minimum day (which plans again, keeping what is done),
// marks items done, skips or swaps them, and adds more from the map, a path or the dashboard.
// Items complete themselves when the owner does the thing anywhere in the app (planEffects).
import { nanoid } from "nanoid";
import { create } from "zustand";
import { applySwap, keptOnReplan, planDay, type PlannerInput } from "@/lib/planner/planner";
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
      ...fresh.map((item) => ({
        ...item,
        id: nanoid(10),
        done: false,
        skipped: false,
        origin: "owner" as const,
      })),
    ],
    updatedAt: nowIso(),
  });
  return fresh.length;
}

/**
 * Adds items to another day's plan (tomorrow's, from the wrap-up note), reading that day's plan
 * from storage first so nothing already on it is lost.
 */
export async function addPlanItemsOn(
  date: string,
  items: readonly NewPlanItem[],
  budget?: number,
): Promise<number> {
  if (!usePlanStore.getState().plans[date] && repo) {
    const stored = await repo.dayPlans.get(date).catch(() => undefined);
    if (stored && !usePlanStore.getState().plans[date]) notePlanWritten(stored);
  }
  return addPlanItems(items, { date, budget });
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

// ----- the planner -------------------------------------------------------------------------------

/**
 * Plans the day when it hasn't been planned yet (the first open each day). Items the owner
 * already added (from the map or a path) stay, and the planner fills around them.
 */
export function ensurePlanned(input: PlannerInput): DayPlan | null {
  const current = usePlanStore.getState().plans[input.date];
  if (current?.plannedAt) return null;
  const base = current ?? emptyPlan(input.date, input.budget);
  const kept = base.items;
  const stamp = nowIso();
  const plan: DayPlan = {
    ...base,
    budgetMinutes: input.budget,
    minimumDay: input.minimumDay,
    items: [...kept, ...planDay(input, kept)],
    plannedAt: stamp,
    updatedAt: stamp,
  };
  write(plan);
  return plan;
}

/**
 * Plans again with a new budget or the minimum day switch. Done and skipped items and the
 * owner's own stay; everything else the planner added is planned afresh. Returns the plan
 * before, for Undo.
 */
export function replan(input: PlannerInput): DayPlan | null {
  const current = usePlanStore.getState().plans[input.date];
  const base = current ?? emptyPlan(input.date, input.budget);
  const kept = keptOnReplan(base.items);
  const stamp = nowIso();
  write({
    ...base,
    budgetMinutes: input.minimumDay ? base.budgetMinutes : input.budget,
    minimumDay: input.minimumDay,
    items: [...kept, ...planDay(input, kept)],
    plannedAt: stamp,
    updatedAt: stamp,
  });
  return current ?? null;
}

/** Skips an item (or brings it back). Skipped items don't count toward the day's minutes. */
export function setPlanItemSkipped(date: string, itemId: string, skipped: boolean): void {
  const plan = usePlanStore.getState().plans[date];
  const item = plan?.items.find((i) => i.id === itemId);
  if (!plan || !item || item.skipped === skipped) return;
  write({
    ...plan,
    items: plan.items.map((i) => (i.id === itemId ? { ...i, skipped, done: false } : i)),
    updatedAt: nowIso(),
  });
}

/** Swaps an item for an alternative of the same kind (from swapOptions). Returns the plan before. */
export function swapPlanItem(date: string, itemId: string, replacement: PlanItem): DayPlan | null {
  const plan = usePlanStore.getState().plans[date];
  if (!plan || !plan.items.some((i) => i.id === itemId)) return null;
  write({ ...plan, items: applySwap(plan.items, itemId, replacement), updatedAt: nowIso() });
  return plan;
}
