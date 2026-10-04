// The Now card on Today (F32, part 2): the first plan item not done, alone and large (the focal
// card), with its steps to tick (kept on the item). "Start with 2 minutes" opens the task with a
// 2-minute clock and then asks "Keep going" or "Stop here"; "I'm stuck" opens the hint ladder
// for a problem and Ask Claude for everything else; "Swap this task" works like Swap; "Park a
// thought" opens Park it (F31). The rest of the day is folded: "Then: 3 more stops".
// With "time you can see" on, a shrinking disc shows the item's clock against its estimate at
// the owner's pace, and the last finished item says "Planned 15, took 22".
import {
  Check,
  ChevronDown,
  CircleCheck,
  LifeBuoy,
  Pause,
  Play,
  SquareParking,
  Timer,
} from "lucide-react";
import { useState } from "react";
import { conceptHref, navigate, routeHref } from "@/app/router";
import { Button } from "@/components/ui/Button";
import { Card, CardLabel } from "@/components/ui/Card";
import { Chip, DifficultyChip } from "@/components/ui/Chip";
import { cx } from "@/components/ui/cx";
import { DiscTimer } from "@/components/ui/DiscTimer";
import { LineDrawing } from "@/components/ui/LineDrawing";
import { Skeleton } from "@/components/ui/Misc";
import { SubjectMark } from "@/components/ui/SubjectEmblem";
import { plannedTook } from "@/lib/adhd/pace";
import { currentStep, ticksOf } from "@/lib/adhd/steps";
import type { DayPlan, PlanItem } from "@/lib/types";
import { useAdhdPart } from "@/stores/adhdStore";
import {
  nowElapsedMs,
  pauseNow,
  plannedFor,
  startNow,
  tickNextStep,
  tickStep,
  itemSteps,
  useNowClock,
  useNowStore,
} from "@/stores/nowStore";
import { openPark } from "@/stores/parkStore";
import { setPlanItemDone } from "@/stores/planStore";
import { useProblemStore } from "@/stores/problemStore";
import { useUiStore } from "@/stores/uiStore";
import { useTicker } from "../focus/hooks";
import { KIND_ICON, RouteCard, SkipButton, SwapButton } from "../today/PlanSection";
import { itemDifficulty, itemSubject, swappable } from "../today/planItems";
import { startTarget } from "../today/startTarget";
import type { TodayPlan } from "../today/useTodayPlan";
import { useEstimate, useTimeCues } from "./hooks";

/** Opens the item's screen (a link or a dialog). */
function openItem(item: PlanItem): void {
  const target = startTarget(item);
  if (!target) return;
  if ("href" in target) navigate(target.href);
  else target.run();
}

/** "I'm stuck": the hint ladder for a problem, Ask Claude (with the concept on screen) otherwise. */
function stuck(item: PlanItem): void {
  const ask = () => useUiStore.getState().setAskOpen(true);
  const ref = item.refIds?.[0] ?? item.refId;
  switch (item.kind) {
    case "resolve":
      if (ref) navigate(routeHref("/problems", ref, { mode: "resolve", panel: "hints" }));
      return;
    case "new-problem":
      if (ref) navigate(routeHref("/problems", ref, { panel: "hints" }));
      return;
    case "learn-concept":
    case "review-concept":
      if (ref) navigate(conceptHref(ref));
      ask();
      return;
    default:
      ask();
  }
}

