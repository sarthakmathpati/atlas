// "Ready to learn next" (F16, section 11.5): ready concepts ranked by importance, focus subjects,
// the subjects with most to gain (weight × distance from ready, section 11.3), then learning
// order. Statuses and subject readiness come from the shared readiness model.
import { useMemo } from "react";
import { readinessRecord, type ReadinessModel } from "@/lib/readiness/model";
import { rankReady } from "@/lib/recommend/ready";
import type { Concept } from "@/lib/types";
import { useToday } from "@/stores/clockStore";
import { useProfileStore } from "@/stores/profileStore";

/** Ranked from the readiness model the page already has (useReadiness), so it's evaluated once. */
export function useReadyToLearn(
  model: ReadinessModel | null,
  limit = 5,
): { ready: Concept[]; fading: number } {
  const profile = useProfileStore((s) => s.profile);
  const today = useToday();
  return useMemo(() => {
    if (!profile || !model) return { ready: [], fading: 0 };
    const all = [...model.byId.values()].map((e) => e.concept);
    const ranked = rankReady(all, {
      statusOf: (id) => model.byId.get(id)?.status ?? "not_started",
      inScope: (c) => model.byId.has(c.id),
      track: profile.track,
      focusSubjects: profile.focusSubjects,
      subjectReadiness: readinessRecord(model),
      today,
      interviewDate: profile.interviewDate,
    });
    return { ready: ranked.slice(0, limit), fading: model.counts.fading };
  }, [profile, model, today, limit]);
}
