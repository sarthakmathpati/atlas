// Derived facts about one problem's progress (F6, F9): the latest attempt, when it comes back,
// and how urgent that is. Pure functions over a ProblemState.
import { daysBetween, localDate } from "@/lib/time";
import type { Attempt, AttemptResult, Difficulty, Profile, ProblemState } from "@/lib/types";
import { isDue, problemInterval } from "../srs/intervals";
import { isTricky } from "../srs/problem";

export const RESULT_LABEL: Record<AttemptResult, string> = {
  solved_alone: "Solved alone",
  solved_with_hints: "Solved with hints",
  saw_solution: "Saw the solution",
  not_solved: "Not solved",
};

/** Short forms for dense rows. */
export const RESULT_SHORT: Record<AttemptResult, string> = {
  solved_alone: "Alone",
  solved_with_hints: "With hints",
  saw_solution: "Saw solution",
  not_solved: "Not solved",
};

export const RESULT_ORDER: AttemptResult[] = [
  "solved_alone",
  "solved_with_hints",
  "saw_solution",
  "not_solved",
];

const attemptTime = (a: Attempt) => a.finishedAt ?? a.startedAt;

/** Attempts oldest first (stored newest last, but merged or imported ones may be out of order). */
export function attemptsInOrder(state: ProblemState | undefined): Attempt[] {
  if (!state) return [];
  return [...state.attempts].sort((a, b) => (attemptTime(a) < attemptTime(b) ? -1 : 1));
}

export function latestAttempt(state: ProblemState | undefined): Attempt | undefined {
  const list = attemptsInOrder(state);
  return list[list.length - 1];
}

/** The local date an attempt happened on. */
export function attemptDate(a: Attempt): string {
  return localDate(new Date(attemptTime(a)));
}

export type ReviewInfo =
  | { kind: "none" } // never attempted
  | { kind: "off"; dueAt?: string } // owner took it out of review
  | { kind: "mastered" }
  | { kind: "due"; dueAt: string; daysLate: number; intervalDays: number }
  | { kind: "upcoming"; dueAt: string; inDays: number };

export function reviewInfo(
  state: ProblemState | undefined,
  difficulty: Difficulty,
  intensity: Profile["reviewIntensity"],
  today: string,
): ReviewInfo {
  if (!state || !state.srs.dueAt) return { kind: "none" };
  if (state.srs.retired) return { kind: "mastered" };
  if (!state.inReview) return { kind: "off", dueAt: state.srs.dueAt };
  const dueAt = state.srs.dueAt;
  if (isDue(dueAt, today)) {
    return {
      kind: "due",
      dueAt,
      daysLate: daysBetween(dueAt, today),
      intervalDays: problemInterval(state.srs.step, intensity, difficulty),
    };
  }
  return { kind: "upcoming", dueAt, inDays: daysBetween(today, dueAt) };
}

/** "Due today", "Overdue 3 days", "In 5 days", "Tomorrow", "Mastered", "Not in review". */
export function reviewLabel(info: ReviewInfo): string {
  switch (info.kind) {
    case "none":
      return "";
    case "off":
      return "Not in review";
    case "mastered":
      return "Mastered";
    case "due":
      return info.daysLate <= 0
        ? "Due today"
        : `Overdue ${info.daysLate} ${info.daysLate === 1 ? "day" : "days"}`;
    case "upcoming":
      return info.inDays === 1 ? "Tomorrow" : `In ${info.inDays} days`;
  }
}

/**
 * Re-solve urgency for the review queue: how late relative to the interval (so a 2-day-late
 * 3-day interval beats a 2-day-late 60-day one). Tricky problems come first on ties.
 */
export function urgency(info: ReviewInfo, state: ProblemState): number {
  if (info.kind !== "due") return -1;
  return (info.daysLate + 1) / info.intervalDays + (isTricky(state.srs) ? 0.001 : 0);
}

/** Tags from every attempt with how often each appears. */
export function mistakeCounts(state: ProblemState | undefined): Map<string, number> {
  const counts = new Map<string, number>();
  for (const a of state?.attempts ?? []) {
    for (const id of new Set(a.mistakeTagIds)) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

/** Relative day for lists: "Today", "Yesterday", "3 days ago", or "12 Sep". */
export function relativeDate(day: string, today: string): string {
  const d = daysBetween(day, today);
  if (d === 0) return "Today";
  if (d === 1) return "Yesterday";
  if (d > 1 && d < 7) return `${d} days ago`;
  return shortDate(day, today);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "12 Sep", with the year when it isn't this year ("12 Sep 2025"). */
export function shortDate(day: string, today: string = localDate()): string {
  const [y, m, d] = day.split("-").map(Number);
  const base = `${d} ${MONTHS[(m ?? 1) - 1]}`;
  return day.slice(0, 4) === today.slice(0, 4) ? base : `${base} ${y}`;
}

/** "Tue 30 Sep" for review dates in the coming weeks. */
export function weekdayDate(day: string, today: string = localDate()): string {
  const [y, m, d] = day.split("-").map(Number);
  const date = new Date(y ?? 2000, (m ?? 1) - 1, d ?? 1);
  const weekday = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][date.getDay()];
  return `${weekday} ${shortDate(day, today)}`;
}
