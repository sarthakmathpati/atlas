// Which theme shows (BUILD_SPEC.md 12.10.2): Day, Dusk or Night, chosen directly, from the device
// (System: light → Day, dark → Night) or by time of day from three local start times. Pure
// functions, shared by the app and mirrored by the pre-paint script in index.html (a test keeps
// the two in agreement).
import { DEFAULT_THEME_SCHEDULE } from "@/lib/constants";
import type { ThemeChoice, ThemeSchedule } from "@/lib/types";

export type ThemeName = "day" | "dusk" | "night";

export const THEME_NAMES: readonly ThemeName[] = ["day", "dusk", "night"];

export const THEME_LABEL: Record<ThemeName, string> = { day: "Day", dusk: "Dusk", night: "Night" };

const CHOICES: readonly ThemeChoice[] = ["system", "day", "dusk", "night", "schedule"];

/** Reads a stored choice, including the values from before Phase 9 (light → Day, dark → Night). */
export function normalizeThemeChoice(value: unknown): ThemeChoice {
  if (value === "light") return "day";
  if (value === "dark") return "night";
  return CHOICES.includes(value as ThemeChoice) ? (value as ThemeChoice) : "system";
}

/** Minutes after midnight for "HH:MM", or null when it isn't a valid time. */
export function parseClock(text: unknown): number | null {
  if (typeof text !== "string") return null;
  const m = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(text);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** A schedule with every missing or invalid start time replaced by its default. */
export function normalizeSchedule(value: unknown): ThemeSchedule {
  const v = (typeof value === "object" && value !== null ? value : {}) as Record<string, unknown>;
  const pick = (name: ThemeName) =>
    parseClock(v[name]) !== null ? (v[name] as string) : DEFAULT_THEME_SCHEDULE[name];
  return { day: pick("day"), dusk: pick("dusk"), night: pick("night") };
}

/** The schedule's start times in the order they happen through the day. */
function startsInOrder(schedule: ThemeSchedule): { name: ThemeName; minute: number }[] {
  const s = normalizeSchedule(schedule);
  return THEME_NAMES.map((name) => ({ name, minute: parseClock(s[name])! })).sort(
    (a, b) => a.minute - b.minute,
  );
}

/**
 * The theme a schedule shows at `now` (local time): the one that started most recently. Before
 * the day's first start, the last one of the previous evening is still showing.
 */
export function scheduledTheme(schedule: ThemeSchedule, now: Date): ThemeName {
  const starts = startsInOrder(schedule);
  const minute = now.getHours() * 60 + now.getMinutes();
  let current = starts[starts.length - 1]!.name;
  for (const s of starts) if (s.minute <= minute) current = s.name;
  return current;
}

/** When the schedule next switches themes after `now` (local time, today or tomorrow). */
export function nextThemeSwitch(schedule: ThemeSchedule, now: Date): Date {
  const starts = startsInOrder(schedule);
  const minute = now.getHours() * 60 + now.getMinutes();
  const later = starts.find((s) => s.minute > minute);
  const next = later ?? starts[0]!;
  const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + (later ? 0 : 1));
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Math.floor(next.minute / 60),
    next.minute % 60,
  );
}

/** The theme to show for a choice. */
export function resolveTheme(
  choice: ThemeChoice,
  context: { schedule: ThemeSchedule; now: Date; prefersDark: boolean },
): ThemeName {
  if (choice === "day" || choice === "dusk" || choice === "night") return choice;
  if (choice === "schedule") return scheduledTheme(context.schedule, context.now);
  return context.prefersDark ? "night" : "day";
}
