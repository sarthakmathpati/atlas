// Problem re-solve scheduling (BUILD_SPEC.md 11.1). Pure: given the problem's schedule before an
// attempt and the attempt's result, returns the new schedule, status and review flags.
//
// | Situation                   | Result                     | New step          | Other effects                 |
// | First ever attempt          | solved alone               | 1                 | solved, soloStreak = 1        |
// | First ever attempt          | solved with hints          | 0                 | solved, soloStreak = 0        |
// | First ever attempt          | saw solution / not solved  | 0                 | attempted (back tomorrow)     |
// | When due or overdue         | solved alone               | step + 1 (max 6)  | soloStreak += 1               |
// | When due or overdue         | solved with hints          | same step         | soloStreak = 0                |
// | When due or overdue         | saw solution / not solved  | 0                 | lapses += 1, soloStreak = 0   |
// | Early (before due)          | solved alone               | same step, from today | none                      |
// | Early (before due)          | anything else              | as the due rows   |                               |
//
// Retire (mastered) when a solo solve happens at step 5 or higher (the problem had reached the
// 60-day interval) and soloStreak ≥ 3. A retired problem that is later not solved alone comes back.
import { addDaysToDate } from "@/lib/time";
import type { AttemptResult, Difficulty, ProblemState, SrsState } from "@/lib/types";
import { isDue, PROBLEM_MAX_STEP, problemInterval, type Intensity } from "./intervals";

export const RETIRE_MIN_STEP = 5;
export const RETIRE_MIN_STREAK = 3;
export const TRICKY_LAPSES = 2;

export type ScheduleCase = "first" | "due" | "early";

export interface ProblemScheduleInput {
  srs: SrsState;
  status: ProblemState["status"];
  result: AttemptResult;
  /** Local date of the attempt (yyyy-mm-dd). */
  today: string;
  /** When the attempt was saved (ISO), stored as lastReviewedAt. */
  reviewedAt: string;
  difficulty: Difficulty;
  intensity: Intensity;
}

export interface ProblemScheduleResult {
  srs: SrsState;
  status: ProblemState["status"];
  case: ScheduleCase;
  /** Days until the problem comes back. */
  intervalDays: number;
  /** True when this attempt retired the problem. */
  newlyRetired: boolean;
}

const solved = (r: AttemptResult) => r === "solved_alone" || r === "solved_with_hints";

/** The problem status after an attempt: never downgraded (solved once stays solved). */
export function statusAfter(
  previous: ProblemState["status"],
  result: AttemptResult,
): ProblemState["status"] {
  if (previous === "solved" || solved(result)) return "solved";
  return "attempted";
}

export function scheduleProblem(input: ProblemScheduleInput): ProblemScheduleResult {
  const { srs, result, today, reviewedAt, difficulty, intensity } = input;
  const first = srs.dueAt === undefined;
  const due = !first && isDue(srs.dueAt, today);
  const scheduleCase: ScheduleCase = first ? "first" : due ? "due" : "early";

  let step = srs.step;
  let soloStreak = srs.soloStreak;
  let lapses = srs.lapses;
  let retired = srs.retired ?? false;
  let newlyRetired = false;

  if (scheduleCase === "first") {
    step = result === "solved_alone" ? 1 : 0;
    soloStreak = result === "solved_alone" ? 1 : 0;
  } else if (scheduleCase === "early" && result === "solved_alone") {
    // Same step, rescheduled from today; nothing else changes.
  } else if (result === "solved_alone") {
    const atStep = step;
    step = Math.min(PROBLEM_MAX_STEP, step + 1);
    soloStreak += 1;
    if (!retired && atStep >= RETIRE_MIN_STEP && soloStreak >= RETIRE_MIN_STREAK) {
      retired = true;
      newlyRetired = true;
    }
  } else if (result === "solved_with_hints") {
    soloStreak = 0;
    retired = false;
  } else {
    step = 0;
    lapses += 1;
    soloStreak = 0;
    retired = false;
  }

  const intervalDays = problemInterval(step, intensity, difficulty);
  const next: SrsState = {
    step,
    dueAt: addDaysToDate(today, intervalDays),
    lastReviewedAt: reviewedAt,
    lapses,
    soloStreak,
  };
  if (retired) next.retired = true;
  return {
    srs: next,
    status: first ? (solved(result) ? "solved" : "attempted") : statusAfter(input.status, result),
    case: scheduleCase,
    intervalDays,
    newlyRetired,
  };
}

/** A problem that keeps slipping: two or more lapses. */
export function isTricky(srs: SrsState): boolean {
  return srs.lapses >= TRICKY_LAPSES;
}

/** Waiting for a re-solve today or earlier (in review, not mastered). */
export function isProblemDue(state: ProblemState, today: string): boolean {
  return state.inReview && !state.srs.retired && isDue(state.srs.dueAt, today);
}

export interface HistoryAttempt {
  result?: AttemptResult;
  /** Local date of the attempt. */
  date: string;
  reviewedAt: string;
}

/**
 * Rebuilds a schedule from a whole history, oldest first (used after importing past attempts
 * from a CSV file, so imported history schedules exactly like attempts saved one by one).
 * Attempts without a result don't move the schedule.
 */
export function replaySchedule(
  history: HistoryAttempt[],
  difficulty: Difficulty,
  intensity: Intensity,
): { srs: SrsState; status: ProblemState["status"] } {
  let srs: SrsState = { step: 0, lapses: 0, soloStreak: 0 };
  let status: ProblemState["status"] = "todo";
  const ordered = [...history].sort((a, b) =>
    a.date === b.date ? (a.reviewedAt < b.reviewedAt ? -1 : 1) : a.date < b.date ? -1 : 1,
  );
  for (const h of ordered) {
    if (!h.result) {
      if (status === "todo") status = "attempted";
      continue;
    }
    const r = scheduleProblem({
      srs,
      status,
      result: h.result,
      today: h.date,
      reviewedAt: h.reviewedAt,
      difficulty,
      intensity,
    });
    srs = r.srs;
    status = r.status;
  }
  return { srs, status };
}
