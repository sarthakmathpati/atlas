// Dates in Atlas use the owner's LOCAL time. "Day" boundaries are local midnight, and due dates
// are stored as local dates (yyyy-mm-dd) so "due today" stays stable all day (BUILD_SPEC.md 11).
import { addDays as addDaysFns, differenceInCalendarDays, parseISO } from "date-fns";

const pad = (n: number) => String(n).padStart(2, "0");

/** Current time as an ISO timestamp (UTC), used for createdAt / updatedAt. */
export function nowIso(now: Date = new Date()): string {
  return now.toISOString();
}

/** Local calendar date, yyyy-mm-dd. */
export function localDate(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local calendar month, yyyy-mm. */
export function localMonth(date: Date = new Date()): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
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

/** "45 min", "1 h", "2 h 15 min". */
export function formatMinutes(total: number): string {
  const rounded = Math.round(total);
  if (rounded < 60) return `${rounded} min`;
  const h = Math.floor(rounded / 60);
  const m = rounded % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}
