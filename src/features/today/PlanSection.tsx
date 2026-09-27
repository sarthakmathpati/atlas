// Today's plan (F16): the planner fills it on the first open of the day (lib/planner); the owner
// picks the time for today (15, 30, 60, 90, 120 minutes or their own number) or a minimum day,
// and each item has Start, Done, Skip and Swap. Changing the time plans the rest of the day
// again and keeps what is done. A bar shows the minutes done against the budget.
import {
  ArrowLeftRight,
  BookOpen,
  Calculator,
  Check,
  ChevronDown,
  Code2,
  DraftingCompass,
  Dumbbell,
  Layers,
  MessageSquareQuote,
  MessagesSquare,
  RotateCcw,
  ScrollText,
  SkipForward,
  Undo2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { routeHref } from "@/app/router";
import { Button, IconButton } from "@/components/ui/Button";
import { cx } from "@/components/ui/cx";
import { Input, Switch } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Misc";
import { Popover } from "@/components/ui/Popover";
import { ProgressBar } from "@/components/ui/Progress";
import { MINIMUM_DAY_MINUTES, planMinutes, swapOptions } from "@/lib/planner/planner";
import { formatMinutes } from "@/lib/time";
import type { DayPlan, PlanItem } from "@/lib/types";
import { useMinutesOn } from "@/stores/activityStore";
import { useToday } from "@/stores/clockStore";
import { openConceptReview, openFlashcards } from "@/stores/conceptDialogStore";
import { useDataReady } from "@/stores/hydrate";
import {
  ensurePlanned,
  removePlanItem,
  replan,
  restorePlan,
  setPlanItemDone,
  setPlanItemSkipped,
  swapPlanItem,
  usePlanStore,
} from "@/stores/planStore";
import { useProfileStore } from "@/stores/profileStore";
import { toast } from "@/stores/toastStore";
import { plannerInputNow } from "../insight/useInsight";

const BUDGET_PRESETS = [15, 30, 60, 90, 120] as const;

const KIND_ICON: Record<PlanItem["kind"], LucideIcon> = {
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
};

/** Where Start goes: a link, or a dialog opened in place (flashcards, a concept review). */
function startTarget(item: PlanItem): { href: string } | { run: () => void } | null {
  const ref = item.refId;
  switch (item.kind) {
    case "resolve":
      return ref ? { href: routeHref("/problems", ref, { mode: "resolve" }) } : null;
    case "new-problem":
      return ref ? { href: routeHref("/problems", ref) } : null;
    case "learn-concept":
      return ref ? { href: routeHref("/map", undefined, { focus: ref }) } : null;
    case "review-concept": {
      const ids = item.refIds?.length ? item.refIds : ref ? [ref] : [];
      if (ids.length === 0) return null;
      if (ids.length === 1 && item.origin !== "planner")
        return { run: () => openConceptReview(ids[0]!) };
      return { run: () => openFlashcards({ conceptIds: ids, title: item.title, session: true }) };
    }
    case "drill":
      return { href: "#/drill" };
    case "revision":
      return {
        href: routeHref("/revision", undefined, { scope: ref === "revision-day" ? "day" : "week" }),
      };
    case "mental-math":
      return { href: "#/mental-math" };
    case "mock":
      return { href: "#/mock" };
    case "design":
      return ref ? { href: routeHref("/designs", ref) } : null;
    case "story":
      return { href: routeHref("/stories", undefined, ref ? { question: ref } : undefined) };
  }
}

function StartButton({ item }: { item: PlanItem }) {
  const target = startTarget(item);
  if (!target) return null;
  return "href" in target ? (
    <Button size="sm" href={target.href}>
      Start
    </Button>
  ) : (
    <Button size="sm" onClick={target.run}>
      Start
    </Button>
  );
}

function SwapButton({ item, plan }: { item: PlanItem; plan: DayPlan }) {
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
        <Button {...props} size="sm" variant="ghost" icon={ArrowLeftRight}>
          Swap
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

function PlanRow({ item, plan }: { item: PlanItem; plan: DayPlan }) {
  const Icon = KIND_ICON[item.kind];
  const owner = item.origin !== "planner";
  const date = plan.date;
  return (
    <li className={cx("flex gap-3 px-3 py-3 sm:px-4", item.done && "bg-surface-sunken/40")}>
      <button
        type="button"
        role="checkbox"
        aria-checked={item.done}
        aria-label={`Done: ${item.title}`}
        onClick={() => setPlanItemDone(date, item.id, !item.done)}
        className={cx(
          "mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border transition-colors max-md:size-7",
          item.done
            ? "border-strong-stroke bg-strong text-canvas"
            : "border-rule-strong bg-surface hover:border-accent",
        )}
      >
        {item.done && <Check size={14} strokeWidth={3} aria-hidden="true" />}
      </button>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-2">
          <Icon size={16} aria-hidden="true" className="mt-1 shrink-0 text-muted" />
          <p
            className={cx(
              "min-w-0 flex-1 font-medium",
              item.done ? "text-muted line-through" : "text-text",
            )}
          >
            {item.title}
          </p>
          <span className="mt-0.5 shrink-0 text-sm text-muted tabular-nums">
            {item.estMinutes} min
          </span>
        </div>
        <p className="mt-0.5 text-sm text-muted">
          {item.reason}
          {owner && !/Added by you/.test(item.reason) && (
            <span className="text-faint"> Added by you.</span>
          )}
        </p>
        {!item.done && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StartButton item={item} />
            {item.kind !== "drill" && item.kind !== "mental-math" && (
              <SwapButton item={item} plan={plan} />
            )}
            {owner ? (
              <Button
                size="sm"
                variant="ghost"
                icon={X}
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
            )}
          </div>
        )}
      </div>
    </li>
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
          aria-label={`Time for today: ${value} minutes. Change it`}
        >
          {formatMinutes(value)}
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

/** The plan card on Today. */
export function PlanSection() {
  const profile = useProfileStore((s) => s.profile);
  const today = useToday();
  const ready = useDataReady((s) => s.ready);
  const plan = usePlanStore((s) => s.plans[today]);
  const activity = useMinutesOn(today);
  const [showSkipped, setShowSkipped] = useState(false);

  // Plan the day on the first open (and after midnight, once the new day's plan is loaded).
  useEffect(() => {
    if (!ready || !profile || plan?.plannedAt) return;
    const input = plannerInputNow({
      budget: plan?.budgetMinutes ?? profile.dailyMinutes,
      minimumDay: plan?.minimumDay ?? false,
    });
    if (input && input.date === today) ensurePlanned(input);
  }, [ready, profile, plan?.plannedAt, plan?.budgetMinutes, plan?.minimumDay, today]);

  const planAgain = (budget: number, minimumDay: boolean, message: string) => {
    const input = plannerInputNow({ budget, minimumDay });
    if (!input) return;
    const before = replan(input);
    toast(message, before ? { action: { label: "Undo", onClick: () => restorePlan(before) } } : {});
  };

  if (!plan?.plannedAt) {
    return (
      <section aria-label="Today's plan" className="rounded-panel border border-rule bg-surface">
        <div className="space-y-3 p-5" role="status" aria-label="Planning your day">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-2 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-14 w-full" />
        </div>
      </section>
    );
  }

  const budget = plan.minimumDay ? MINIMUM_DAY_MINUTES : plan.budgetMinutes;
  const { planned, done } = planMinutes(plan.items);
  const shown = plan.items.filter((i) => !i.skipped);
  const skipped = plan.items.filter((i) => i.skipped);
  const allDone = shown.length > 0 && shown.every((i) => i.done);

  return (
    <section aria-labelledby="plan-heading" className="rounded-panel border border-rule bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-b border-rule px-4 py-3 sm:px-5">
        <h2 id="plan-heading" className="text-md font-semibold text-text">
          Today's plan
        </h2>
        <BudgetPicker
          plan={plan}
          onPick={(m) =>
            planAgain(m, false, `Planned again for ${formatMinutes(m)}. Done items stay.`)
          }
        />
      </div>
      <div className="space-y-3 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-sm">
          <span className="text-text tabular-nums">
            <span className="font-semibold">{done}</span> of {budget} min done
          </span>
          <span className="text-muted tabular-nums">
            {planned} min planned, {Math.round(activity)} min of activity today
          </span>
        </div>
        <ProgressBar
          value={budget > 0 ? done / budget : 0}
          label="Minutes done against today's time"
        />
        <Switch
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
      </div>
      {shown.length === 0 ? (
        <p className="border-t border-rule px-4 py-4 text-base text-muted sm:px-5">
          Nothing is planned for today. Pick something from the map, or choose a longer time.
        </p>
      ) : (
        <ul className="divide-y divide-rule border-t border-rule" aria-label="Plan items">
          {shown.map((item) => (
            <PlanRow key={item.id} item={item} plan={plan} />
          ))}
        </ul>
      )}
      {allDone && (
        <p className="border-t border-rule px-4 py-3 text-base text-text sm:px-5" role="status">
          Everything on today's plan is done. Anything more is a bonus.
        </p>
      )}
      {skipped.length > 0 && (
        <div className="border-t border-rule px-4 py-2.5 sm:px-5">
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
