// Active days and streaks (BUILD_SPEC.md 11.7, F29). Pure functions over local dates.
//
// - A day is active with at least 10 minutes of activity, or any attempt, check, review or
//   completed plan item.
// - The streak counts consecutive active days ending today, or ending yesterday while today is
//   not active yet (today isn't over).
// - One freeze per ISO week covers a single missed day when the day after it is active (and the
//   day before it is active too, so two missed days in a row always end the streak). A frozen day
//   keeps the streak alive but doesn't add to it.
import { getISOWeek, getISOWeekYear } from "date-fns";
import { ACTIVE_DAY_MINUTES } from "@/lib/constants";
import { addDaysToDate, parseLocalDate } from "@/lib/time";
import type { ActivityDay, ActivityMonth } from "@/lib/types";

export function isActiveDay(day: ActivityDay | undefined): boolean {
  if (!day) return false;
  return (
    day.minutes >= ACTIVE_DAY_MINUTES ||
    day.problemsSolved > 0 ||
    day.reviews > 0 ||
    (day.attempts ?? 0) > 0 ||
    (day.checks ?? 0) > 0 ||
    (day.planItemsDone ?? 0) > 0
  );
}

export type DayLookup = (date: string) => ActivityDay | undefined;

/** Looks days up across ActivityMonth records (keyed by yyyy-mm). */
export function dayLookup(months: Iterable<ActivityMonth>): DayLookup {
  const byMonth = new Map<string, ActivityMonth>();
  for (const m of months) byMonth.set(m.month, m);
  return (date) => byMonth.get(date.slice(0, 7))?.days[date];
}

export interface StreakInfo {
  /** Consecutive active days (frozen days not counted). */
  current: number;
  activeToday: boolean;
  /** Missed days the weekly freeze covered, newest first. */
  frozenDays: string[];
}

function isoWeekKey(date: string): string {
  const d = parseLocalDate(date);
  return `${getISOWeekYear(d)}-W${getISOWeek(d)}`;
}

const MAX_DAYS = 3660;

export function computeStreak(
  lookup: DayLookup,
  today: string,
  freezeEnabled: boolean,
): StreakInfo {
  const active = (date: string) => isActiveDay(lookup(date));
  const activeToday = active(today);
  let day = activeToday ? today : addDaysToDate(today, -1);
  let current = 0;
  const frozenDays: string[] = [];
  const weeksUsed = new Set<string>();

  for (let i = 0; i < MAX_DAYS; i++) {
    if (active(day)) {
      current++;
      day = addDaysToDate(day, -1);
      continue;
    }
    if (!freezeEnabled || current === 0) break;
    const before = addDaysToDate(day, -1);
    const week = isoWeekKey(day);
    // The day after `day` is active (we just counted it). Cover `day` only if it is a single
    // missed day and this week's freeze is still unused.
    if (!active(before) || weeksUsed.has(week)) break;
    weeksUsed.add(week);
    frozenDays.push(day);
    day = before;
  }
  return { current, activeToday, frozenDays };
}

/** Minutes recorded for one local date. */
export function minutesOn(lookup: DayLookup, date: string): number {
  return lookup(date)?.minutes ?? 0;
}
