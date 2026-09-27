// Builds the planner's input (planner.ts) from the owner's records: the profile, concept and
// problem progress, checks, the owner's own concepts and practice history. Pure, so the Today
// page and the fixture tests plan from exactly the same data.
import { BEHAVIORAL_QUESTIONS } from "@/data/behavioral.seed";
import { conceptById } from "@/data/syllabus";
import { patternAccuracy } from "@/lib/drill/drill";
import { allProblems } from "@/lib/problems/catalog";
import {
  conceptsInScope,
  evaluateReadiness,
  type EvaluationSources,
} from "@/lib/readiness/evaluate";
import { readinessRecord, type ReadinessModel } from "@/lib/readiness/model";
import type { Profile } from "@/lib/types";
import { AVAILABLE_PLAN_KINDS, type PlanKind } from "./kinds";
import type { PlannerHistory, PlannerInput } from "./planner";

export interface PlannerSources extends EvaluationSources {
  profile: Profile;
  budget?: number;
  minimumDay?: boolean;
  history?: PlannerHistory;
  available?: ReadonlySet<PlanKind>;
  /** A readiness model already computed for the same records (saves evaluating twice). */
  model?: ReadinessModel;
}

export function buildPlannerInput(src: PlannerSources): {
  input: PlannerInput;
  model: ReadinessModel;
} {
  const model = src.model ?? evaluateReadiness(src);
  const drillChecks = Object.values(src.checks)
    .flat()
    .filter((c) => c.kind === "drill");
  const weakest = patternAccuracy(drillChecks, src.today)
    .filter((a) => a.total >= 2)
    .sort((a, b) => a.accuracy - b.accuracy)[0];
  const input: PlannerInput = {
    date: src.today,
    budget: src.budget ?? src.profile.dailyMinutes,
    minimumDay: src.minimumDay ?? false,
    track: src.profile.track,
    interviewDate: src.profile.interviewDate,
    balance: src.profile.balance,
    focusSubjects: src.profile.focusSubjects,
    hidePremium: src.profile.hidePremium,
    intensity: src.profile.reviewIntensity,
    concepts: conceptsInScope(src),
    conceptStates: src.conceptStates,
    problems: allProblems(src.problemStates),
    problemStates: src.problemStates,
    subjectReadiness: readinessRecord(model),
    overallReadiness: model.overall,
    history: src.history,
    storyQuestions: BEHAVIORAL_QUESTIONS.map((q) => ({ id: q.id, text: q.text })),
    available: src.available ?? AVAILABLE_PLAN_KINDS,
  };
  if (weakest) {
    input.drillWeakest = {
      name: conceptById.get(weakest.conceptId)?.name ?? weakest.conceptId,
      correct: weakest.correct,
      total: weakest.total,
    };
  }
  return { input, model };
}
