// Gentle language (F32, part 11): "Fresh start" on Review, offered when more than 30 items are
// overdue. It spreads the overdue items over the next 7 days (today first), keeping their order
// (the most urgent first) and their intervals: only due dates move, and it can be undone.
// "Welcome back" greets the owner after 3 days or more away, without counting missed days.
import { addDaysToDate, daysBetween } from "@/lib/time";
import type { ActivityDay } from "@/lib/types";
import { isActiveDay } from "@/lib/activity/streak";

/** Fresh start is offered when more than this many items are overdue. */
export const FRESH_START_OVER = 30;
export const FRESH_START_DAYS = 7;

export interface OverdueItem {
  /** "problem:lc-1" or "concept:os.deadlocks.deadlock-conditions". */
  key: string;
  dueAt: string;
}

export interface QueueEntry {
  key: string;
  dueAt: string;
  daysLate: number;
}

/**
 * The overdue items of the review queue in one list, most urgent first: the problems and the
 * concepts (each already in its own urgency order) merged by days late, so each keeps its order.
 */
export function mergeOverdue(
  problems: readonly QueueEntry[],
  concepts: readonly QueueEntry[],
): OverdueItem[] {
  const a = problems.filter((x) => x.daysLate > 0);
  const b = concepts.filter((x) => x.daysLate > 0);
  const out: OverdueItem[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    const takeA = j >= b.length || (i < a.length && a[i]!.daysLate >= b[j]!.daysLate);
    const next = takeA ? a[i++]! : b[j++]!;
    out.push({ key: next.key, dueAt: next.dueAt });
  }
  return out;
}

/**
 * New due dates for overdue items given most urgent first: an even share per day over
 * `days` days from today, earlier items on earlier days.
 */
export function freshStartDates(
  items: readonly OverdueItem[],
  today: string,
  days = FRESH_START_DAYS,
): Map<string, string> {
  const out = new Map<string, string>();
  const n = items.length;
  items.forEach((item, i) => {
    const offset = Math.min(days - 1, Math.floor((i * days) / n));
    out.set(item.key, addDaysToDate(today, offset));
  });
  return out;
}

/** Welcome back after this many days or more since the last active day. */
export const WELCOME_BACK_DAYS = 3;

/** The most recent active day before today (looking back up to a year), or null. */
export function lastActiveBefore(
  lookup: (date: string) => ActivityDay | undefined,
  today: string,
  maxDays = 400,
): string | null {
  for (let i = 1; i <= maxDays; i++) {
    const date = addDaysToDate(today, -i);
    if (isActiveDay(lookup(date))) return date;
  }
  return null;
}

/** True on a day the owner comes back after 3 or more days away (never on a first day). */
export function welcomeBackDue(
  lookup: (date: string) => ActivityDay | undefined,
  today: string,
): boolean {
  const last = lastActiveBefore(lookup, today);
  return last !== null && daysBetween(last, today) >= WELCOME_BACK_DAYS;
}
