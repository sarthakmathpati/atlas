// "Ready to learn next" (F16, section 11.5): ready concepts ranked by importance, focus subjects,
// the subjects with most to gain (weight × distance from ready, section 11.3), then learning
// order. Readiness is computed from the status engine for the concepts with any progress.
import { useMemo } from "react";
import { concepts as seedConcepts, subjects } from "@/data/syllabus";
import { inScope, type ScopeContext } from "@/lib/concepts/scope";
import { computeStatus } from "@/lib/mastery/status";
import { conceptScore, subjectReadiness } from "@/lib/readiness/score";
import { rankReady } from "@/lib/recommend/ready";
import type { Concept } from "@/lib/types";
import { useToday } from "@/stores/clockStore";
import { statusInput, useConceptStateStore } from "@/stores/conceptStateStore";
import { useCustomConceptStore } from "@/stores/customConceptStore";
import { useProblemStore } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";

export function useReadyToLearn(limit = 5): { ready: Concept[]; fading: number } {
  const profile = useProfileStore((s) => s.profile);
  const states = useConceptStateStore((s) => s.states);
  const problems = useProblemStore((s) => s.states);
  const custom = useCustomConceptStore((s) => s.concepts);
  const today = useToday();
  return useMemo(() => {
    if (!profile) return { ready: [], fading: 0 };
    const scope: ScopeContext = {
      track: profile.track,
      profile,
      isHidden: (id) => Boolean(states[id]?.hidden),
    };
    const all = [...seedConcepts, ...Object.values(custom)].filter((c) => inScope(c, scope));
    const now = new Date();
    const scoreOf = (id: string) => {
      if (!states[id]) return 0;
      const input = statusInput(id, now);
      return input ? conceptScore(computeStatus(input)) : 0;
    };
    const readiness: Record<string, number> = {};
    for (const s of subjects) {
      readiness[s.id] = subjectReadiness(
        all.filter((c) => c.subjectId === s.id),
        scoreOf,
      );
    }
    const ranked = rankReady(all, {
      statusOf: (id) => states[id]?.status ?? "not_started",
      inScope: (c) => inScope(c, scope),
      track: profile.track,
      focusSubjects: profile.focusSubjects,
      subjectReadiness: readiness,
      today,
      interviewDate: profile.interviewDate,
    });
    const fading = all.filter((c) => states[c.id]?.status === "fading").length;
    return { ready: ranked.slice(0, limit), fading };
    // problems feed the statuses behind readiness.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, states, problems, custom, today, limit]);
}
