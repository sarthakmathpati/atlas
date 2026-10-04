// ADHD mode's parts on Today (F32): Today's ink (a drop for each finished step) with the week's
// strip (a flag for each finished day, toward the week's stamp), the if-then line ("When I ___,
// I'll start the first stop"), Welcome back after a gap, and the break that's coming.
import { Flag, Leaf, Pencil, Sunrise, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { routeHref } from "@/app/router";
import { Button, IconButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cx } from "@/components/ui/cx";
import { Input } from "@/components/ui/Field";
import { Callout } from "@/components/ui/Misc";
import { weekStart } from "@/lib/activity/heatmap";
import { isActiveDay } from "@/lib/activity/streak";
import { FRESH_START_OVER, welcomeBackDue } from "@/lib/adhd/freshStart";
import {
  cleanWhen,
  clockInText,
  clockLabel,
  START_LINE_MAX,
  startLineSentence,
  startWhenFor,
  startWhenIsToday,
} from "@/lib/adhd/startLine";
import { ticksOf } from "@/lib/adhd/steps";
import { STAMP_DAYS } from "@/lib/insight/summit";
import { isMovement, movementPrompt } from "@/lib/focus/prompts";
import { addDaysToDate, parseLocalDate } from "@/lib/time";
import { setAdhd, useAdhd } from "@/stores/adhdStore";
import { useActivityStore } from "@/stores/activityStore";
import {
  blockRunning,
  focusDurations,
  focusElapsedMs,
  useFocusTimerStore,
} from "@/stores/focusTimerStore";
import { itemSteps, useInkToday } from "@/stores/nowStore";
import { useTicker } from "../focus/hooks";
import { Stamp } from "../insight/Stamp";
import { useStamps } from "../insight/stamps";
import { useActivityInsight } from "../insight/useInsight";
import { useReviewQueue } from "../review/useReviewQueue";
import type { TodayPlan } from "../today/useTodayPlan";

// ----- Today's ink ------------------------------------------------------------------------------

/** Drops shown at most (more are summed up in words). */
const MAX_DROPS = 36;

function Drop({ filled, fresh }: { filled: boolean; fresh?: boolean }) {
  return (
    <svg
      width={16}
      height={20}
      viewBox="0 0 16 20"
      aria-hidden="true"
      data-filled={filled || undefined}
      className={cx("shrink-0", fresh && "ink-drop-new")}
    >
      <path
        d="M8 1.2C8 1.2 2 8.6 2 12.6a6 6 0 0 0 12 0C14 8.6 8 1.2 8 1.2Z"
        fill={filled ? "var(--accent)" : "var(--surface-sunken)"}
        stroke={filled ? "var(--accent)" : "var(--rule-strong)"}
        strokeWidth={1.2}
      />
    </svg>
  );
}

/** Steps still to do on today's stops (a stop without steps counts as one). */
function stepsToGo(today: TodayPlan | null): number {
  if (!today) return 0;
  let n = 0;
  for (const item of today.shown) {
    if (item.done) continue;
    const steps = itemSteps(item);
    if (steps.length === 0) n += 1;
    else n += ticksOf(item, steps.length).filter((t) => !t).length;
  }
  return n;
}

const weekdayLetter = (date: string) =>
  parseLocalDate(date).toLocaleDateString(undefined, { weekday: "narrow" });
const weekdayName = (date: string) =>
  parseLocalDate(date).toLocaleDateString(undefined, { weekday: "long" });

/** The week's strip: a flag for each finished day, toward the week's stamp. */
function WeekStrip({ date }: { date: string }) {
  const monday = weekStart(date);
  const days = Array.from({ length: 7 }, (_, i) => addDaysToDate(monday, i));
  const months = useActivityStore((s) => s.months);
  const { lookup } = useActivityInsight();
  const [stamp] = useStamps([monday]);
  const finished = days.filter((d) => (months[d.slice(0, 7)]?.days[d]?.planFinished ?? 0) > 0);
  const active = days.filter((d) => isActiveDay(lookup(d))).length;
  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm font-medium text-text">This week</p>
      <div className="flex items-center gap-4">
        <ol className="grid flex-1 grid-cols-7 gap-1.5" aria-label="This week's finished days">
          {days.map((d) => {
            const flag = finished.includes(d);
            return (
              <li key={d} className="flex flex-col items-center gap-1">
                <span
                  className={cx(
                    "grid aspect-square w-full max-w-9 place-items-center rounded-[8px]",
                    flag ? "bg-accent-soft text-accent" : "bg-surface-sunken text-faint",
                    d === date && "ring-2 ring-text ring-offset-2 ring-offset-surface",
                  )}
                  aria-hidden="true"
                >
                  {flag && <Flag size={15} strokeWidth={2.2} />}
                </span>
                <span aria-hidden="true" className="text-xs text-muted">
                  {weekdayLetter(d)}
                </span>
                <span className="sr-only">
                  {weekdayName(d)}
                  {d === date ? " (today)" : ""}: {flag ? "plan finished, a flag" : "no flag yet"}
                </span>
              </li>
            );
          })}
        </ol>
        {stamp && <Stamp stamp={stamp} size={70} />}
      </div>
      <p className="text-sm text-muted">
        {finished.length === 0
          ? "A finished day adds a flag here."
          : `${finished.length} finished ${finished.length === 1 ? "day" : "days"} this week.`}{" "}
        {stamp
          ? "This week's stamp is yours."
          : `${Math.min(active, STAMP_DAYS)} of ${STAMP_DAYS} active days toward this week's stamp.`}
      </p>
    </div>
  );
}

