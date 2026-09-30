// Weekly stamps from the stores (12.10.7; the rule is in lib/insight/summit.ts).
import { getISOWeek } from "date-fns";
import { useMemo } from "react";
import { weekStart } from "@/lib/activity/heatmap";
import { isActiveDay } from "@/lib/activity/streak";
import { STAMP_WEEKS, weekStamps, type WeekStamp } from "@/lib/insight/summit";
import { addDaysToDate, parseLocalDate } from "@/lib/time";
import { useConceptStateStore } from "@/stores/conceptStateStore";
import { useProblemStore } from "@/stores/problemStore";
import { useActivityInsight } from "./useInsight";

export const isoWeekOf = (monday: string) => getISOWeek(parseLocalDate(monday));

/** Stamps among the given Mondays, from the stores. */
export function useStamps(mondays: readonly string[]): WeekStamp[] {
  const { lookup } = useActivityInsight();
  const checks = useConceptStateStore((s) => s.checks);
  const problems = useProblemStore((s) => s.states);
  return useMemo(
    () => weekStamps(mondays, (d) => isActiveDay(lookup(d)), checks, problems, isoWeekOf),
    [mondays, lookup, checks, problems],
  );
}

/** The last `count` weeks' Mondays, oldest first, ending with the week containing `today`. */
export function recentMondays(today: string, count = STAMP_WEEKS): string[] {
  const last = weekStart(today);
  return Array.from({ length: count }, (_, i) => addDaysToDate(last, -7 * (count - 1 - i)));
}
