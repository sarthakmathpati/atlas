// The weekly review (F18): when it is due, which week it covers, and the week's numbers, rebuilt
// from the activity records (so past weeks are cheap to show again), plus the offline summary
// and focus suggestion used when Claude isn't.
//
// Weeks run Monday to Sunday (ISO). The review opens on the first visit after Sunday 18:00 local
// time and covers the week that ends that Sunday.
import { subjectById } from "@/data/syllabus";
import { isActiveDay, type DayLookup } from "@/lib/activity/streak";
import { problemInfo } from "@/lib/problems/catalog";
import { attemptDate } from "@/lib/problems/progress";
import type { ReadinessModel } from "@/lib/readiness/model";
import { subjectWeight } from "@/lib/readiness/score";
import { addDaysToDate, formatMinutes, localDate, parseLocalDate } from "@/lib/time";
import type {
  ActivityDay,
  ConceptState,
  Difficulty,
  MistakeTag,
  ProblemState,
  Track,
} from "@/lib/types";

export const REVIEW_HOUR = 18;

/** The most recent Sunday 18:00 local time at or before `now`. */
export function lastReviewMoment(now: Date): Date {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate(), REVIEW_HOUR, 0, 0, 0);
  const back = d.getDay(); // days since Sunday
  d.setDate(d.getDate() - back);
  if (d.getTime() > now.getTime()) d.setDate(d.getDate() - 7);
  return d;
}

/** Monday of the week the current review covers (the week ending at that Sunday). */
export function reviewWeek(now: Date): string {
  const sunday = lastReviewMoment(now);
  const pad = (n: number) => String(n).padStart(2, "0");
  const day = `${sunday.getFullYear()}-${pad(sunday.getMonth() + 1)}-${pad(sunday.getDate())}`;
  return addDaysToDate(day, -6);
}

/**
 * The review opens once after each Sunday 18:00: when the owner hasn't seen it since then, and
 * already had Atlas before then (a brand-new owner isn't shown an empty week).
 */
export function weeklyReviewDue(
  now: Date,
  profile: { weeklyReviewSeenAt?: string; createdAt: string },
): boolean {
  const moment = lastReviewMoment(now).getTime();
  const created = Date.parse(profile.createdAt);
  if (!Number.isFinite(created) || created >= moment) return false;
  const seen = profile.weeklyReviewSeenAt ? Date.parse(profile.weeklyReviewSeenAt) : NaN;
  return !Number.isFinite(seen) || seen < moment;
}

export interface DaySummary {
  date: string;
  minutes: number;
  active: boolean;
}

export interface WeekSummary {
  /** Monday. */
  week: string;
  /** Sunday. */
  end: string;
  days: DaySummary[];
  minutes: number;
  activeDays: number;
  solved: Record<Difficulty, number> & { total: number };
  /** Where the split by difficulty came from: the activity counters, or the attempts for days
   *  recorded before the counters existed. */
  solvedFrom: "activity" | "attempts" | "both";
  attempts: number;
  reviews: number;
  checks: number;
  conceptsTouched: number;
  planItemsDone: number;
  turnedStrong: number;
  turnedFading: number;
  /** Concepts whose strongSince falls in the week. */
  strongNames: { id: string; name: string }[];
  drills: { sessions: number; answers: number };
  mocks: number;
  topMistakes: { tagId: string; label: string; count: number }[];
}

export interface WeekSources {
  lookup: DayLookup;
  problemStates: Readonly<Record<string, ProblemState>>;
  conceptStates: Readonly<Record<string, ConceptState>>;
  tags: Readonly<Record<string, MistakeTag>>;
  conceptName: (id: string) => string | undefined;
}

const n = (v: number | undefined) => v ?? 0;

