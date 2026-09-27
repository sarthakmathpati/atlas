// Evaluates every concept in scope with the status engine (section 11.2) and builds the readiness
// model (11.3). Pure over plain data, so the dashboard, the planner and the tests share it; the
// stores call it with their current records (features/insight/useInsight.ts).
import { concepts as seedConcepts } from "@/data/syllabus";
import { inScope } from "@/lib/concepts/scope";
import { computeStatus, type LinkedProblem, type StatusResult } from "@/lib/mastery/status";
import { problemsForConcept } from "@/lib/problems/catalog";
import type { Intensity } from "@/lib/srs/intervals";
import type { Check, Concept, ConceptState, ProblemState, Profile } from "@/lib/types";
import { readinessModel, type ReadinessModel } from "./model";

export interface EvaluationSources {
  profile: Pick<Profile, "track" | "primaryLanguage" | "prefs">;
  conceptStates: Readonly<Record<string, ConceptState>>;
  checks: Readonly<Record<string, readonly Check[]>>;
  problemStates: Readonly<Record<string, ProblemState>>;
  /** The owner's own concepts, as Concepts. */
  customConcepts?: readonly Concept[];
  today: string;
  now: Date;
  intensity: Intensity;
}

/** Seed and own concepts in the owner's scope (track, not hidden, not another language). */
export function conceptsInScope(src: Pick<EvaluationSources, "profile" | "conceptStates" | "customConcepts">): Concept[] {
  const ctx = {
    track: src.profile.track,
    profile: src.profile,
    isHidden: (id: string) => Boolean(src.conceptStates[id]?.hidden),
  };
  return [...seedConcepts, ...(src.customConcepts ?? [])].filter((c) => inScope(c, ctx));
}

/** Linked problems with their states, for the status engine. */
export function linkedProblems(
  conceptId: string,
  problemStates: Readonly<Record<string, ProblemState>>,
): LinkedProblem[] {
  return problemsForConcept(conceptId, problemStates).map((p) => ({
    id: p.id,
    difficulty: p.difficulty,
    state: problemStates[p.id],
  }));
}

/** The status engine's result for one concept, or null when there is no evidence to read. */
export function evaluateConcept(concept: Concept, src: EvaluationSources): StatusResult | null {
  const state = src.conceptStates[concept.id];
  const linked = linkedProblems(concept.id, src.problemStates);
  const checks = src.checks[concept.id] ?? [];
  if (!state && checks.length === 0 && !linked.some((l) => l.state?.attempts.length)) return null;
  return computeStatus({
    concept,
    state,
    checks,
    linked,
    today: src.today,
    now: src.now,
    intensity: src.intensity,
  });
}

export function evaluateReadiness(src: EvaluationSources): ReadinessModel {
  return readinessModel(
    conceptsInScope(src),
    (c) => evaluateConcept(c, src),
    src.profile.track,
  );
}
