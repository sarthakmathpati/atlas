// Mistake journal numbers (F8): how often each tag shows up in a time window, the trend against
// the window before, breakdowns by category and by pattern, the top-5 checklist, and merging.
import { conceptById } from "@/data/syllabus";
import { addDaysToDate, localDate } from "@/lib/time";
import type { AttemptResult, MistakeCategory, MistakeTag, ProblemState } from "@/lib/types";
import { problemInfo } from "../problems/catalog";

export type MistakeWindow = 30 | 90 | "all";

export interface TaggedAttempt {
  tagId: string;
  problemId: string;
  attemptId: string;
  /** Local date of the attempt. */
  date: string;
  result?: AttemptResult;
  language: string;
  conceptIds: string[];
}

/** Every (tag, attempt) pair, newest first. */
export function taggedAttempts(states: Readonly<Record<string, ProblemState>>): TaggedAttempt[] {
  const out: TaggedAttempt[] = [];
  for (const s of Object.values(states)) {
    const conceptIds = problemInfo(s.problemId, s)?.conceptIds ?? [];
    for (const a of s.attempts) {
      const date = localDate(new Date(a.finishedAt ?? a.startedAt));
      for (const tagId of new Set(a.mistakeTagIds)) {
        out.push({
          tagId,
          problemId: s.problemId,
          attemptId: a.id,
          date,
          result: a.result,
          language: a.language,
          conceptIds,
        });
      }
    }
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

function inRange(date: string, from: string | null, to: string): boolean {
  return date <= to && (from === null || date >= from);
}

export interface TagCount {
  tag: MistakeTag;
  count: number;
  /** Count in the window before, for the trend arrow (null for "all time" without history). */
  previous: number;
  trend: "up" | "down" | "flat";
}

/**
 * Tag counts in the window ending today, most frequent first. The trend compares with the
 * window of the same length just before (for "all time": the last 30 days against the 30 before).
 */
export function tagCounts(
  items: readonly TaggedAttempt[],
  tags: readonly MistakeTag[],
  window: MistakeWindow,
  today: string,
): TagCount[] {
  const days = window === "all" ? 30 : window;
  const from = window === "all" ? null : addDaysToDate(today, -(days - 1));
  const trendFrom = addDaysToDate(today, -(days - 1));
  const prevTo = addDaysToDate(today, -days);
  const prevFrom = addDaysToDate(today, -(2 * days - 1));
  const byId = new Map(tags.map((t) => [t.id, t]));
  const counts = new Map<string, { count: number; recent: number; previous: number }>();
  for (const it of items) {
    if (!byId.has(it.tagId)) continue;
    const c = counts.get(it.tagId) ?? { count: 0, recent: 0, previous: 0 };
    if (inRange(it.date, from, today)) c.count++;
    if (inRange(it.date, trendFrom, today)) c.recent++;
    if (inRange(it.date, prevFrom, prevTo)) c.previous++;
    counts.set(it.tagId, c);
  }
  return [...counts.entries()]
    .filter(([, c]) => c.count > 0)
    .map(([id, c]) => ({
      tag: byId.get(id)!,
      count: c.count,
      previous: c.previous,
      trend: (c.recent > c.previous ? "up" : c.recent < c.previous ? "down" : "flat") as
        "up" | "down" | "flat",
    }))
    .sort((a, b) => b.count - a.count || a.tag.label.localeCompare(b.tag.label));
}

/** Counts per category in the window. */
export function categoryCounts(counts: readonly TagCount[]): Map<MistakeCategory, number> {
  const out = new Map<MistakeCategory, number>();
  for (const c of counts) out.set(c.tag.category, (out.get(c.tag.category) ?? 0) + c.count);
  return out;
}

/** For one tag, the pattern (concept) it shows up with most, and how often, in the window. */
export function topPatternFor(
  items: readonly TaggedAttempt[],
  tagId: string,
  window: MistakeWindow,
  today: string,
): { conceptId: string; count: number; total: number } | null {
  const from = window === "all" ? null : addDaysToDate(today, -(window - 1));
  const counts = new Map<string, number>();
  let total = 0;
  for (const it of items) {
    if (it.tagId !== tagId || !inRange(it.date, from, today)) continue;
    total++;
    for (const c of it.conceptIds) if (conceptById.has(c)) counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  const best = [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  return best ? { conceptId: best[0], count: best[1], total } : null;
}

/**
 * The pre-interview checklist: the 5 most frequent tags of the last 90 days, topped up from all
 * time when fewer than 5 appear there. Archived tags are left out.
 */
export function checklistTags(
  items: readonly TaggedAttempt[],
  tags: readonly MistakeTag[],
  today: string,
  size = 5,
): TagCount[] {
  const live = tags.filter((t) => !t.archived);
  const recent = tagCounts(items, live, 90, today);
  if (recent.length >= size) return recent.slice(0, size);
  const seen = new Set(recent.map((c) => c.tag.id));
  const rest = tagCounts(items, live, "all", today).filter((c) => !seen.has(c.tag.id));
  return [...recent, ...rest].slice(0, size);
}

/**
 * Re-tags every attempt that has `fromId` with `intoId` (no duplicates). Returns only the problem
 * states that changed, with a fresh updatedAt.
 */
export function mergeTagInStates(
  states: Readonly<Record<string, ProblemState>>,
  fromId: string,
  intoId: string,
  stamp: string,
): { changed: ProblemState[]; attempts: number } {
  const changed: ProblemState[] = [];
  let attempts = 0;
  for (const s of Object.values(states)) {
    let touched = false;
    const next = s.attempts.map((a) => {
      if (!a.mistakeTagIds.includes(fromId)) return a;
      touched = true;
      attempts++;
      const ids = a.mistakeTagIds.map((id) => (id === fromId ? intoId : id));
      return { ...a, mistakeTagIds: [...new Set(ids)] };
    });
    if (touched) changed.push({ ...s, attempts: next, updatedAt: stamp });
  }
  return { changed, attempts };
}

/** How many attempts carry each tag, over all time (for Manage tags). */
export function usageByTag(states: Readonly<Record<string, ProblemState>>): Map<string, number> {
  const out = new Map<string, number>();
  for (const s of Object.values(states))
    for (const a of s.attempts)
      for (const id of new Set(a.mistakeTagIds)) out.set(id, (out.get(id) ?? 0) + 1);
  return out;
}

export const CATEGORY_LABEL: Record<MistakeCategory, string> = {
  "edge-case": "Edge cases",
  logic: "Logic",
  complexity: "Complexity",
  pattern: "Choosing the pattern",
  language: "Language",
  reading: "Reading the problem",
  other: "Other",
};

export const CATEGORY_ORDER: MistakeCategory[] = [
  "edge-case",
  "logic",
  "complexity",
  "pattern",
  "language",
  "reading",
  "other",
];

/** A readable id for a new tag: "mt-" plus a slug of the label, unique among `taken`. */
export function newTagId(label: string, taken: ReadonlySet<string>): string {
  const slug =
    label
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "tag";
  let id = `mt-${slug}`;
  for (let n = 2; taken.has(id); n++) id = `mt-${slug}-${n}`;
  return id;
}
