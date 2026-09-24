// Dates in Atlas use the owner's LOCAL time. "Day" boundaries are local midnight, and due dates
// are stored as local dates (yyyy-mm-dd) so "due today" stays stable all day (BUILD_SPEC.md 11).
import { addDays as addDaysFns, differenceInCalendarDays, format, parseISO } from "date-fns";

/** Current time as an ISO timestamp (UTC), used for createdAt / updatedAt. */
export function nowIso(now: Date = new Date()): string {
  return now.toISOString();
}

/** Local calendar date, yyyy-mm-dd. */
export function localDate(date: Date = new Date()): string {
  return format(date, "yyyy-MM-dd");
}

/** Local calendar month, yyyy-mm. */
export function localMonth(date: Date = new Date()): string {
  return format(date, "yyyy-MM");
}

/** Parses a yyyy-mm-dd string as a local date at midnight. */
export function parseLocalDate(day: string): Date {
  return parseISO(day);
}

/** Adds whole days to a yyyy-mm-dd date and returns yyyy-mm-dd. */
export function addDaysToDate(day: string, days: number): string {
  return localDate(addDaysFns(parseLocalDate(day), days));
}

/** Calendar days from `a` to `b` (both yyyy-mm-dd); positive when b is later. */
export function daysBetween(a: string, b: string): number {
  return differenceInCalendarDays(parseLocalDate(b), parseLocalDate(a));
}