export function weekSummary(week: string, src: WeekSources): WeekSummary {
  const end = addDaysToDate(week, 6);
  const days: DaySummary[] = [];
  const s: WeekSummary = {
    week,
    end,
    days,
    minutes: 0,
    activeDays: 0,
    solved: { easy: 0, medium: 0, hard: 0, total: 0 },
    solvedFrom: "activity",
    attempts: 0,
    reviews: 0,
    checks: 0,
    conceptsTouched: 0,
    planItemsDone: 0,
    turnedStrong: 0,
    turnedFading: 0,
    strongNames: [],
    drills: { sessions: 0, answers: 0 },
    mocks: 0,
    topMistakes: [],
  };
  // Solves by difficulty from the attempts, per day, for days without the counters.
  const attemptSplit = new Map<string, Record<Difficulty, number>>();
  const mistakes = new Map<string, number>();
  for (const state of Object.values(src.problemStates)) {
    const info = problemInfo(state.problemId, state);
    for (const a of state.attempts) {
      const day = attemptDate(a);
      if (day < week || day > end) continue;
      for (const id of new Set(a.mistakeTagIds)) mistakes.set(id, (mistakes.get(id) ?? 0) + 1);
      if (!info || (a.result !== "solved_alone" && a.result !== "solved_with_hints")) continue;
      const split = attemptSplit.get(day) ?? { easy: 0, medium: 0, hard: 0 };
      split[info.difficulty]++;
      attemptSplit.set(day, split);
    }
  }
  let fromActivity = 0;
  let fromAttempts = 0;
  for (let i = 0; i < 7; i++) {
    const date = addDaysToDate(week, i);
    const d: ActivityDay | undefined = src.lookup(date);
    days.push({ date, minutes: n(d?.minutes), active: isActiveDay(d) });
    if (!d) continue;
    s.minutes += d.minutes;
    if (isActiveDay(d)) s.activeDays++;
    s.solved.total += d.problemsSolved;
    s.attempts += n(d.attempts);
    s.reviews += d.reviews;
    s.checks += n(d.checks);
    s.conceptsTouched += d.conceptsTouched;
    s.planItemsDone += n(d.planItemsDone);
    s.turnedStrong += n(d.turnedStrong);
    s.turnedFading += n(d.turnedFading);
    s.drills.sessions += n(d.drillSessions);
    s.drills.answers += n(d.drillAnswers);
    s.mocks += n(d.mocks);
    const counted = n(d.solvedEasy) + n(d.solvedMedium) + n(d.solvedHard);
    if (d.problemsSolved > 0 && counted === d.problemsSolved) {
      s.solved.easy += n(d.solvedEasy);
      s.solved.medium += n(d.solvedMedium);
      s.solved.hard += n(d.solvedHard);
      fromActivity++;
    } else if (d.problemsSolved > 0) {
      const split = attemptSplit.get(date) ?? { easy: 0, medium: 0, hard: 0 };
      s.solved.easy += split.easy;
      s.solved.medium += split.medium;
      s.solved.hard += split.hard;
      fromAttempts++;
    }
  }
  s.solvedFrom = fromAttempts === 0 ? "activity" : fromActivity === 0 ? "attempts" : "both";
  for (const state of Object.values(src.conceptStates)) {
    const at = state.strongSince;
    if (!at) continue;
    const day = localDate(new Date(at));
    if (day < week || day > end) continue;
    const name = src.conceptName(state.conceptId);
    if (name) s.strongNames.push({ id: state.conceptId, name });
  }
  s.strongNames.sort((a, b) => a.name.localeCompare(b.name));
  s.topMistakes = [...mistakes.entries()]
    .map(([tagId, count]) => ({ tagId, label: src.tags[tagId]?.label ?? tagId, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 3);
  return s;
}

/** Weeks with any activity before `week`, newest first (for "past weeks"). */
export function pastWeeks(lookup: DayLookup, week: string, count: number): string[] {
  const out: string[] = [];
  for (let i = 1; i <= count; i++) out.push(addDaysToDate(week, -7 * i));
  return out.filter((w) =>
    Array.from({ length: 7 }, (_, d) => lookup(addDaysToDate(w, d))).some(Boolean),
  );
}

/** Up to 3 subjects to focus on next week without Claude: the most to gain (weight × distance
 *  from ready, section 11.3) among subjects in the track, fading ones first. */
export function suggestFocus(model: ReadinessModel, track: Track): string[] {
  return model.subjects
    .filter((s) => subjectWeight(s.subjectId, track) > 0)
    .map((s) => ({
      id: s.subjectId,
      gain: subjectWeight(s.subjectId, track) * (1 - s.readiness / 100),
      fading: s.counts.fading,
    }))
    .sort((a, b) => Number(b.fading > 0) - Number(a.fading > 0) || b.gain - a.gain)
    .slice(0, 3)
    .map((s) => s.id);
}

const subjectName = (id: string) => subjectById.get(id)?.name ?? id;

function list(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

export const dayName = (date: string) =>
  parseLocalDate(date).toLocaleDateString(undefined, { weekday: "long" });

/** A kind, specific summary of the week in plain Markdown, written without Claude. */
export function offlineReflection(s: WeekSummary, focus: string[]): string {
  const lines: string[] = [];
  if (s.activeDays === 0) {
    lines.push(
      "A quiet week, and that's fine. One short session is enough to get going again: the minimum day on Today plans one small thing.",
    );
  } else {
    const best = [...s.days].sort((a, b) => b.minutes - a.minutes)[0]!;
    lines.push(
      `You studied on ${s.activeDays} of 7 days for ${formatMinutes(s.minutes)} in all, most on ${dayName(best.date)} (${formatMinutes(best.minutes)}).`,
    );
    const parts: string[] = [];
    if (s.solved.total)
      parts.push(`solved ${s.solved.total} ${s.solved.total === 1 ? "problem" : "problems"}`);
    if (s.turnedStrong)
      parts.push(`made ${s.turnedStrong} ${s.turnedStrong === 1 ? "concept" : "concepts"} strong`);
    if (s.drills.answers) parts.push(`answered ${s.drills.answers} drill prompts`);
    if (parts.length) lines.push(`You ${list(parts)}.`);
    if (s.solved.total && s.solved.hard === 0 && s.solved.medium > 0)
      lines.push("No hard problems yet this week; one hard problem next week stretches you most.");
    if (s.turnedFading)
      lines.push(
        `${s.turnedFading} ${s.turnedFading === 1 ? "concept started" : "concepts started"} to fade. A short flashcard round brings ${s.turnedFading === 1 ? "it" : "them"} back.`,
      );
    if (s.topMistakes[0])
      lines.push(
        `Your most frequent mistake was "${s.topMistakes[0].label}" (${s.topMistakes[0].count} ${s.topMistakes[0].count === 1 ? "time" : "times"}); its line on the pre-interview checklist is worth a look.`,
      );
  }
  if (focus.length)
    lines.push(`For next week, ${list(focus.map(subjectName))} would move your readiness most.`);
  return lines.join(" ");
}

/** The week's numbers in plain text, the input for Claude's reflection (prompt 14). */
export function weekSummaryText(
  s: WeekSummary,
  model: ReadinessModel,
  focus: readonly string[],
): string {
  const readiness = model.subjects
    .filter((x) => x.weight > 0)
    .sort((a, b) => a.readiness - b.readiness)
    .map((x) => `${subjectName(x.subjectId)} (${x.subjectId}) ${Math.round(x.readiness)}`)
    .join(", ");
  return [
    `## The learner's week (${s.week} to ${s.end})`,
    `Minutes studied: ${s.minutes}, on ${s.activeDays} of 7 days (${s.days.map((d) => d.minutes).join(", ")} by day, Monday first).`,
    `Problems solved: ${s.solved.total} (${s.solved.easy} easy, ${s.solved.medium} medium, ${s.solved.hard} hard), in ${s.attempts} attempts.`,
    `Concepts that turned strong: ${s.turnedStrong}${
      s.strongNames.length
        ? ` (${s.strongNames
            .slice(0, 8)
            .map((c) => c.name)
            .join(", ")})`
        : ""
    }.`,
    `Concepts that started to fade: ${s.turnedFading}.`,
    `Reviews done: ${s.reviews}. Checks (flashcards, quizzes, explain it back): ${s.checks}.`,
    `Pattern drills: ${s.drills.sessions} sessions, ${s.drills.answers} prompts.`,
    `Top mistakes: ${s.topMistakes.length ? s.topMistakes.map((m) => `${m.label} (${m.count})`).join(", ") : "none tagged"}.`,
    `Overall readiness: ${Math.round(model.overall)} of 100. Subject readiness, weakest first: ${readiness}.`,
    `Focus subjects this week: ${focus.length ? focus.map(subjectName).join(", ") : "none set"}.`,
  ].join("\n");
}