/** Today's ink: a drop for each finished step, and the week's strip. Nothing is taken away. */
export function InkCard({ today, date }: { today: TodayPlan | null; date: string }) {
  const ink = useInkToday(date);
  const toGo = stepsToGo(today);
  // The drops that arrived while the page is open fill in with a short stroke.
  const seen = useRef(ink);
  const [fresh, setFresh] = useState(0);
  useEffect(() => {
    if (ink > seen.current) setFresh(ink - seen.current);
    seen.current = ink;
  }, [ink]);
  const filled = Math.min(ink, MAX_DROPS);
  const empty = Math.max(0, Math.min(toGo, MAX_DROPS - filled));
  const label = `${ink} ${ink === 1 ? "step" : "steps"} done today${toGo ? `, ${toGo} to go` : ""}`;
  return (
    <Card aria-labelledby="ink-heading" title={<span id="ink-heading">Today's ink</span>}>
      <div role="img" aria-label={label} className="flex flex-wrap gap-1.5">
        {Array.from({ length: filled }, (_, i) => (
          <Drop key={`f${i}`} filled fresh={i >= filled - fresh} />
        ))}
        {Array.from({ length: empty }, (_, i) => (
          <Drop key={`e${i}`} filled={false} />
        ))}
      </div>
      <p className="mt-2 text-sm text-muted">
        {ink === 0
          ? "Each finished step adds a drop."
          : `${ink} ${ink === 1 ? "step" : "steps"} done today. Each one adds a drop.`}
        {ink > MAX_DROPS ? ` (${MAX_DROPS} shown.)` : ""}
      </p>
      <WeekStrip date={date} />
    </Card>
  );
}

// ----- the if-then line ------------------------------------------------------------------------

/** "When I ___, I'll start the first stop" (kept for the day, or as a default). */
export function StartLine({ date }: { date: string }) {
  const adhd = useAdhd();
  const when = startWhenFor(adhd, date);
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(when);
  const save = (forToday: boolean) => {
    const clean = cleanWhen(text);
    if (!clean) return;
    setAdhd(
      forToday
        ? { startWhenDay: { date, text: clean } }
        : { startWhen: clean, startWhenDay: undefined },
    );
    setEditing(false);
  };
  if (when && !editing) {
    const minute = clockInText(when);
    return (
      <section
        aria-label="Your start plan"
        className="flex items-start gap-3 rounded-panel bg-surface px-4 py-3"
      >
        <Flag size={18} aria-hidden="true" className="mt-0.5 shrink-0 text-accent" />
        <div className="min-w-0 flex-1">
          <p className="text-base text-text">
            <span className="text-muted">Your plan: </span>
            {startLineSentence(when)}
          </p>
          <p className="text-sm text-muted">
            {startWhenIsToday(adhd, date) ? "Just for today." : "Every day."}
            {minute !== null ? ` Atlas reminds you at ${clockLabel(minute)} while it's open.` : ""}
          </p>
        </div>
        <IconButton
          size="sm"
          icon={Pencil}
          label="Change your start plan"
          onClick={() => {
            setText(when);
            setEditing(true);
          }}
        />
      </section>
    );
  }
  return (
    <section aria-label="Your start plan" className="rounded-panel bg-surface px-4 py-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save(true);
        }}
        className="space-y-2.5"
      >
        <label htmlFor="start-when" className="block text-base text-text">
          Plan your start: when will you begin the first stop?
        </label>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-base text-text">
          <span className="flex min-w-0 flex-1 basis-64 items-center gap-2">
            <span>When</span>
            <Input
              id="start-when"
              value={text}
              maxLength={START_LINE_MAX}
              placeholder="I finish dinner"
              onChange={(e) => setText(e.target.value)}
              className="min-w-0 flex-1"
              autoComplete="off"
            />
            <span aria-hidden="true" className="-ml-1.5">
              ,
            </span>
          </span>
          <span>I'll start the first stop.</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" variant="primary" disabled={!cleanWhen(text)}>
            Just for today
          </Button>
          <Button type="button" size="sm" disabled={!cleanWhen(text)} onClick={() => save(false)}>
            Every day
          </Button>
          {editing && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          )}
        </div>
        <p className="text-sm text-muted">
          A time works too ("it's 7 pm"): Atlas shows the line then, while it's open.
        </p>
      </form>
    </section>
  );
}

