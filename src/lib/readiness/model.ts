// The readiness model behind the dashboard (F17), the planner (11.4) and "ready to learn" (11.5):
// every concept in scope with its status and score, each subject's readiness with the counts
// behind it, and the overall score with each subject's share. Pure: the caller evaluates each
// concept with the status engine (section 11.2) and passes the results in.
import { IMPORTANCE_WEIGHT } from "@/lib/constants";
import type { StatusResult } from "@/lib/mastery/status";
import type { Concept, Status, SubjectId, Track } from "@/lib/types";
import { conceptScore, subjectWeight } from "./score";

export interface ConceptEval {
  concept: Concept;
  /** The status engine's result; null when the concept has no evidence at all (not started). */
  result: StatusResult | null;
  status: Status;
  /** 0 to 100 (section 11.3). */
  score: number;
}

export type StatusCounts = Record<Status, number>;

export interface SubjectModel {
  subjectId: SubjectId;
  /** The subject's weight in the overall score for the track (0 when it doesn't count). */
  weight: number;
  /** Importance-weighted mean of concept scores, 0 to 100. */
  readiness: number;
  /** Sum of importance weights (must 3, important 2, advanced 0.5): the denominator. */
  importanceWeight: number;
  /** Sum of importance weight × score: the numerator. */
  weightedScore: number;
  concepts: number;
  counts: StatusCounts;
  must: { total: number; strong: number; started: number };
}

export interface ReadinessModel {
  track: Track;
  overall: number;
  /** Sum of the weights of subjects that count (the overall score's denominator). */
  totalWeight: number;
  subjects: SubjectModel[];
  byId: ReadonlyMap<string, ConceptEval>;
  counts: StatusCounts;
}

export const emptyCounts = (): StatusCounts => ({
  not_started: 0,
  learning: 0,
  strong: 0,
  fading: 0,
});

/**
 * Builds the model from the concepts in scope (the track, not hidden, not another language) and
 * a way to evaluate each one. `evaluate` returns null for a concept with no stored progress.
 */
export function readinessModel(
  concepts: readonly Concept[],
  evaluate: (concept: Concept) => StatusResult | null,
  track: Track,
): ReadinessModel {
  const byId = new Map<string, ConceptEval>();
  const bySubject = new Map<string, SubjectModel>();
  const counts = emptyCounts();
  for (const concept of concepts) {
    const result = evaluate(concept);
    const status: Status = result?.status ?? "not_started";
    const score = result ? conceptScore(result) : 0;
    byId.set(concept.id, { concept, result, status, score });
    counts[status]++;
    let s = bySubject.get(concept.subjectId);
    if (!s) {
      s = {
        subjectId: concept.subjectId,
        weight: subjectWeight(concept.subjectId, track),
        readiness: 0,
        importanceWeight: 0,
        weightedScore: 0,
        concepts: 0,
        counts: emptyCounts(),
        must: { total: 0, strong: 0, started: 0 },
      };
      bySubject.set(concept.subjectId, s);
    }
    const w = IMPORTANCE_WEIGHT[concept.importance];
    s.importanceWeight += w;
    s.weightedScore += w * score;
    s.concepts++;
    s.counts[status]++;
    if (concept.importance === "must") {
      s.must.total++;
      if (status === "strong") s.must.strong++;
      if (status !== "not_started") s.must.started++;
    }
  }
  let sum = 0;
  let totalWeight = 0;
  const subjects = [...bySubject.values()];
  for (const s of subjects) {
    s.readiness = s.importanceWeight > 0 ? s.weightedScore / s.importanceWeight : 0;
    if (s.weight > 0) {
      sum += s.weight * s.readiness;
      totalWeight += s.weight;
    }
  }
  return {
    track,
    overall: totalWeight > 0 ? sum / totalWeight : 0,
    totalWeight,
    subjects,
    byId,
    counts,
  };
}

/** Subject readiness as a plain record (what "ready to learn" and the planner rank by). */
export function readinessRecord(model: ReadinessModel): Record<string, number> {
  return Object.fromEntries(model.subjects.map((s) => [s.subjectId, s.readiness]));
}
