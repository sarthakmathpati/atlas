// The activity heatmap (F29, section 11.7): one cell per local day, in columns of ISO weeks
// (Monday at the top), colored by minutes: 0, 1 to 29, 30 to 59, 60 to 119, 120 or more.
// Days the weekly streak freeze covered are marked, from the same computation as the streak, so
// the heatmap and the streak always agree.
import { HEATMAP_LEVELS } from "@/lib/constants";
import { addDaysToDate, parseLocalDate } from "@/lib/time";
import { isActiveDay, type DayLookup } from "./streak";

export type HeatLevel = 0 | 1 | 2 | 3 | 4;

/** 0 for no minutes, then one level per threshold in HEATMAP_LEVELS (1, 30, 60, 120). */
export function heatLevel(minutes: number): HeatLevel {
  let level = 0;
  for (const t of HEATMAP_LEVELS) if (minutes >= t) level++;
  return level as HeatLevel;
}

export interface HeatCell {
  date: string;
  minutes: number;
  level: HeatLevel;
  /** Active by section 11.7 (10 minutes, or any attempt, check, review or plan item). */
  active: boolean;
  /** A missed day the weekly freeze covered. */
  frozen: boolean;
  /** After today (the rest of the current week). */
  future: boolean;
}

/** Monday of the ISO week containing `date`. */
export function weekStart(date: string): string {
  const day = parseLocalDate(date).getDay(); // 0 = Sunday
  return addDaysToDate(date, -((day + 6) % 7));
}

/**
 * `weeks` columns of 7 cells ending with the week that contains `today`. The first column
 * starts on a Monday; cells after today are marked `future`.
 */
export function heatmapWeeks(
  lookup: DayLookup,
  today: string,
  weeks: number,
  frozen: ReadonlySet<string> = new Set(),
): HeatCell[][] {
  const first = addDaysToDate(weekStart(today), -7 * (weeks - 1));
  const columns: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const column: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDaysToDate(first, w * 7 + d);
      const day = lookup(date);
      const minutes = day?.minutes ?? 0;
      column.push({
        date,
        minutes,
        level: heatLevel(minutes),
        active: isActiveDay(day),
        frozen: frozen.has(date),
        future: date > today,
      });
    }
    columns.push(column);
  }
  return columns;
}

export interface HeatSummary {
  /** Days in the range up to today. */
  days: number;
  activeDays: number;
  minutes: number;
  /** Days per level (0 to 4). */
  levels: [number, number, number, number, number];
}

export function summarize(columns: readonly HeatCell[][]): HeatSummary {
  const s: HeatSummary = { days: 0, activeDays: 0, minutes: 0, levels: [0, 0, 0, 0, 0] };
  for (const col of columns) {
    for (const c of col) {
      if (c.future) continue;
      s.days++;
      if (c.active) s.activeDays++;
      s.minutes += c.minutes;
      s.levels[c.level]++;
    }
  }
  return s;
}
