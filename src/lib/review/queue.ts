// The review queue (F9): problems due for a re-solve and concepts due for review, each most
// urgent first, plus what comes up in the next week. Pure; dates are local yyyy-mm-dd.
import { conceptById } from "@/data/syllabus";
import { addDaysToDate, daysBetween } from "@/lib/time";
import type { ConceptState, Profile, ProblemState } from "@/lib/types";
import { problemInfo, type ProblemInfo } from "../problems/catalog";
import { attemptDate, latestAttempt, reviewInfo, urgency } from "../problems/progress";
import { conceptInterval, isDue } from "../srs/intervals";
import { isTricky } from "../srs/problem";

export interface DueProblem {
  info: ProblemInfo;
  state: ProblemState;
  dueAt: string;
  daysLate: number;
  intervalDays: number;
  tricky: boolean;
  urgency: number;
}

export interface DueConcept {
  conceptId: string;
  state: ConceptState;
  dueAt: string;
  daysLate: number;
  urgency: number;
}

export interface UpcomingProblem {
  info: ProblemInfo;
  dueAt: string;
  inDays: number;
}

export interface ReviewQueue {
  problems: DueProblem[];
  concepts: DueConcept[];
  /** Problems due in the next 7 days (not today). */
  upcoming: UpcomingProblem[];
  mastered: number;
  /** The sidebar badge: everything due today or earlier. */
  count: number;
}

export function buildReviewQueue(
  problemStates: Readonly<Record<string, ProblemState>>,
  conceptStates: Readonly<Record<string, ConceptState>>,
  intensity: Profile["reviewIntensity"],
  today: string,
): ReviewQueue {
  const problems: DueProblem[] = [];
  const upcoming: UpcomingProblem[] = [];
  let mastered = 0;
  const weekEnd = addDaysToDate(today, 7);
  for (const state of Object.values(problemStates)) {
    const info = problemInfo(state.problemId, state);
    if (!info) continue;
    if (state.srs.retired) {
      mastered++;
      continue;
    }
    const review = reviewInfo(state, info.difficulty, intensity, today);
    if (review.kind === "due") {
      problems.push({
        info,
        state,
        dueAt: review.dueAt,
        daysLate: review.daysLate,
        intervalDays: review.intervalDays,
        tricky: isTricky(state.srs),
        urgency: urgency(review, state),
      });
    } else if (review.kind === "upcoming" && review.dueAt <= weekEnd) {
      upcoming.push({ info, dueAt: review.dueAt, inDays: review.inDays });
    }
  }
  // Most urgent first; tricky problems first among equals; then syllabus order.
  problems.sort(
    (a, b) =>
      b.urgency - a.urgency || Number(b.tricky) - Number(a.tricky) || a.info.order - b.info.order,
  );
  upcoming.sort((a, b) =>
    a.dueAt < b.dueAt ? -1 : a.dueAt > b.dueAt ? 1 : a.info.order - b.info.order,
  );

  const concepts: DueConcept[] = [];
  for (const state of Object.values(conceptStates)) {
    const dueAt = state.srs.dueAt;
    if (!dueAt || state.hidden || !conceptById.has(state.conceptId) || !isDue(dueAt, today))
      continue;
    const daysLate = daysBetween(dueAt, today);
    concepts.push({
      conceptId: state.conceptId,
      state,
      dueAt,
      daysLate,
      urgency: (daysLate + 1) / conceptInterval(state.srs.step, intensity),
    });
  }
  concepts.sort((a, b) => b.urgency - a.urgency || a.conceptId.localeCompare(b.conceptId));

  return {
    problems,
    concepts,
    upcoming,
    mastered,
    count: problems.length + concepts.length,
  };
}

/** "You solved it alone 7 days ago." — the plain reason shown next to a due problem. */
export function dueReason(item: DueProblem, today: string): string {
  const last = latestAttempt(item.state);
  if (!last) return "Due for review.";
  const days = daysBetween(attemptDate(last), today);
  const when = days <= 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
  switch (last.result) {
    case "solved_alone":
      return `You solved it alone ${when}.`;
    case "solved_with_hints":
      return `You solved it with hints ${when}.`;
    case "saw_solution":
      return `You saw the solution ${when}; time to try it yourself.`;
    case "not_solved":
      return `It didn't come together ${when}; try again.`;
    default:
      return `Last tried ${when}.`;
  }
}
