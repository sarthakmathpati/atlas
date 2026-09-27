// Reads the stores into the pure readiness model (lib/readiness) and planner input (lib/planner),
// so the Today plan, the dashboard, the weekly review and revision sheets share one evaluation
// of every concept in scope.
import { useMemo } from "react";
import { computeStreak, dayLookup, type DayLookup, type StreakInfo } from "@/lib/activity/streak";
import { buildPlannerInput } from "@/lib/planner/input";
import type { PlannerHistory, PlannerInput } from "@/lib/planner/planner";
import { mockDates } from "@/lib/mock/mock";
import { practiceDates } from "@/lib/stories/stories";
import { evaluateReadiness, type EvaluationSources } from "@/lib/readiness/evaluate";
import type { ReadinessModel } from "@/lib/readiness/model";
import { localDate } from "@/lib/time";
import type { Profile } from "@/lib/types";
import { useActivityStore } from "@/stores/activityStore";
import { useClockStore, useToday } from "@/stores/clockStore";
import { useConceptStateStore } from "@/stores/conceptStateStore";
import { useCustomConceptStore } from "@/stores/customConceptStore";
import { useProblemStore } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";
import { designDates, useDesignStore } from "@/stores/designStore";
import { useMockStore } from "@/stores/mockStore";
import { useStoryStore } from "@/stores/storyStore";

/** Everything the status engine and the planner read, from the stores as they are now. */
export function evaluationSourcesNow(now: Date = new Date()): EvaluationSources | null {
  const profile = useProfileStore.getState().profile;
  if (!profile) return null;
  const { states, checks } = useConceptStateStore.getState();
  return {
    profile,
    conceptStates: states,
    checks,
    problemStates: useProblemStore.getState().states,
    customConcepts: Object.values(useCustomConceptStore.getState().concepts),
    today: useClockStore.getState().today || localDate(now),
    now,
    intensity: profile.reviewIntensity,
  };
}

const toLocalDate = (iso: string) => localDate(new Date(iso));

/**
 * Dates of finished mocks, design practice and story practice (the planner's weekly extras read
 * them: a mock a week, design practice once a week, stories twice a week; decision 85).
 */
export function plannerHistoryNow(): PlannerHistory {
  return {
    mocks: mockDates(Object.values(useMockStore.getState().sessions), toLocalDate),
    designs: designDates(useDesignStore.getState().attempts, toLocalDate),
    stories: practiceDates(Object.values(useStoryStore.getState().stories), toLocalDate),
  };
}

/** The planner's input for today, from the stores (budget and minimum day as given). */
export function plannerInputNow(options: {
  budget: number;
  minimumDay: boolean;
  model?: ReadinessModel;
}): PlannerInput | null {
  const src = evaluationSourcesNow();
  if (!src) return null;
  return buildPlannerInput({
    ...src,
    profile: src.profile as Profile,
    budget: options.budget,
    minimumDay: options.minimumDay,
    model: options.model,
    history: plannerHistoryNow(),
  }).input;
}

/** The readiness model for the current data; recomputed when progress or the day changes. */
export function useReadiness(): ReadinessModel | null {
  const profile = useProfileStore((s) => s.profile);
  const states = useConceptStateStore((s) => s.states);
  const checks = useConceptStateStore((s) => s.checks);
  const problems = useProblemStore((s) => s.states);
  const custom = useCustomConceptStore((s) => s.concepts);
  const today = useToday();
  return useMemo(() => {
    if (!profile) return null;
    return evaluateReadiness({
      profile,
      conceptStates: states,
      checks,
      problemStates: problems,
      customConcepts: Object.values(custom),
      today,
      now: new Date(),
      intensity: profile.reviewIntensity,
    });
  }, [profile, states, checks, problems, custom, today]);
}

/** Activity by day, today's streak and the days the freeze covered (the heatmap marks them). */
export function useActivityInsight(): {
  lookup: DayLookup;
  streak: StreakInfo;
  frozen: ReadonlySet<string>;
  loaded: boolean;
} {
  const months = useActivityStore((s) => s.months);
  const loaded = useActivityStore((s) => s.loaded);
  const freeze = useProfileStore((s) => s.profile?.prefs.streakFreeze ?? true);
  const today = useToday();
  return useMemo(() => {
    const lookup = dayLookup(Object.values(months));
    const streak = computeStreak(lookup, today, freeze);
    return { lookup, streak, frozen: new Set(streak.frozenDays), loaded };
  }, [months, today, freeze, loaded]);
}
