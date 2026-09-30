// The day's plan for Today (F16): planned on the first open of the day (and after midnight), with
// the numbers the page head, Up next and the route share.
import { useEffect } from "react";
import { MINIMUM_DAY_MINUTES, planMinutes } from "@/lib/planner/planner";
import type { DayPlan, PlanItem } from "@/lib/types";
import { useMinutesOn } from "@/stores/activityStore";
import { useToday } from "@/stores/clockStore";
import { useDataReady } from "@/stores/hydrate";
import { ensurePlanned, replan, restorePlan, usePlanStore } from "@/stores/planStore";
import { useProfileStore } from "@/stores/profileStore";
import { toast } from "@/stores/toastStore";
import { plannerInputNow } from "../insight/useInsight";

export interface TodayPlan {
  plan: DayPlan;
  /** Minutes for today (15 on a minimum day). */
  budget: number;
  planned: number;
  done: number;
  /** Minutes of activity today (the activity clock). */
  activity: number;
  shown: PlanItem[];
  skipped: PlanItem[];
  /** The first item not done: Up next. */
  current: PlanItem | undefined;
  allDone: boolean;
  planAgain: (budget: number, minimumDay: boolean, message: string) => void;
}

/** Plans the day on the first open (and after midnight) and returns it, or null while planning. */
export function useTodayPlan(): TodayPlan | null {
  const profile = useProfileStore((s) => s.profile);
  const today = useToday();
  const ready = useDataReady((s) => s.ready);
  const plan = usePlanStore((s) => s.plans[today]);
  const activity = useMinutesOn(today);

  // Plan the day on the first open (and after midnight, once the new day's plan is loaded).
  useEffect(() => {
    if (!ready || !profile || plan?.plannedAt) return;
    const input = plannerInputNow({
      budget: plan?.budgetMinutes ?? profile.dailyMinutes,
      minimumDay: plan?.minimumDay ?? false,
    });
    if (input && input.date === today) ensurePlanned(input);
  }, [ready, profile, plan?.plannedAt, plan?.budgetMinutes, plan?.minimumDay, today]);

  if (!plan?.plannedAt) return null;
  const planAgain = (budget: number, minimumDay: boolean, message: string) => {
    const input = plannerInputNow({ budget, minimumDay });
    if (!input) return;
    const before = replan(input);
    toast(message, before ? { action: { label: "Undo", onClick: () => restorePlan(before) } } : {});
  };
  const { planned, done } = planMinutes(plan.items);
  const shown = plan.items.filter((i) => !i.skipped);
  return {
    plan,
    budget: plan.minimumDay ? MINIMUM_DAY_MINUTES : plan.budgetMinutes,
    planned,
    done,
    activity: Math.round(activity),
    shown,
    skipped: plan.items.filter((i) => i.skipped),
    current: shown.find((i) => !i.done),
    allDone: shown.length > 0 && shown.every((i) => i.done),
    planAgain,
  };
}