function StepList({ item, date }: { item: PlanItem; date: string }) {
  const steps = itemSteps(item);
  const ticks = ticksOf(item, steps.length);
  const at = currentStep(ticks);
  if (steps.length === 0) return null;
  return (
    <ol className="mt-4 flex flex-col gap-1.5" aria-label="Steps">
      {steps.map((text, i) => {
        const done = ticks[i]!;
        const here = i === at;
        return (
          <li key={`${i}-${text}`}>
            <button
              type="button"
              aria-pressed={done}
              onClick={() => tickStep(date, item.id, i, !done)}
              className={cx(
                "flex w-full items-center gap-3 rounded-control border-[1.5px] px-3 py-2.5 text-left text-base transition-colors",
                here
                  ? "border-accent bg-accent-soft font-semibold text-text"
                  : "border-transparent bg-surface hover:bg-surface-sunken",
                done && "text-muted",
              )}
            >
              <span
                aria-hidden="true"
                className={cx(
                  "grid size-[22px] shrink-0 place-items-center rounded-[7px] border-2",
                  done ? "border-accent bg-accent text-on-accent" : "border-rule-strong",
                )}
              >
                {done && <Check size={13} strokeWidth={3} />}
              </span>
              <span className={cx("min-w-0 flex-1", done && "line-through decoration-faint")}>
                {text}
              </span>
              {here && (
                <span className="shrink-0 text-sm font-semibold text-accent">You are here</span>
              )}
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function FinishedLine({ plan }: { plan: DayPlan }) {
  const finished = useNowStore((s) => s.finished);
  const timeOn = useAdhdPart("time");
  if (!finished || !timeOn) return null;
  const item = plan.items.find((i) => i.id === finished.itemId);
  if (!item?.done) return null;
  return (
    <p className="mb-3 flex items-center gap-2 text-sm text-muted" role="status">
      <CircleCheck size={16} aria-hidden="true" className="shrink-0 text-success" />
      <span>
        Done: {finished.title}. {plannedTook(finished.planned, finished.took)}.
      </span>
    </p>
  );
}

function NowItem({ item, today }: { item: PlanItem; today: TodayPlan }) {
  const { plan, shown } = today;
  const problems = useProblemStore((s) => s.states);
  const timeOn = useAdhdPart("time");
  const clock = useNowClock(plan.date, item.id);
  const running = clock?.lastAt != null;
  const now = useTicker(5_000, running);
  const elapsed = clock ? nowElapsedMs(clock, now) : 0;
  const plannedMinutes = clock?.plannedMinutes ?? plannedFor(item);
  const { planned, atPace } = useEstimate(item);
  useTimeCues(elapsed, plannedMinutes * 60_000, running, `now:${item.id}`);
  const Icon = KIND_ICON[item.kind];
  const subject = itemSubject(item, problems);
  const difficulty = itemDifficulty(item, problems);
  const stop = shown.findIndex((i) => i.id === item.id) + 1;
  const steps = itemSteps(item);
  const started = clock !== null && (running || clock.workedMs > 0);
  const hasTarget = startTarget(item) !== null;

  const start = (trial: boolean) => {
    startNow(plan.date, item, { trial });
    openItem(item);
  };

  return (
    <>
      <FinishedLine plan={plan} />
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
        <div className="min-w-0 space-y-1.5">
          <CardLabel>
            Now · stop {stop} of {shown.length}
          </CardLabel>
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-control bg-accent-soft text-accent max-sm:hidden">
              <Icon size={19} aria-hidden="true" />
            </span>
            <h2 className="min-w-0 pt-0.5 font-display text-2xl font-semibold text-balance text-text">
              {item.title}
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            {subject && (
              <Chip className="text-text" title={subject.name}>
                <SubjectMark subjectId={subject.id} />
                {subject.shortName}
              </Chip>
            )}
            {difficulty && <DifficultyChip difficulty={difficulty} />}
            <Chip>
              {planned} min planned
              {atPace !== null && `, about ${atPace} at your pace`}
            </Chip>
          </div>
        </div>
        {timeOn && (
          <DiscTimer
            elapsedMs={elapsed}
            totalMs={plannedMinutes * 60_000}
            size="lg"
            running={running || !started}
            label={started ? "Time on this stop" : "Time planned for this stop"}
            className="max-sm:hidden"
          />
        )}
      </div>
      {timeOn && (
        <DiscTimer
          elapsedMs={elapsed}
          totalMs={plannedMinutes * 60_000}
          size="md"
          running={running || !started}
          label={started ? "Time on this stop" : "Time planned for this stop"}
          className="mt-3 sm:hidden"
        />
      )}

      <StepList item={item} date={plan.date} />

      <div className="mt-5 flex flex-wrap items-center gap-2">
        {!started ? (
          <>
            <Button
              variant="primary"
              icon={Timer}
              onClick={() => start(true)}
              className="h-12 px-6 text-md max-sm:w-full"
            >
              Start with 2 minutes
            </Button>
            {hasTarget && (
              <Button variant="secondary" icon={Play} onClick={() => start(false)}>
                Start
              </Button>
            )}
          </>
        ) : (
          <>
            <Button
              variant="primary"
              icon={Check}
              onClick={() =>
                steps.length > 0
                  ? tickNextStep(plan.date, item.id)
                  : setPlanItemDone(plan.date, item.id, true)
              }
              className="h-12 px-6 text-md max-sm:w-full"
            >
              {steps.length > 0 ? "Done with this step" : "Done"}
            </Button>
            {running ? (
              <Button variant="secondary" icon={Pause} onClick={() => pauseNow()}>
                Pause
              </Button>
            ) : (
              <Button variant="secondary" icon={Play} onClick={() => startNow(plan.date, item)}>
                Continue
              </Button>
            )}
            {hasTarget && (
              <Button variant="ghost" onClick={() => openItem(item)}>
                Open it
              </Button>
            )}
          </>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-x-1 gap-y-1">
        {item.kind !== "thought" && (
          <Button size="sm" variant="ghost" icon={LifeBuoy} onClick={() => stuck(item)}>
            I'm stuck
          </Button>
        )}
        {swappable(item) && <SwapButton item={item} plan={plan} label="Swap this task" />}
        <Button size="sm" variant="ghost" icon={SquareParking} onClick={() => openPark()}>
          Park a thought
        </Button>
        <SkipButton item={item} date={plan.date} />
      </div>
    </>
  );
}

/** The folded rest of the day: "Then: 3 more stops", opening to the whole route. */
export function ThenMore({ today }: { today: TodayPlan }) {
  const [open, setOpen] = useState(false);
  const rest = today.shown.filter((i) => !i.done && i.id !== today.current?.id);
  const done = today.shown.filter((i) => i.done).length;
  if (rest.length === 0 && done === 0) return null;
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-control px-1 py-2 text-left text-base text-muted hover:text-text"
      >
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={cx("shrink-0 transition-transform", open && "rotate-180")}
        />
        <span>
          {rest.length > 0 ? (
            <>
              Then:{" "}
              <b className="text-text">
                {rest.length} more {rest.length === 1 ? "stop" : "stops"}
              </b>{" "}
              today, folded away until you get there.
            </>
          ) : today.current ? (
            "No more stops after this one."
          ) : (
            `All ${done} ${done === 1 ? "stop" : "stops"} on today's route are done.`
          )}{" "}
          {open ? "Hide the route." : "Show the whole route."}
        </span>
      </button>
      {open && (
        <div className="mt-2">
          <RouteCard today={today} />
        </div>
      )}
    </div>
  );
}

export function NowCard({ today }: { today: TodayPlan | null }) {
  if (!today) {
    return (
      <Card focal aria-label="Now">
        <div className="space-y-3" role="status" aria-label="Planning your day">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </Card>
    );
  }
  const { current, allDone, shown } = today;
  if (!current) {
    return (
      <Card focal aria-label="Now" className="flex items-center gap-5">
        <LineDrawing name={allDone ? "flag" : "compass"} size={76} />
        <div className="min-w-0 space-y-1" role="status">
          <CardLabel>{allDone ? "Route finished" : "Now"}</CardLabel>
          <FinishedLine plan={today.plan} />
          <h2 className="font-display text-xl font-semibold text-text">
            {allDone ? "Everything on today's plan is done" : "Nothing is planned for today"}
          </h2>
          <p className="text-base text-muted">
            {allDone
              ? "Anything more is a bonus."
              : shown.length === 0
                ? "Pick something from the map, or choose a longer time."
                : "Every stop left is skipped. Bring one back, or pick something from the map."}
          </p>
        </div>
      </Card>
    );
  }
  return (
    <Card focal aria-label={`Now: ${current.title}`}>
      <NowItem key={current.id} item={current} today={today} />
    </Card>
  );
}
