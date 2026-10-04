// The disc in the problem workspace (F32 "time you can see"): the time on the problem against the
// time planned for it. When the Now card's clock runs for today's plan item on this problem, the
// disc shows that clock (it counts the whole stop, reading included); otherwise the attempt
// timer against the planner's estimate for a re-solve or a new problem (at the owner's pace).
import { useRoute } from "@/app/router";
import type { TimerControls } from "@/components/ui/timer";
import { scaleMinutes } from "@/lib/adhd/pace";
import { ESTIMATES } from "@/lib/constants";
import type { ProblemInfo } from "@/lib/problems/catalog";
import { useAdhdPart } from "@/stores/adhdStore";
import { useToday } from "@/stores/clockStore";
import { nowElapsedMs, plannedFor, useNowClock } from "@/stores/nowStore";
import { usePace } from "@/stores/paceStore";
import { usePlanStore } from "@/stores/planStore";
import { useTicker } from "../focus/hooks";
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
  const clock = useNowClock(today, item?.id);
  const clockRunning = clock?.lastAt != null;
  const now = useTicker(5_000, on && clockRunning);
  if (!on) return null;
  if (clock) {
    return (
      <TimeDisc
        elapsedMs={nowElapsedMs(clock, now)}
        totalMs={clock.plannedMinutes * 60_000}
        running={clockRunning}
        label={`Time on this stop, planned ${clock.plannedMinutes} minutes`}
        cueKey={`workspace:${info.id}`}
        size="sm"
        showText={false}
      />
    );
  }
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