// ----- Welcome back -----------------------------------------------------------------------------

const WELCOME_KEY = "atlas.welcomeBack";

function closedOn(): string | null {
  try {
    return localStorage.getItem(WELCOME_KEY);
  } catch {
    return null;
  }
}

/** After 3 days or more away: a warm hello, never a count of missed days. */
export function WelcomeBack({ date }: { date: string }) {
  const { lookup, loaded } = useActivityInsight();
  const queue = useReviewQueue();
  const [closed, setClosed] = useState(() => closedOn() === date);
  if (!loaded || closed || !welcomeBackDue(lookup, date)) return null;
  const overdue =
    queue.problems.filter((p) => p.daysLate > 0).length +
    queue.concepts.filter((c) => c.daysLate > 0).length;
  return (
    <Callout
      icon={Sunrise}
      title="Welcome back"
      actions={
        <IconButton
          size="sm"
          icon={X}
          label="Close"
          onClick={() => {
            try {
              localStorage.setItem(WELCOME_KEY, date);
            } catch {
              /* it may show again after a reload */
            }
            setClosed(true);
          }}
        />
      }
    >
      Good to see you. Start small: the first stop is ready below.
      {overdue > FRESH_START_OVER && (
        <>
          {" "}
          Reviews piled up for a while;{" "}
          <a href={routeHref("/review")} className="text-accent hover:underline">
            Fresh start on Review
          </a>{" "}
          spreads them over the next week.
        </>
      )}
    </Callout>
  );
}

// ----- the break that's coming -----------------------------------------------------------------

/** While a block runs: when the break comes and a movement idea for it. */
export function BreakHint({ date }: { date: string }) {
  const running = useFocusTimerStore((s) => blockRunning(s));
  const startedAt = useFocusTimerStore((s) => s.startedAt);
  const accumulatedMs = useFocusTimerStore((s) => s.accumulatedMs);
  const now = useTicker(30_000, running);
  if (!running) return null;
  const left = focusDurations().focus - focusElapsedMs({ startedAt, accumulatedMs }, now);
  const minutes = Math.max(1, Math.ceil(left / 60_000));
  const idea = movementPrompt(date, 0);
  return (
    <p className="flex items-center gap-2.5 rounded-panel border-[1.5px] border-dashed border-rule px-4 py-2.5 text-base text-muted">
      <Leaf size={17} aria-hidden="true" className="shrink-0 text-strong-stroke" />
      <span>
        Break in {minutes} {minutes === 1 ? "minute" : "minutes"}:{" "}
        {isMovement(idea) ? idea.charAt(0).toLowerCase() + idea.slice(1) : idea}
      </span>
    </p>
  );
}
