// Park it (F31): a stray thought is written down with a when, and comes back then.
//   At the break  when the running focus block ends (or after one block's length without one)
//   Tonight       at the Dusk start time (By time of day), else 19:00; an hour from now if later
//   Tomorrow      the next morning: the Day start time (By time of day), else 06:30
// Pure functions; the store (stores/parkStore.ts) saves the thoughts.
import { DEFAULT_THEME_SCHEDULE } from "@/lib/constants";
import { parseClock } from "@/lib/theme";
import { localDate } from "@/lib/time";
import type { ParkedThought, ThemeChoice, ThemeSchedule } from "@/lib/types";

export type ParkWhen = ParkedThought["when"];

export const PARK_WHENS: readonly ParkWhen[] = ["break", "tonight", "tomorrow"];

export const PARK_WHEN_LABEL: Record<ParkWhen, string> = {
  break: "At the break",
  tonight: "Tonight",
  tomorrow: "Tomorrow",
};

/** What a thought's return looks like in a sentence: "Parked for the break". */
export const PARKED_FOR: Record<ParkWhen, string> = {
  break: "for the break",
  tonight: "for tonight",
  tomorrow: "for tomorrow",
};

export const MAX_THOUGHT_LENGTH = 500;

/** The evening time "Tonight" means: the Dusk start with By time of day, otherwise 19:00. */
export function tonightTime(theme: ThemeChoice, schedule: ThemeSchedule): string {
  return theme === "schedule" ? schedule.dusk : DEFAULT_THEME_SCHEDULE.dusk;
}

/** The morning time "Tomorrow" means: the Day start with By time of day, otherwise 06:30. */
export function morningTime(theme: ThemeChoice, schedule: ThemeSchedule): string {
  return theme === "schedule" ? schedule.day : DEFAULT_THEME_SCHEDULE.day;
}

function atClock(day: Date, clock: string): Date {
  const minute = parseClock(clock) ?? 0;
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Math.floor(minute / 60),
    minute % 60,
  );
}

export interface ParkContext {
  now: Date;
  /** When the running focus block ends (ms since epoch), if one runs. */
  blockEndsAt?: number | null;
  /** The focus block length, for "At the break" when no block runs. */
  focusMinutes: number;
  tonight: string;
  morning: string;
}

/** When a thought parked now comes back. */
export function parkDueAt(when: ParkWhen, ctx: ParkContext): Date {
  const { now } = ctx;
  if (when === "break") {
    if (ctx.blockEndsAt && ctx.blockEndsAt > now.getTime()) return new Date(ctx.blockEndsAt);
    return new Date(now.getTime() + ctx.focusMinutes * 60_000);
  }
  if (when === "tonight") {
    const evening = atClock(now, ctx.tonight);
    return evening.getTime() > now.getTime() ? evening : new Date(now.getTime() + 60 * 60_000);
  }
  const morning = atClock(now, ctx.morning);
  if (morning.getTime() > now.getTime()) return morning;
  return atClock(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), ctx.morning);
}

const byDueAt = (a: ParkedThought, b: ParkedThought) =>
  a.dueAt < b.dueAt ? -1 : a.dueAt > b.dueAt ? 1 : a.createdAt < b.createdAt ? -1 : 1;

/** Open thoughts whose time has come, oldest first. */
export function thoughtsBack(thoughts: readonly ParkedThought[], now: Date): ParkedThought[] {
  const t = now.toISOString();
  return thoughts.filter((x) => !x.doneAt && x.dueAt <= t).sort(byDueAt);
}

/** Open thoughts parked for the break (the break view lists them), oldest first. */
export function breakThoughts(thoughts: readonly ParkedThought[]): ParkedThought[] {
  return thoughts.filter((x) => !x.doneAt && x.when === "break").sort(byDueAt);
}

/** Open thoughts still waiting for their time. */
export function thoughtsWaiting(thoughts: readonly ParkedThought[], now: Date): ParkedThought[] {
  const t = now.toISOString();
  return thoughts.filter((x) => !x.doneAt && x.dueAt > t).sort(byDueAt);
}

/** Open thoughts parked for tonight (the wrap-up note turns them into tomorrow's items). */
export function tonightThoughts(thoughts: readonly ParkedThought[]): ParkedThought[] {
  return thoughts.filter((x) => !x.doneAt && x.when === "tonight").sort(byDueAt);
}

/**
 * The day that starts after the owner's next sleep: tomorrow in the evening, but today when a
 * late bedtime has already passed midnight (half a day ahead lands on it either way).
 */
export function dayAfterSleep(now: Date): string {
  return localDate(new Date(now.getTime() + 12 * 60 * 60_000));
}
