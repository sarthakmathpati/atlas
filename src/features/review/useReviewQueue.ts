// The review queue from the stores, recomputed when problems, concepts, settings or the date
// change. Shared by the Review page and the navigation badges.
import { useMemo } from "react";
import { buildReviewQueue, type ReviewQueue } from "@/lib/review/queue";
import { useToday } from "@/stores/clockStore";
import { conceptById } from "@/data/syllabus";
import { useConceptStateStore } from "@/stores/conceptStateStore";
import { useCustomConceptStore } from "@/stores/customConceptStore";
import { useProblemStore } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";

export function useReviewQueue(): ReviewQueue {
  const problems = useProblemStore((s) => s.states);
  const concepts = useConceptStateStore((s) => s.states);
  const intensity = useProfileStore((s) => s.profile?.reviewIntensity ?? "normal");
  const today = useToday();
  const custom = useCustomConceptStore((s) => s.concepts);
  return useMemo(
    () =>
      buildReviewQueue(
        problems,
        concepts,
        intensity,
        today,
        (id) => conceptById.has(id) || id in custom,
      ),
    [problems, concepts, intensity, today, custom],
  );
}
