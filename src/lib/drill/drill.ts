// Pattern drill (F10) and its statistics (BUILD_SPEC.md 11.6), as pure functions.
//   - The bank: the seed prompts plus the ones Claude generated and the owner kept, or prompts
//     made from the owner's solved problems (title, summary and notes: a recall test).
//   - A session picks 3 to 10 prompts, unseen ones first, optionally the weakest patterns first.
//   - Judging: a picked pattern that is one of the answers is correct; a pattern from the same
//     topic as an answer is partial; anything else is wrong.
//   - Accuracy per pattern over the last 60 days, and confusion pairs (picked X when it was Y,
//     at least twice), top 5.
import { hashSeed, mulberry32 } from "@/lib/random";
import { addDaysToDate, localDate } from "@/lib/time";
import type { Check, DrillPrompt, ProblemState } from "@/lib/types";

export { hashSeed };

export const DRILL_MIN = 3;
export const DRILL_MAX = 10;
export const DRILL_SECONDS = 120;
export const STATS_DAYS = 60;

export type DrillResult = "correct" | "partial" | "wrong";

export const DRILL_SCORE: Record<DrillResult, number> = { correct: 1, partial: 0.5, wrong: 0 };

/** What a drill check stores in `detail` (11.6). */
export interface DrillDetail {
  promptId: string;
  correctConceptIds: string[];
  pickedConceptIds: string[];
  correct: boolean;
  result: DrillResult;
  approach?: string;
  source: "bank" | "solved";
}

export interface DrillItem extends DrillPrompt {
  source: "bank" | "solved";
  /** The problem a "My solved problems" prompt came from. */
  problemId?: string;
}

/** Prompts from solved problems with patterns: the title plus the owner's own summary or notes. */
export function solvedProblemPrompts(
  states: Readonly<Record<string, ProblemState>>,
  info: (
    id: string,
    state: ProblemState,
  ) => { title: string; conceptIds: string[]; difficulty: DrillPrompt["difficulty"] } | undefined,
): DrillItem[] {
  const out: DrillItem[] = [];
  for (const s of Object.values(states)) {
    if (s.status !== "solved") continue;
    const p = info(s.problemId, s);
    if (!p || p.conceptIds.length === 0) continue;
    const own = s.summary?.trim() || s.myNotes?.trim().split("\n")[0]?.trim();
    out.push({
      id: `solved-${s.problemId}`,
      text: own ? `${p.title}. ${own}` : `${p.title}. Which pattern did you use to solve it?`,
      answerConceptIds: p.conceptIds.slice(0, 2),
      keyInsight:
        s.insight?.trim() || "Write an insight for this problem to see it here next time.",
      difficulty: p.difficulty,
      source: "solved",
      problemId: s.problemId,
    });
  }
  return out;
}

export interface PickOptions {
  count: number;
  /** Prompt ids answered recently (newest first): they go last. */
  recent: ReadonlySet<string>;
  /** Accuracy per pattern (0..1); untried patterns count as 0.5. Used when focusWeak is on. */
  accuracy?: ReadonlyMap<string, number>;
  focusWeak?: boolean;
  seed: number;
}

/** Picks a session: unseen prompts first, weakest patterns first when asked, shuffled otherwise. */
export function pickSession(bank: readonly DrillItem[], opts: PickOptions): DrillItem[] {
  const rand = mulberry32(opts.seed);
  const count = Math.max(DRILL_MIN, Math.min(DRILL_MAX, opts.count));
  const scored = bank.map((p) => {
    const main = p.answerConceptIds[0] ?? "";
    const acc = opts.accuracy?.get(main) ?? 0.5;
    return {
      p,
      seen: opts.recent.has(p.id) ? 1 : 0,
      weak: opts.focusWeak ? acc : 0,
      r: rand(),
    };
  });
  scored.sort((a, b) => a.seen - b.seen || a.weak - b.weak || a.r - b.r);
  // Avoid two prompts for the same pattern when there is enough choice.
  const out: DrillItem[] = [];
  const used = new Set<string>();
  for (const s of scored) {
    if (out.length >= count) break;
    const main = s.p.answerConceptIds[0] ?? s.p.id;
    if (used.has(main)) continue;
    used.add(main);
    out.push(s.p);
  }
  for (const s of scored) {
    if (out.length >= count) break;
    if (!out.includes(s.p)) out.push(s.p);
  }
  return out;
}

