// Readiness (BUILD_SPEC.md 11.3). Pulled forward from phase 7 because "ready to learn" (11.5)
// ranks subjects by how far they are from ready. Pure functions over the status engine's results.
//
//   conceptScore = 0 when not started, else 100 × base × recency
//   base    = 0.5 × knowledge + 0.5 × practice   (with linked problems), knowledge otherwise
//   recency = 1 when not overdue, else max(0.5, 1 − overdueDays / (2 × interval))
import { IMPORTANCE_WEIGHT, SUBJECT_WEIGHTS } from "@/lib/constants";
import type { Importance, Status, SubjectId, Track } from "@/lib/types";

export interface ScoreInput {
  status: Status;
  knowledge: number;
  practice: number;
  hasLinkedProblems: boolean;
  overdue: boolean;
  overdueDays: number;
  /** The review interval of whatever is overdue (the concept, or its most overdue problem). */
  overdueInterval: number;
}

export function conceptScore(e: ScoreInput): number {
  if (e.status === "not_started") return 0;
  const base = e.hasLinkedProblems ? 0.5 * e.knowledge + 0.5 * e.practice : e.knowledge;
  const recency = e.overdue
    ? Math.max(0.5, 1 - e.overdueDays / (2 * Math.max(1, e.overdueInterval)))
    : 1;
  return 100 * base * recency;
}

/** Importance-weighted mean of concept scores (must 3, important 2, advanced 0.5); 0 when empty. */
export function subjectReadiness(
  concepts: readonly { id: string; importance: Importance }[],
  scoreOf: (conceptId: string) => number,
): number {
  let sum = 0;
  let weight = 0;
  for (const c of concepts) {
    const w = IMPORTANCE_WEIGHT[c.importance];
    sum += w * scoreOf(c.id);
    weight += w;
  }
  return weight > 0 ? sum / weight : 0;
}

/** A subject's weight in the overall score for a track ("both" averages the two columns). */
export function subjectWeight(subjectId: SubjectId, track: Track): number {
  const w = SUBJECT_WEIGHTS[subjectId];
  if (!w) return 0;
  return track === "both" ? (w.sde + w.quant) / 2 : w[track];
}

/** Weighted mean of subject readiness with the track's subject weights (section 11.3 table). */
export function overallReadiness(
  subjectScores: Readonly<Record<SubjectId, number>>,
  track: Track,
): number {
  let sum = 0;
  let weight = 0;
  for (const [id, score] of Object.entries(subjectScores)) {
    const w = subjectWeight(id, track);
    if (w <= 0) continue;
    sum += w * score;
    weight += w;
  }
  return weight > 0 ? sum / weight : 0;
}
