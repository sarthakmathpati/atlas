// Activity (F29): minutes per local day, stored as ActivityMonth records (section 4.2).
//
// The activity clock counts time while at least one source runs (the focus timer now, attempt
// timers from Phase 3). Several sources running at once count once, so overlapping time is never
// double-counted. Time is measured from timestamps; a gap longer than two minutes between ticks
// (the laptop slept) is not counted.
import { create } from "zustand";
import type { Repository } from "@/lib/storage/Repository";
import { localDate, nowIso } from "@/lib/time";
import type { ActivityDay, ActivityMonth } from "@/lib/types";

interface ActivityState {
  months: Record<string, ActivityMonth>;
  loaded: boolean;
}

export const useActivityStore = create<ActivityState>(() => ({ months: {}, loaded: false }));

let repo: Repository | null = null;

export async function hydrateActivity(repository: Repository): Promise<void> {
  repo = repository;
  const list = await repository.activity.list();
  const months: Record<string, ActivityMonth> = {};
  for (const m of list) months[m.month] = m;
  useActivityStore.setState({ months, loaded: true });
}

export function detachActivity(): void {
  repo = null;
  stopAllSources();
  useActivityStore.setState({ months: {}, loaded: false });
}

const EMPTY_DAY: ActivityDay = { minutes: 0, problemsSolved: 0, reviews: 0, conceptsTouched: 0 };

/** Adds to one day's counters (minutes, attempts, …) and saves the month. */
export function recordActivity(
  date: string,
  changes: Partial<Record<keyof ActivityDay, number>>,
): void {
  const monthKey = date.slice(0, 7);
  const { months } = useActivityStore.getState();
  const month: ActivityMonth = months[monthKey] ?? {
    month: monthKey,
    days: {},
    updatedAt: nowIso(),
  };
  const day: ActivityDay = { ...EMPTY_DAY, ...month.days[date] };
  for (const [key, amount] of Object.entries(changes) as [keyof ActivityDay, number][]) {
    day[key] = (day[key] ?? 0) + amount;
  }
  const next: ActivityMonth = {
    ...month,
    days: { ...month.days, [date]: day },
    updatedAt: nowIso(),
  };
  useActivityStore.setState({ months: { ...months, [monthKey]: next } });
  repo?.activity.put(next).catch(() => undefined);
}

// ----- the activity clock ---------------------------------------------------------------------

const MAX_TICK_GAP_MS = 120_000;
const sources = new Set<string>();
let timer: ReturnType<typeof setInterval> | null = null;
let lastTick = 0;
/** Seconds counted but not yet saved as whole minutes, per local date. */
const pending = new Map<string, number>();

function tick(): void {
  const now = Date.now();
  const gap = now - lastTick;
  lastTick = now;
  if (gap <= 0 || gap > MAX_TICK_GAP_MS) return;
  const date = localDate(new Date(now));
  const seconds = (pending.get(date) ?? 0) + gap / 1000;
  const minutes = Math.floor(seconds / 60);
  pending.set(date, seconds - minutes * 60);
  if (minutes > 0) recordActivity(date, { minutes });
}

/** Starts counting time for `source` (for example "focus" or "attempt:lc-1"). */
export function startActivitySource(source: string): void {
  sources.add(source);
  if (timer) return;
  lastTick = Date.now();
  timer = setInterval(tick, 1000);
}

export function stopActivitySource(source: string): void {
  if (!sources.delete(source) || sources.size > 0 || !timer) return;
  tick();
  clearInterval(timer);
  timer = null;
}

function stopAllSources(): void {
  sources.clear();
  if (timer) clearInterval(timer);
  timer = null;
}

/** Today's minutes, read from the store (re-renders when they change). */
export function useMinutesOn(date: string): number {
  return useActivityStore((s) => s.months[date.slice(0, 7)]?.days[date]?.minutes ?? 0);
}
