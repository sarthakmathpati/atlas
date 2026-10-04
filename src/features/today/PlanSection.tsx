// Today's plan (F16, 12.10.7): the planner fills it on the first open of the day (lib/planner);
// the owner picks the time for today (15, 30, 60, 90, 120 minutes or their own number) or a
// minimum day, and each item has Start, Done, Skip and Swap. Changing the time plans the rest of
// the day again and keeps what is done.
// Shown as "Up next" (the first item not done, the screen's one focal card, with a big Start) and
// "Today's route": every item is a stop on a dashed line (done stops a filled accent check, the
// current one ringed, the last a flag), and finishing a stop inks the line to the next one in
// 250 ms. The minutes done against the budget are the ring in the page head (TodayHead).
import {
  ArrowLeftRight,
  BookOpen,
  Calculator,
  Check,
  ChevronDown,
  Code2,
  Flag,
  DraftingCompass,
  Dumbbell,
  Layers,
  MessageSquareQuote,
  MessagesSquare,
  RotateCcw,
  ScrollText,
  SkipForward,
  StickyNote,
  Timer,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";
import { Button, IconButton, type ButtonVariant } from "@/components/ui/Button";
import { Card, CardLabel } from "@/components/ui/Card";
import { Chip, DifficultyChip } from "@/components/ui/Chip";
import { cx } from "@/components/ui/cx";
import { Input, Switch } from "@/components/ui/Field";
import { LineDrawing } from "@/components/ui/LineDrawing";
import { Skeleton } from "@/components/ui/Misc";
import { Popover } from "@/components/ui/Popover";
import { SubjectMark } from "@/components/ui/SubjectEmblem";
import { intentionForItem } from "@/lib/focus/intention";
import { swapOptions } from "@/lib/planner/planner";
import { formatMinutes } from "@/lib/time";
import type { DayPlan, PlanItem } from "@/lib/types";
import {
  removePlanItem,
  restorePlan,
  setPlanItemDone,
  setPlanItemSkipped,
  swapPlanItem,
} from "@/stores/planStore";
import { askToStartBlock, blockActive, useFocusTimerStore } from "@/stores/focusTimerStore";
import { useProblemStore } from "@/stores/problemStore";
import { toast } from "@/stores/toastStore";
import { plannerInputNow } from "../insight/useInsight";
import { itemDifficulty, itemSubject, swappable } from "./planItems";
import { startTarget } from "./startTarget";
import type { TodayPlan } from "./useTodayPlan";

const BUDGET_PRESETS = [15, 30, 60, 90, 120] as const;

export const KIND_ICON: Record<PlanItem["kind"], LucideIcon> = {
  resolve: RotateCcw,
  "review-concept": Layers,
  "learn-concept": BookOpen,
  "new-problem": Code2,
  drill: Dumbbell,
  "mental-math": Calculator,
  mock: MessagesSquare,
  design: DraftingCompass,
  story: MessageSquareQuote,
  revision: ScrollText,
  thought: StickyNote,
};

const KIND_LABEL: Record<PlanItem["kind"], string> = {
  resolve: "re-solves",
  "review-concept": "flashcard rounds",
  "learn-concept": "concepts ready to learn",
  "new-problem": "new problems",
  drill: "drills",
  "mental-math": "mental math sprints",
  mock: "mock interviews",
  design: "design prompts",
  story: "behavioral questions",
  revision: "revision sheets",
  thought: "parked thoughts",
};

function StartButton({
  item,
  variant = "secondary",
  className,
}: {
  item: PlanItem;
  variant?: ButtonVariant;
  className?: string;
}) {
  const target = startTarget(item);
  if (!target) return null;
  const size = variant === "primary" ? "md" : "sm";
  return "href" in target ? (
    <Button size={size} variant={variant} href={target.href} className={className}>
      Start
    </Button>
  ) : (
    <Button size={size} variant={variant} onClick={target.run} className={className}>
      Start
    </Button>
  );
}

export function SwapButton({
  item,
  plan,
  className,
  label = "Swap",
}: {
  item: PlanItem;
  plan: DayPlan;
  className?: string;
  /** The button's words ("Swap this task" on ADHD mode's Now card). */
  label?: string;
}) {
  const [options, setOptions] = useState<PlanItem[] | null>(null);
  return (
    <Popover
      label={`Swap ${item.title}`}
      placement="bottom-start"
      className="w-80 max-w-[calc(100vw-2rem)]"
      onOpenChange={(open) => {
        if (!open) return;
        const input = plannerInputNow({ budget: plan.budgetMinutes, minimumDay: plan.minimumDay });
        setOptions(input ? swapOptions(input, plan.items, item.id) : []);
      }}
      renderTrigger={(props) => (
        <Button {...props} size="sm" variant="ghost" icon={ArrowLeftRight} className={className}>
          {label}
        </Button>
      )}
    >
      {(close) => (
        <div className="space-y-2">
          <p className="text-sm font-medium text-text">Swap for</p>
          {options === null ? (
            <Skeleton className="h-10 w-full" />
          ) : options.length === 0 ? (
            <p className="text-sm text-muted">
              No other {KIND_LABEL[item.kind]} fit today. Skip this one instead, or add something
              from the map.
            </p>
          ) : (
            <ul className="space-y-1">
              {options.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => {
                      close();
                      const before = swapPlanItem(plan.date, item.id, o);
                      if (before)
                        toast(`Swapped in ${o.title.replace(/^[^:]+: /, "")}.`, {
                          action: { label: "Undo", onClick: () => restorePlan(before) },
                        });
                    }}
                    className="w-full rounded-control px-2.5 py-2 text-left hover:bg-surface-sunken focus-visible:bg-accent-soft"
                  >
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-medium text-text">{o.title}</span>
                      <span className="shrink-0 text-sm text-muted tabular-nums">
                        {o.estMinutes} min
                      </span>
                    </span>
                    <span className="mt-0.5 block text-sm text-muted">{o.reason}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Popover>
  );
}

function BudgetPicker({ plan, onPick }: { plan: DayPlan; onPick: (budget: number) => void }) {
  const [custom, setCustom] = useState("");
  const value = plan.budgetMinutes;
  return (
    <Popover
      label="Time for today"
      placement="bottom-end"
      className="w-72"
      renderTrigger={(props) => (
        <Button
          {...props}
          size="sm"
          trailingIcon={ChevronDown}
          aria-label={
            plan.minimumDay
              ? "Time for today: a minimum day. Change it"
              : `Time for today: ${value} minutes. Change it`
          }
        >
          {plan.minimumDay ? "Minimum day" : formatMinutes(value)}
        </Button>
      )}
    >
      {(close) => (
        <div className="space-y-3">
          <div>
            <p className="text-sm font-medium text-text">Time for today</p>
            <p className="text-sm text-muted">
              The rest of the day is planned again. Done items stay.
            </p>
          </div>
          <div className="grid grid-cols-5 gap-1.5" role="group" aria-label="Minutes">
            {BUDGET_PRESETS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={!plan.minimumDay && value === m}
                onClick={() => {
                  close();
                  onPick(m);
                }}
                className={cx(
                  "h-9 rounded-control border text-sm font-medium tabular-nums max-md:h-11",
                  !plan.minimumDay && value === m
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-rule text-text hover:bg-surface-sunken",
                )}
              >
                {m}
              </button>
            ))}
          </div>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Math.round(Number(custom));
              if (!Number.isFinite(n) || n < 10 || n > 480) {
                toast("Choose between 10 and 480 minutes.", { tone: "error" });
                return;
              }
              close();
              onPick(n);
              setCustom("");
            }}
          >
            <label className="min-w-0 flex-1 space-y-1">
              <span className="text-sm text-text">Your own number</span>
              <Input
                type="number"
                inputMode="numeric"
                min={10}
                max={480}
                step={5}
                placeholder="45"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
              />
            </label>
            <Button type="submit" size="sm" className="mb-0.5">
              Use
            </Button>
          </form>
        </div>
      )}
    </Popover>
  );
}

/** Skip for planned items; Remove for the owner's own (both with Undo). */
export function SkipButton({
  item,
  date,
  className,
}: {
  item: PlanItem;
  date: string;
  className?: string;
}) {
  const owner = item.origin !== "planner";
  return owner ? (
    <Button
      size="sm"
      variant="ghost"
      icon={X}
      className={className}
      onClick={() => {
        const before = removePlanItem(date, item.id);
        if (before)
          toast("Removed from today's plan.", {
            action: { label: "Undo", onClick: () => restorePlan(before) },
          });
      }}
    >
      Remove
    </Button>
  ) : (
    <Button
      size="sm"
      variant="ghost"
      icon={SkipForward}
      className={className}
      onClick={() => {
        setPlanItemSkipped(date, item.id, true);
        toast("Skipped for today.", {
          action: {
            label: "Undo",
            onClick: () => setPlanItemSkipped(date, item.id, false),
          },
        });
      }}
    >
      Skip
    </Button>
  );
}

/** "Start a focus block" for a plan item (F31): the block's line comes from the item. */
function FocusBlockButton({ item }: { item: PlanItem }) {
  const busy = useFocusTimerStore((s) => blockActive(s));
  if (busy) return null;
  return (
    <Button
      size="sm"
      variant="ghost"
      icon={Timer}
      onClick={() => askToStartBlock({ line: intentionForItem(item), planItemId: item.id })}
    >
      Start a focus block
    </Button>
  );
}

function OwnerNote({ item }: { item: PlanItem }) {
  if (item.origin === "planner" || /Added by you/.test(item.reason)) return null;
  return <span className="text-faint"> Added by you.</span>;
}

// ----- the day's plan, shared by the head, Up next and the route -------------------------------

// ----- Up next -----------------------------------------------------------------------------------

/** The one focal card on Today: the first stop not done, with a big Start. */
export function UpNextCard({ today }: { today: TodayPlan | null }) {
  const problems = useProblemStore((s) => s.states);
  if (!today) {
    return (
      <Card focal aria-label="Up next">
        <div className="space-y-3" role="status" aria-label="Planning your day">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-11 w-32 rounded-full" />
        </div>
      </Card>
    );
  }
  const { current, plan, allDone, shown } = today;
  if (!current) {
    return (
      <Card focal className="flex items-center gap-5">
        <LineDrawing name={allDone ? "flag" : "compass"} size={76} />
        <div className="min-w-0 space-y-1" role="status">
          <CardLabel>{allDone ? "Route finished" : "Up next"}</CardLabel>
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
          {!allDone && (
            <div className="pt-2">
              <Button href="#/map">Open the map</Button>
            </div>
          )}
        </div>
      </Card>
    );
  }
  const Icon = KIND_ICON[current.kind];
  const subject = itemSubject(current, problems);
  const difficulty = itemDifficulty(current, problems);
  return (
    <Card focal aria-label={`Up next: ${current.title}`} className="space-y-3">
      <CardLabel>Up next</CardLabel>
      <div className="flex items-start gap-3.5">
        <span className="grid size-11 shrink-0 place-items-center rounded-control bg-accent-soft text-accent">
          <Icon size={20} aria-hidden="true" />
        </span>
        <h2 className="min-w-0 pt-1.5 font-display text-xl font-semibold text-balance text-text sm:text-2xl">
          {current.title}
        </h2>
      </div>
      <p className="max-w-[62ch] text-md text-muted">
        {current.reason}
        <OwnerNote item={current} />
      </p>
      <div className="flex flex-wrap gap-1.5">
        {subject && (
          <Chip className="text-text" title={subject.name}>
            <SubjectMark subjectId={subject.id} />
            {subject.shortName}
          </Chip>
        )}
        {difficulty && <DifficultyChip difficulty={difficulty} />}
        <Chip>{current.estMinutes} min</Chip>
      </div>
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 pt-2">
        <StartButton item={current} variant="primary" className="h-12 px-8 text-md max-sm:w-full" />
        <FocusBlockButton item={current} />
        <Button
          size="sm"
          variant="ghost"
          icon={Check}
          onClick={() => setPlanItemDone(plan.date, current.id, true)}
        >
          Done
        </Button>
        {swappable(current) && <SwapButton item={current} plan={plan} />}
        <SkipButton item={current} date={plan.date} />
      </div>
    </Card>
  );
}

// ----- Today's route -----------------------------------------------------------------------------

function StopMarker({
  item,
  current,
  last,
  onToggle,
}: {
  item: PlanItem;
  current: boolean;
  last: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={item.done}
      aria-label={`Done: ${item.title}`}
      onClick={onToggle}
      className={cx(
        "relative z-10 grid size-7 shrink-0 place-items-center rounded-full border-2 transition-colors",
        item.done
          ? "border-accent bg-accent text-on-accent"
          : current
            ? "border-accent bg-surface text-accent ring-4 ring-accent-soft"
            : "border-rule-strong bg-surface text-muted hover:border-accent",
      )}
    >
      {item.done ? (
        <Check size={15} strokeWidth={3} aria-hidden="true" />
      ) : last ? (
        <Flag size={13} strokeWidth={2.2} aria-hidden="true" />
      ) : current ? (
        <span aria-hidden="true" className="size-2.5 rounded-full bg-accent" />
      ) : null}
    </button>
  );
}

function RouteStop({
  item,
  plan,
  current,
  last,
}: {
  item: PlanItem;
  plan: DayPlan;
  current: boolean;
  last: boolean;
}) {
  const problems = useProblemStore((s) => s.states);
  const subject = itemSubject(item, problems);
  // The ink stroke plays when this stop is finished on screen, not on every render.
  const [wasDone, setWasDone] = useState(item.done);
  const [inked, setInked] = useState(false);
  if (item.done !== wasDone) {
    setWasDone(item.done);
    setInked(item.done);
  }
  return (
    <li className="relative flex gap-3.5 pb-4 last:pb-0">
      {!last && (
        <span aria-hidden="true" className="absolute top-8 -bottom-1 left-[13px] w-0.5">
          <span className="absolute inset-0 border-l-2 border-dashed border-rule-strong" />
          {item.done && (
            <span
              data-inked={inked || undefined}
              className="route-ink absolute inset-0 rounded-full bg-accent"
            />
          )}
        </span>
      )}
      <StopMarker
        item={item}
        current={current}
        last={last}
        onToggle={() => setPlanItemDone(plan.date, item.id, !item.done)}
      />
      <div className="min-w-0 flex-1 pt-0.5">
        <div className="flex items-baseline gap-3">
          <p
            className={cx(
              "min-w-0 flex-1 font-semibold",
              item.done ? "text-muted line-through decoration-rule-strong" : "text-text",
            )}
          >
            {item.title}
          </p>
          <span className="shrink-0 text-sm text-muted tabular-nums">{item.estMinutes} min</span>
        </div>
        <p className="mt-0.5 text-sm text-muted">
          {subject && <SubjectMark subjectId={subject.id} className="mr-1.5 align-[0.05em]" />}
          {item.reason}
          <OwnerNote item={item} />
        </p>
        {current && !item.done && <p className="mt-1 text-sm font-semibold text-accent">Up next</p>}
        {!item.done && !current && (
          <div className="-ml-2 mt-1 flex flex-wrap items-center">
            <StartButton item={item} variant="ghost" className="h-8 px-2.5 text-accent" />
            {swappable(item) && <SwapButton item={item} plan={plan} className="h-8 px-2.5" />}
            <SkipButton item={item} date={plan.date} className="h-8 px-2.5" />
          </div>
        )}
      </div>
    </li>
  );
}

/** Today's route: every stop of the day on a dashed line, the time for today and minimum day. */
export function RouteCard({ today }: { today: TodayPlan | null }) {
  const [showSkipped, setShowSkipped] = useState(false);
  if (!today) {
    return (
      <Card title="Today's route">
        <div className="space-y-3" role="status" aria-label="Planning your day">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
    );
  }
  const { plan, shown, skipped, current, planned, activity, planAgain } = today;
  const doneStops = shown.filter((i) => i.done).length;
  return (
    <section aria-labelledby="plan-heading" className="rounded-panel bg-surface p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <h2 id="plan-heading" className="font-display text-lg font-semibold text-text">
            Today's route
          </h2>
          <p className="text-sm text-muted tabular-nums">
            {shown.length > 0 && `${doneStops} of ${shown.length} stops done. `}
            {planned} min planned, {activity} min of activity today.
          </p>
        </div>
        <BudgetPicker
          plan={plan}
          onPick={(m) =>
            planAgain(m, false, `Planned again for ${formatMinutes(m)}. Done items stay.`)
          }
        />
      </div>
      <Switch
        className="mt-3 rounded-control bg-surface-sunken px-3 py-2.5"
        checked={plan.minimumDay}
        onChange={(on) =>
          planAgain(
            plan.budgetMinutes,
            on,
            on
              ? "Minimum day: one small thing keeps the streak going."
              : `Back to ${formatMinutes(plan.budgetMinutes)}. Done items stay.`,
          )
        }
        label="Minimum day"
        description="For a hard day: one small thing, about 15 minutes, to keep momentum."
      />
      {shown.length === 0 ? (
        <p className="mt-4 text-base text-muted">
          Nothing is planned for today. Pick something from the map, or choose a longer time.
        </p>
      ) : (
        <ol className="mt-5" aria-label="Plan items">
          {shown.map((item, i) => (
            <RouteStop
              key={item.id}
              item={item}
              plan={plan}
              current={item.id === current?.id}
              last={i === shown.length - 1}
            />
          ))}
        </ol>
      )}
      {skipped.length > 0 && (
        <div className="mt-4 border-t border-rule pt-3">
          <button
            type="button"
            onClick={() => setShowSkipped((v) => !v)}
            aria-expanded={showSkipped}
            className="text-sm text-accent hover:underline"
          >
            {showSkipped ? "Hide skipped" : `Skipped today (${skipped.length})`}
          </button>
          {showSkipped && (
            <ul className="mt-2 space-y-1.5">
              {skipped.map((i) => (
                <li key={i.id} className="flex items-center gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate text-muted">{i.title}</span>
                  <IconButton
                    size="sm"
                    icon={Undo2}
                    label={`Bring back ${i.title}`}
                    onClick={() => setPlanItemSkipped(plan.date, i.id, false)}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