/** Correct, partial (same topic as an answer) or wrong. */
export function judge(
  picked: readonly string[],
  correct: readonly string[],
  topicOf: (conceptId: string) => string | undefined,
): DrillResult {
  if (picked.length === 0) return "wrong";
  if (picked.some((id) => correct.includes(id))) return "correct";
  const topics = new Set(correct.map(topicOf).filter(Boolean));
  if (picked.some((id) => topics.has(topicOf(id)))) return "partial";
  return "wrong";
}

function drillDetails(checks: readonly Check[], since: string): DrillDetail[] {
  return checks
    .filter((c) => c.kind === "drill" && localDate(new Date(c.createdAt)) >= since)
    .map((c) => c.detail as DrillDetail | undefined)
    .filter((d): d is DrillDetail => Boolean(d?.correctConceptIds && d.pickedConceptIds));
}

export interface PatternAccuracy {
  conceptId: string;
  correct: number;
  total: number;
  accuracy: number;
}

/** Accuracy per pattern (by the prompt's main answer) over the last 60 days, weakest first. */
export function patternAccuracy(
  checks: readonly Check[],
  today: string,
  days = STATS_DAYS,
): PatternAccuracy[] {
  const since = addDaysToDate(today, -(days - 1));
  const map = new Map<string, { correct: number; total: number }>();
  for (const d of drillDetails(checks, since)) {
    const main = d.correctConceptIds[0];
    if (!main) continue;
    const e = map.get(main) ?? { correct: 0, total: 0 };
    e.total += 1;
    if (d.correct) e.correct += 1;
    map.set(main, e);
  }
  return [...map.entries()]
    .map(([conceptId, e]) => ({ conceptId, ...e, accuracy: e.correct / e.total }))
    .sort(
      (a, b) =>
        a.accuracy - b.accuracy || b.total - a.total || a.conceptId.localeCompare(b.conceptId),
    );
}

export interface ConfusionPair {
  picked: string;
  correct: string;
  count: number;
}

/** Picked X when the answer was Y (X not an answer), at least twice; the top 5. */
export function confusionPairs(
  checks: readonly Check[],
  today: string,
  days = STATS_DAYS,
  limit = 5,
): ConfusionPair[] {
  const since = addDaysToDate(today, -(days - 1));
  const counts = new Map<string, ConfusionPair>();
  for (const d of drillDetails(checks, since)) {
    const main = d.correctConceptIds[0];
    if (!main || d.correct) continue;
    for (const picked of d.pickedConceptIds) {
      if (d.correctConceptIds.includes(picked)) continue;
      const key = `${picked}>${main}`;
      const e = counts.get(key) ?? { picked, correct: main, count: 0 };
      e.count += 1;
      counts.set(key, e);
    }
  }
  return [...counts.values()]
    .filter((p) => p.count >= 2)
    .sort((a, b) => b.count - a.count || a.picked.localeCompare(b.picked))
    .slice(0, limit);
}

/** The patterns to generate new prompts for: lowest accuracy first, then untried ones. */
export function weakestPatterns(
  accuracy: readonly PatternAccuracy[],
  candidates: readonly string[],
  count = 3,
): string[] {
  const tried = accuracy.filter((a) => a.accuracy < 1).map((a) => a.conceptId);
  const seen = new Set(accuracy.map((a) => a.conceptId));
  const untried = candidates.filter((id) => !seen.has(id));
  return [...new Set([...tried, ...untried])].slice(0, count);
}

/** Keeps generated prompts whose answer ids are all known patterns; drops the rest. */
export function validGeneratedPrompts<T extends { answerConceptIds: string[]; text: string }>(
  prompts: readonly T[],
  patternIds: ReadonlySet<string>,
): T[] {
  return prompts.filter(
    (p) =>
      p.text.trim().length > 20 &&
      p.answerConceptIds.length > 0 &&
      p.answerConceptIds.every((id) => patternIds.has(id)),
  );
}
