// The Now card's clock and steps (F32, parts 2, 3 and 5).
//
// Starting an item from the Now card starts its clock, which counts while the app is open (a gap
// of more than two minutes, such as a closed laptop, isn't counted) and adds to today's activity.
// "Start with 2 minutes" asks at the two-minute mark whether to keep going or stop there (both
// fine). When the item turns done, wherever that happens, the finisher registered here ticks its
// remaining steps (each new tick drops ink on Today), notes how long it took (the clock, else the
// saved attempt's minutes), records the pace and says "Planned 15, took 22". A finished day
// leaves a flag on the week's strip. With ADHD mode off, finishing an item is unchanged.
//
// The running clock is mirrored to localStorage (this browser only), so a reload keeps it.
import { create } from "zustand";
import { scaleMinutes, sampleId, tookMinutes, plannedTook } from "@/lib/adhd/pace";
import { adhdOn, adhdPartOn } from "@/lib/adhd/prefs";
import { itemConcepts, newTicks, stepsFor, ticksOf, withTick } from "@/lib/adhd/steps";
import { localDate, nowIso } from "@/lib/time";
import type { PlanItem } from "@/lib/types";
import {
  recordActivity,
  startActivitySource,
  stopActivitySource,
  useActivityStore,
} from "./activityStore";
import { useConceptStateStore } from "./conceptStateStore";
import { findConcept } from "./customConceptStore";
import { paceFor, recordPace } from "./paceStore";
import { setPlanDoneListener, setPlanItemFinisher } from "./planDone";
import { setPlanItemDone, setPlanItemSteps, usePlanStore } from "./planStore";
import { useProfileStore } from "./profileStore";
import { toast } from "./toastStore";

const STORAGE_KEY = "atlas.nowClock";
const SOURCE = "now";
const TICK_MS = 5_000;
/** A longer gap between ticks (sleep, a closed tab) isn't counted. */
export const MAX_GAP_MS = 120_000;
/** "Start with 2 minutes". */
export const TRIAL_MS = 2 * 60_000;

export interface NowClock {
  /** The day and plan item the clock belongs to. */
  date: string;
  itemId: string;
  /** Minutes the item is planned for at the owner's pace: the disc's length. */
  plannedMinutes: number;
  /** Work counted so far. */
  workedMs: number;
  /** When counting last moved on (ms since epoch); null while paused. */
  lastAt: number | null;
  /** "Start with 2 minutes": counting to the 2-minute mark ("on"), then asking ("ask"). */
  trial?: "on" | "ask";
}

export interface FinishedNote {
  itemId: string;
  title: string;
  planned: number;
  took: number;
}

interface NowState {
  clock: NowClock | null;
  /** The item finished last with a measured time, for "Planned 15, took 22" on the card. */
  finished: FinishedNote | null;
}

export const useNowStore = create<NowState>(() => ({ clock: null, finished: null }));

const prefs = () => useProfileStore.getState().profile?.prefs;

/** Work on the clock up to `now` (the current run counts unless it's an uncounted gap). */
export function nowElapsedMs(clock: NowClock, now = Date.now()): number {
  if (clock.lastAt === null) return clock.workedMs;
  const gap = now - clock.lastAt;
  return clock.workedMs + (gap > 0 && gap <= MAX_GAP_MS ? gap : 0);
}

// ----- counting -------------------------------------------------------------------------------

let timer: ReturnType<typeof setInterval> | null = null;

function syncTimer(): void {
  const running = useNowStore.getState().clock?.lastAt != null;
  if (running && !timer) {
    timer = setInterval(() => tickNow(), TICK_MS);
    startActivitySource(SOURCE);
  } else if (!running && timer) {
    clearInterval(timer);
    timer = null;
    stopActivitySource(SOURCE);
  }
}

/** Moves the clock on to `now` and asks at the 2-minute mark. */
export function tickNow(now = Date.now()): void {
  const clock = useNowStore.getState().clock;
  if (!clock || clock.lastAt === null) return;
  const workedMs = nowElapsedMs(clock, now);
  const trial = clock.trial === "on" && workedMs >= TRIAL_MS ? "ask" : clock.trial;
  useNowStore.setState({ clock: { ...clock, workedMs, lastAt: now, trial } });
}

/** The disc's length for an item: its estimate, scaled by the pace when "time" is on. */
export function plannedFor(item: Pick<PlanItem, "kind" | "estMinutes">): number {
  return adhdPartOn(prefs(), "time")
    ? scaleMinutes(item.estMinutes, paceFor(item.kind))
    : item.estMinutes;
}

/**
 * Starts (or resumes) an item's clock. A different item's clock is replaced: one thing at a
 * time. With `trial`, it asks at the 2-minute mark.
 */
