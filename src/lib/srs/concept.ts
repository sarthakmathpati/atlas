// Concept review scheduling (BUILD_SPEC.md 11.1, "Concepts"). A concept enters review when it is
// first marked studied or gets its first check (step 0, due in 2 days at normal intensity). Each
// review event while it is due moves the step by the check's score:
//   score ≥ 0.8       step + 1 (max 5)
//   0.5 to 0.79       same step
//   below 0.5         max(0, step − 2), lapses + 1
// Checks recorded before the due date update knowledge only (see lib/mastery). Drill checks move
// the step only when the answer was fully correct and the concept was due.
import { addDaysToDate } from "@/lib/time";
import type { SrsState } from "@/lib/types";
import { CONCEPT_MAX_STEP, conceptInterval, isDue, type Intensity } from "./intervals";

export function inConceptReview(srs: SrsState): boolean {
  return srs.dueAt !== undefined;
}

/** Puts a concept into review (step 0) if it isn't already. */
export function startConceptReview(srs: SrsState, today: string, intensity: Intensity): SrsState {
  if (inConceptReview(srs)) return srs;
  return { ...srs, step: 0, dueAt: addDaysToDate(today, conceptInterval(0, intensity)) };
}

export interface ConceptReviewEvent {
  score: number;
  today: string;
  reviewedAt: string;
  intensity: Intensity;
  /** Drill answers move the schedule only when fully correct. */
  drill?: boolean;
  fullyCorrect?: boolean;
  /** An explicit review session counts even before the due date. */
  session?: boolean;
}

export function applyConceptReview(srs: SrsState, event: ConceptReviewEvent): SrsState {
  const { score, today, reviewedAt, intensity } = event;
  if (!inConceptReview(srs)) return startConceptReview(srs, today, intensity);
  const due = isDue(srs.dueAt, today) || event.session === true;
  if (!due) return srs;
  if (event.drill && !event.fullyCorrect) return srs;
  let step = srs.step;
  let lapses = srs.lapses;
  if (score >= 0.8) step = Math.min(CONCEPT_MAX_STEP, step + 1);
  else if (score < 0.5) {
    step = Math.max(0, step - 2);
    lapses += 1;
  }
  return {
    ...srs,
    step,
    lapses,
    dueAt: addDaysToDate(today, conceptInterval(step, intensity)),
    lastReviewedAt: reviewedAt,
  };
}
