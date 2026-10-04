// The disc in the problem workspace (F32 "time you can see"): the attempt timer against the time
// planned for the problem: today's plan item for it (at the owner's pace), else the planner's
// estimate for a re-solve or a new problem of its difficulty (scaled the same way).
import { useRoute } from "@/app/router";
import type { TimerControls } from "@/components/ui/timer";
import { scaleMinutes } from "@/lib/adhd/pace";
import { ESTIMATES } from "@/lib/constants";
import type { ProblemInfo } from "@/lib/problems/catalog";
import { useAdhdPart } from "@/stores/adhdStore";
import { useToday } from "@/stores/clockStore";
import { plannedFor } from "@/stores/nowStore";
import { usePace } from "@/stores/paceStore";
import { usePlanStore } from "@/stores/planStore";
import { TimeDisc } from "./TimeDisc";

export function WorkspaceDisc({ info, timer }: { info: ProblemInfo; timer: TimerControls }) {
  const on = useAdhdPart("time");
  const route = useRoute();
  const today = useToday();
  const resolve = route.query.get("mode") === "resolve";
  const kind = resolve ? "resolve" : "new-problem";
  const item = usePlanStore((s) =>
    s.plans[today]?.items.find(
      (i) => i.refId === info.id && (i.kind === "resolve" || i.kind === "new-problem"),
    ),
  );
  const pace = usePace(kind);
  if (!on) return null;
  const minutes = item
    ? plannedFor(item)
    : scaleMinutes((resolve ? ESTIMATES.resolve : ESTIMATES.newProblem)[info.difficulty], pace);
  return (
    <TimeDisc
      elapsedMs={timer.elapsedMs}
      totalMs={minutes * 60_000}
      running={timer.running}
      label={`Time planned for this problem, ${minutes} minutes`}
      cueKey={`workspace:${info.id}`}
      size="sm"
      showText={false}
    />
  );
}