export function startNow(
  date: string,
  item: Pick<PlanItem, "id" | "kind" | "estMinutes">,
  options: { trial?: boolean; now?: number } = {},
): void {
  const now = options.now ?? Date.now();
  const current = useNowStore.getState().clock;
  const same = current && current.date === date && current.itemId === item.id;
  useNowStore.setState({
    clock: {
      date,
      itemId: item.id,
      plannedMinutes: same ? current.plannedMinutes : plannedFor(item),
      workedMs: same ? nowElapsedMs(current, now) : 0,
      lastAt: now,
      trial: options.trial ? "on" : undefined,
    },
  });
  syncTimer();
}

export function pauseNow(now = Date.now()): void {
  const clock = useNowStore.getState().clock;
  if (!clock || clock.lastAt === null) return;
  useNowStore.setState({
    clock: { ...clock, workedMs: nowElapsedMs(clock, now), lastAt: null },
  });
  syncTimer();
}

/** "Keep going": the 2-minute start becomes the whole item. */
export function keepGoing(): void {
  const clock = useNowStore.getState().clock;
  if (!clock) return;
  useNowStore.setState({ clock: { ...clock, trial: undefined } });
}

/** "Stop here": the clock pauses after the 2 minutes; the item stays for later. */
export function stopHere(now = Date.now()): void {
  const clock = useNowStore.getState().clock;
  if (!clock) return;
  useNowStore.setState({
    clock: { ...clock, workedMs: nowElapsedMs(clock, now), lastAt: null, trial: undefined },
  });
  syncTimer();
}

/** Forgets the clock (another day began, or the item left the plan). */
export function clearNow(): void {
  useNowStore.setState({ clock: null });
  syncTimer();
}

/** Takes the clock's work for an item that just finished (and clears the clock). */
function takeClock(date: string, itemId: string, now = Date.now()): number | null {
  const clock = useNowStore.getState().clock;
  if (!clock || clock.date !== date || clock.itemId !== itemId) return null;
  const worked = nowElapsedMs(clock, now);
  clearNow();
  return worked;
}

// ----- steps and ink --------------------------------------------------------------------------

const conceptName = (id: string) => findConcept(id)?.name ?? id;

export function itemSteps(item: Pick<PlanItem, "kind" | "refId" | "refIds">): string[] {
  return stepsFor(item, conceptName);
}

/** Drops ink on the day's route (F32 rewards) and plays the small sound if chosen. */
function dropInk(date: string, count: number): void {
  if (count <= 0 || !adhdPartOn(prefs(), "rewards")) return;
  recordActivity(date, { stepsDone: count });
  inkListener?.(count);
}

type InkListener = (count: number) => void;
let inkListener: InkListener | null = null;

/** The reward sound hooks in here (features/adhd/sound.ts), so stores stay free of audio. */
export function onInk(listener: InkListener | null): void {
  inkListener = listener;
}

/**
 * Ticks (or clears) one step of an item. Ticking the last step finishes the item. Each new tick
 * drops ink; clearing a tick never takes ink away.
 */
export function tickStep(date: string, itemId: string, index: number, on: boolean): void {
  const plan = usePlanStore.getState().plans[date];
  const item = plan?.items.find((i) => i.id === itemId);
  if (!item) return;
  const steps = itemSteps(item);
  if (index < 0 || index >= steps.length) return;
  const before = ticksOf(item, steps.length);
  const after = withTick(before, index, on);
  setPlanItemSteps(date, itemId, after);
  dropInk(date, newTicks(before, after));
  if (on && after.every(Boolean) && !item.done) setPlanItemDone(date, itemId, true);
}

/** Ticks the first step not ticked yet ("Done with this step"). */
export function tickNextStep(date: string, itemId: string): void {
  const item = usePlanStore.getState().plans[date]?.items.find((i) => i.id === itemId);
  if (!item) return;
  const steps = itemSteps(item);
  const ticks = ticksOf(item, steps.length);
  const next = ticks.findIndex((t) => !t);
  if (next === -1) {
    if (!item.done) setPlanItemDone(date, itemId, true);
    return;
  }
  tickStep(date, itemId, next, true);
}

/**
 * A flashcard round ticks a concept's step once that concept has a check today (its cards come
 * one at a time in the session; the round itself finishes when every concept is checked).
 */
