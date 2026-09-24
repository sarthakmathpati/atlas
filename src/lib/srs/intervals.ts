// Review intervals and "how late is it" (BUILD_SPEC.md 11.1 and 11.2). Pure functions on local
// dates (yyyy-mm-dd), so "due today" stays stable all day in the owner's time zone.
import {
  CONCEPT_STEPS_DAYS,
  DIFFICULTY_FACTOR,
  PROBLEM_STEPS_DAYS,
  REVIEW_INTENSITY,
} from "@/lib/constants";
import { daysBetween } from "@/lib/time";
import type { Difficulty, Profile } from "@/lib/types";

export type Intensity = Profile["reviewIntensity"];

export const PROBLEM_MAX_STEP = PROBLEM_STEPS_DAYS.length - 1;
export const CONCEPT_MAX_STEP = CONCEPT_STEPS_DAYS.length - 1;

const clampStep = (step: number, max: number) => Math.min(max, Math.max(0, Math.floor(step)));

/** Days until a problem comes back at `step`: steps × intensity × difficulty, at least 1. */
export function problemInterval(
  step: number,
  intensity: Intensity,
  difficulty: Difficulty,
): number {
  const base = PROBLEM_STEPS_DAYS[clampStep(step, PROBLEM_MAX_STEP)]!;
  return Math.max(
    1,
    Math.round(base * REVIEW_INTENSITY[intensity] * DIFFICULTY_FACTOR[difficulty]),
  );
}

/** Days until a concept comes back at `step`: steps × intensity, at least 1. */
export function conceptInterval(step: number, intensity: Intensity): number {
  const base = CONCEPT_STEPS_DAYS[clampStep(step, CONCEPT_MAX_STEP)]!;
  return Math.max(1, Math.round(base * REVIEW_INTENSITY[intensity]));
}

/** Days of slack before something counts as overdue: max(2 days, 25% of the interval). */
export function graceDays(intervalDays: number): number {
  return Math.max(2, 0.25 * intervalDays);
}

/** Whole days past the due date (0 when not yet due). */
export function daysOverdue(dueAt: string | undefined, today: string): number {
  if (!dueAt) return 0;
  return Math.max(0, daysBetween(dueAt, today));
}

/** Due today or earlier. */
export function isDue(dueAt: string | undefined, today: string): boolean {
  return Boolean(dueAt) && dueAt! <= today;
}

/** Past the due date by more than the grace period (section 11.2 "overdue"). */
export function isOverdue(dueAt: string | undefined, intervalDays: number, today: string): boolean {
  if (!dueAt) return false;
  return daysBetween(dueAt, today) > graceDays(intervalDays);
}