export function tickCheckedCards(today = localDate()): void {
  if (!adhdPartOn(prefs(), "nowCard")) return;
  const plan = usePlanStore.getState().plans[today];
  if (!plan) return;
  const checks = useConceptStateStore.getState().checks;
  const checkedToday = (id: string) =>
    (checks[id] ?? []).some((c) => localDate(new Date(c.createdAt)) === today);
  for (const item of plan.items) {
    if (item.kind !== "review-concept" || item.done || item.skipped) continue;
    const ids = itemConcepts(item);
    if (ids.length < 2) continue;
    const before = ticksOf(item, ids.length);
    const after = ids.map((id, i) => before[i] || checkedToday(id));
    if (newTicks(before, after) === 0) continue;
    setPlanItemSteps(today, item.id, after);
    dropInk(today, newTicks(before, after));
  }
}

// ----- when an item turns done ------------------------------------------------------------------

setPlanItemFinisher((date, item, context) => {
  const p = prefs();
  const worked = takeClock(date, item.id);
  if (!adhdOn(p)) return item;
  const next: PlanItem = { ...item };
  // The steps are all done now; the ones not ticked yet drop their ink.
  if (adhdPartOn(p, "nowCard")) {
    const steps = itemSteps(item);
    if (steps.length > 0) {
      const before = ticksOf(item, steps.length);
      next.steps = steps.map(() => true);
      dropInk(date, newTicks(before, next.steps));
    } else {
      dropInk(date, 1);
    }
  } else {
    dropInk(date, 1);
  }
  // How long it took: the Now card's clock, else the minutes the caller knows (an attempt).
  const took =
    worked !== null && worked >= 30_000
      ? tookMinutes(worked)
      : context.took !== undefined && context.took > 0
        ? Math.max(1, Math.round(context.took))
        : undefined;
  if (took !== undefined && adhdPartOn(p, "time")) {
    next.took = took;
    recordPace(item.kind, {
      id: sampleId(date, item.id),
      planned: item.estMinutes,
      took,
      at: nowIso(),
    });
    useNowStore.setState({
      finished: { itemId: item.id, title: item.title, planned: item.estMinutes, took },
    });
    toast(`${plannedTook(item.estMinutes, took)}.`, { id: `took-${item.id}` });
  }
  return next;
});

// A finished day leaves a flag on the week's strip (once; never taken away).
setPlanDoneListener((date, items) => {
  if (!adhdPartOn(prefs(), "rewards")) return;
  const shown = items.filter((i) => !i.skipped);
  if (shown.length === 0 || !shown.every((i) => i.done)) return;
  const day = useActivityStore.getState().months[date.slice(0, 7)]?.days[date];
  if ((day?.planFinished ?? 0) > 0) return;
  recordActivity(date, { planFinished: 1 });
});

// ----- keeping the clock across a reload ----------------------------------------------------------

function save(): void {
  try {
    const clock = useNowStore.getState().clock;
    if (clock) localStorage.setItem(STORAGE_KEY, JSON.stringify(clock));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* only a convenience */
  }
}

let mirroring = false;

/**
 * Brings back the clock from before a reload, if it belongs to today. Time while the app was
 * closed isn't counted. Called once by the ADHD layer; from then on the clock is mirrored.
 */
export function restoreNowClock(now = Date.now()): void {
  if (!mirroring) {
    mirroring = true;
    useNowStore.subscribe((s, prev) => {
      if (s.clock !== prev.clock) save();
    });
  }
  let saved: NowClock | null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    saved = raw ? (JSON.parse(raw) as NowClock) : null;
  } catch {
    saved = null;
  }
  if (
    !saved ||
    typeof saved.itemId !== "string" ||
    typeof saved.workedMs !== "number" ||
    saved.date !== localDate(new Date(now))
  ) {
    if (saved) clearNow();
    return;
  }
  const lastAt =
    typeof saved.lastAt === "number"
      ? now - saved.lastAt <= MAX_GAP_MS
        ? saved.lastAt
        : now
      : null;
  useNowStore.setState({
    clock: {
      date: saved.date,
      itemId: saved.itemId,
      plannedMinutes: typeof saved.plannedMinutes === "number" ? saved.plannedMinutes : 15,
      workedMs: Math.max(0, saved.workedMs),
      lastAt,
      trial: saved.trial === "on" || saved.trial === "ask" ? saved.trial : undefined,
    },
  });
  syncTimer();
}

/** Stops counting (tests, and when the data is detached). */
export function resetNow(): void {
  useNowStore.setState({ clock: null, finished: null });
  syncTimer();
}

/** The Now item's clock for this item, re-rendering when it changes. */
export function useNowClock(date: string, itemId: string | undefined): NowClock | null {
  return useNowStore((s) =>
    s.clock && itemId && s.clock.date === date && s.clock.itemId === itemId ? s.clock : null,
  );
}

/** Today's ink: steps finished today (never taken away). */
export function useInkToday(date: string): number {
  return useActivityStore((s) => s.months[date.slice(0, 7)]?.days[date]?.stepsDone ?? 0);
}
