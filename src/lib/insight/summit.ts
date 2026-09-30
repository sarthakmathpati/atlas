// The summit profile (BUILD_SPEC.md 12.10.7): readiness per week as a hiking elevation profile,
// from the first week with data to the interview (the summit flag), with a dashed trail for the
// projection. A past week's readiness is the readiness model (11.3) evaluated on the records as
// they were at that week's Sunday 23:59:
//   - checks and attempts recorded by then;
//   - a schedule with nothing recorded after the cutoff is the stored one (exact); otherwise a
//     problem's schedule is replayed from its attempts up to then (the scheduler a CSV import
//     uses) and a concept's from its checks up to then (each as a plain check, since whether a
//     check came from a review session isn't stored);
//   - "studied" and a manual status count from the concept's first activity (a manual "strong"
//     from its manual check); "ever strong" from `strongSince`.
// So the profile's point for today equals the live readiness.
// Pure over plain data; the dashboard computes the weeks after first paint and caches them.
import { conceptById } from "@/data/syllabus";
import { problemInfo } from "@/lib/problems/catalog";
import { attemptDate } from "@/lib/problems/progress";
import { evaluateReadiness, type EvaluationSources } from "@/lib/readiness/evaluate";
import type { ReadinessModel } from "@/lib/readiness/model";
import { applyConceptReview, startConceptReview } from "@/lib/srs/concept";
import { replaySchedule } from "@/lib/srs/problem";
import { addDaysToDate, daysBetween, localDate, nowIso } from "@/lib/time";
import type { Attempt, Check, ConceptState, ProblemState, SrsState } from "@/lib/types";
import { weekStart } from "../activity/heatmap";
import { PACE_DAYS, PROJECTION_SPREAD } from "./dashboard";

/** Weeks the profile can show at most (the most recent ones). */
export const SUMMIT_MAX_WEEKS = 104;

/** The moment a day ends for the profile: 23:59 local time. */
export function endOfDay(day: string): Date {
  return new Date(`${day}T23:59:00`);
}

const attemptAt = (a: Attempt) => a.finishedAt ?? a.startedAt;

/** The problem as it stood at `cutoff`, or null when it had no attempts yet. */
function problemAsOf(
  state: ProblemState,
  cutoff: string,
  intensity: EvaluationSources["intensity"],
): ProblemState | null {
  const attempts = state.attempts.filter((a) => attemptAt(a) <= cutoff);
  if (attempts.length === 0) return null;
  if (attempts.length === state.attempts.length) return state;
  const info = problemInfo(state.problemId, state);
  const { srs, status } = replaySchedule(
    attempts.map((a) => ({ result: a.result, date: attemptDate(a), reviewedAt: attemptAt(a) })),
    info?.difficulty ?? "medium",
    intensity,
  );
  return { ...state, attempts, srs, status, inReview: state.inReview };
}

/** The concept's state as it stood at `cutoff`, given its checks up to then (oldest first). */
function conceptAsOf(
  state: ConceptState,
  checks: readonly Check[],
  allChecks: number,
  cutoff: string,
  intensity: EvaluationSources["intensity"],
): ConceptState | null {
  // Without a recorded first activity, "studied" is taken as it is.
  const active = state.firstActivityAt === undefined || state.firstActivityAt <= cutoff;
  const assessed = state.selfAssessed !== undefined;
  if (!active && checks.length === 0 && !assessed) return null;

  let srs: SrsState = { step: 0, lapses: 0, soloStreak: 0 };
  // Nothing recorded after the cutoff: the stored schedule is the one it had then.
  if (checks.length === allChecks && active) srs = state.srs;
  else {
    const studiedAt = state.studied && active ? state.firstActivityAt : undefined;
    if (studiedAt && (checks.length === 0 || studiedAt < checks[0]!.createdAt))
      srs = startConceptReview(srs, localDate(new Date(studiedAt)), intensity);
    for (const c of checks) {
      srs = applyConceptReview(srs, {
        score: c.score,
        today: localDate(new Date(c.createdAt)),
        reviewedAt: c.createdAt,
        intensity,
        drill: c.kind === "drill",
        fullyCorrect: c.score >= 1,
      });
    }
  }

  const next: ConceptState = {
    ...state,
    studied: state.studied && active,
    everStrong:
      state.everStrong && (state.strongSince === undefined || state.strongSince <= cutoff),
    srs,
  };
  delete next.manualStatus;
  if (state.manualStatus) {
    const kept = state.manualStatus === "strong" ? checks.some((c) => c.kind === "manual") : active;
    if (kept) next.manualStatus = state.manualStatus;
  }
  return next;
}

/** Every record as it stood at `cutoff`, ready for evaluateReadiness. */
export function sourcesAsOf(src: EvaluationSources, day: string, cutoff: Date): EvaluationSources {
  const at = nowIso(cutoff);
  const checks: Record<string, Check[]> = {};
  for (const [id, list] of Object.entries(src.checks)) {
    const kept = list
      .filter((c) => c.createdAt <= at)
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    if (kept.length) checks[id] = kept;
  }
  const conceptStates: Record<string, ConceptState> = {};
  for (const [id, state] of Object.entries(src.conceptStates)) {
    const past = conceptAsOf(
      state,
      checks[id] ?? [],
      src.checks[id]?.length ?? 0,
      at,
      src.intensity,
    );
    if (past) conceptStates[id] = past;
    // A hidden concept stays out of scope, with nothing learned yet.
    else if (state.hidden)
      conceptStates[id] = {
        conceptId: id,
        status: "not_started",
        hidden: true,
        everStrong: false,
        studied: false,
        knowledge: 0,
        srs: { step: 0, lapses: 0, soloStreak: 0 },
        updatedAt: state.updatedAt,
      };
  }
  const problemStates: Record<string, ProblemState> = {};
  for (const [id, state] of Object.entries(src.problemStates)) {
    const past = problemAsOf(state, at, src.intensity);
    if (past) problemStates[id] = past;
    else if (state.custom) problemStates[id] = { ...state, attempts: [], status: "todo" };
  }
  return { ...src, checks, conceptStates, problemStates, today: day, now: cutoff };
}

/** The readiness model as it stood at the end of `day` (23:59). */
export function readinessAsOf(src: EvaluationSources, day: string): ReadinessModel {
  return evaluateReadiness(sourcesAsOf(src, day, endOfDay(day)));
}

/** The local date of the owner's first check, attempt or active day, or null without any. */
export function firstDataDay(
  src: EvaluationSources,
  activeDays: Iterable<string> = [],
): string | null {
  // The earliest timestamp first (ISO strings sort by time), then one conversion to a local date.
  let earliest: string | null = null;
  for (const list of Object.values(src.checks))
    for (const c of list) if (!earliest || c.createdAt < earliest) earliest = c.createdAt;
  for (const p of Object.values(src.problemStates))
    for (const a of p.attempts) if (!earliest || attemptAt(a) < earliest) earliest = attemptAt(a);
  let first = earliest ? localDate(new Date(earliest)) : null;
  for (const d of activeDays) if (!first || d < first) first = d;
  return first;
}

/**
 * The Sundays of the finished weeks from the first week with data up to the week before
 * `today`'s (this week's point is today's live readiness), at most SUMMIT_MAX_WEEKS.
 */
export function summitSundays(first: string | null, today: string): string[] {
  if (!first || first > today) return [];
  const thisMonday = weekStart(today);
  const out: string[] = [];
  for (let sunday = addDaysToDate(weekStart(first), 6); sunday < thisMonday;) {
    out.push(sunday);
    sunday = addDaysToDate(sunday, 7);
  }
  return out.slice(-SUMMIT_MAX_WEEKS);
}

/** Every check and attempt time, sorted, for recordsFingerprint. */
export function recordTimes(src: EvaluationSources): string[] {
  const times: string[] = [];
  for (const list of Object.values(src.checks)) for (const c of list) times.push(c.createdAt);
  for (const p of Object.values(src.problemStates))
    for (const a of p.attempts) times.push(attemptAt(a));
  return times.sort();
}

/**
 * A short fingerprint of the records up to a day's end, so a cached week is used again only
 * while nothing it depends on has changed (an import can add older records). `times` comes from
 * recordTimes.
 */
export function recordsFingerprint(src: EvaluationSources, day: string, times: string[]): string {
  const at = nowIso(endOfDay(day));
  let lo = 0;
  let hi = times.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (times[mid]! <= at) lo = mid + 1;
    else hi = mid;
  }
  const p = src.profile;
  return [
    p.track,
    p.primaryLanguage,
    p.prefs.extraLanguages.join("+"),
    src.intensity,
    Object.keys(src.conceptStates).length,
    src.customConcepts?.length ?? 0,
    lo,
    lo ? times[lo - 1] : "",
  ].join("|");
}

// ----- the projection trail ------------------------------------------------------------------------

export interface SummitProjection {
  interviewDate: string;
  daysLeft: number;
  /** Readiness now and PACE_DAYS ago (the end of that day). */
  now: number;
  before: number;
  since: string;
  /** Readiness points a day over the last PACE_DAYS days. */
  pace: number;
  projected: number;
  low: number;
  high: number;
}

/**
 * F17's projection rule on readiness: the pace over the last 14 days carried to the interview,
 * with a ±20% range of the growth, capped at 100 (and never below today's readiness).
 */
export function summitProjection(
  now: number,
  before: number,
  today: string,
  interviewDate: string | undefined,
): SummitProjection | null {
  if (!interviewDate) return null;
  const daysLeft = daysBetween(today, interviewDate);
  if (daysLeft < 0) return null;
  const pace = Math.max(0, (now - before) / PACE_DAYS);
  const at = (f: number) => Math.min(100, now + pace * daysLeft * f);
  return {
    interviewDate,
    daysLeft,
    now,
    before,
    since: addDaysToDate(today, -PACE_DAYS),
    pace,
    projected: at(1),
    low: at(1 - PROJECTION_SPREAD),
    high: at(1 + PROJECTION_SPREAD),
  };
}

// ----- weekly stamps -------------------------------------------------------------------------------

/** Active days a week needs for a stamp. */
export const STAMP_DAYS = 5;
/** Weeks of stamps the dashboard shows. */
export const STAMP_WEEKS = 12;

export interface WeekStamp {
  /** Monday of the week. */
  week: string;
  /** ISO week number ("Week 38"). */
  number: number;
  activeDays: number;
  /** The subject with the most checks and attempts that week, if any. */
  subjectId?: string;
  /** Its checks plus attempts that week. */
  count: number;
}

/**
 * Stamps for the weeks (Monday to Sunday) with 5 or more active days among the given Mondays:
 * derived from the records, never stored, so a stamp can't be lost.
 */
export function weekStamps(
  mondays: readonly string[],
  isActive: (day: string) => boolean,
  checks: Readonly<Record<string, readonly Check[]>>,
  problems: Readonly<Record<string, ProblemState>>,
  isoWeek: (monday: string) => number,
  subjectOfConcept: (id: string) => string | undefined = (id) => conceptById.get(id)?.subjectId,
): WeekStamp[] {
  const stamps: WeekStamp[] = [];
  const wanted = new Set(mondays);
  const bySubject = new Map<string, Map<string, number>>();
  // Records outside the weeks asked for are skipped before any date conversion (a day's margin
  // either side covers time zones).
  const from = mondays.length ? `${addDaysToDate(mondays[0]!, -1)}` : "";
  const to = mondays.length ? `${addDaysToDate(mondays[mondays.length - 1]!, 8)}` : "";
  const near = (iso: string) => iso >= from && iso < to;
  const add = (day: string, subjectId: string | undefined) => {
    if (!subjectId) return;
    const monday = weekStart(day);
    if (!wanted.has(monday)) return;
    const counts = bySubject.get(monday) ?? new Map<string, number>();
    counts.set(subjectId, (counts.get(subjectId) ?? 0) + 1);
    bySubject.set(monday, counts);
  };
  for (const [conceptId, list] of Object.entries(checks))
    for (const c of list)
      if (near(c.createdAt)) add(localDate(new Date(c.createdAt)), subjectOfConcept(conceptId));
  for (const p of Object.values(problems)) {
    const recent = p.attempts.filter((a) => near(attemptAt(a)));
    if (recent.length === 0) continue;
    const info = problemInfo(p.problemId, p);
    const subjectId = info?.conceptIds[0] ? subjectOfConcept(info.conceptIds[0]) : undefined;
    for (const a of recent) add(attemptDate(a), subjectId);
  }
  for (const monday of mondays) {
    let activeDays = 0;
    for (let d = 0; d < 7; d++) if (isActive(addDaysToDate(monday, d))) activeDays++;
    if (activeDays < STAMP_DAYS) continue;
    let subjectId: string | undefined;
    let count = 0;
    for (const [id, n] of bySubject.get(monday) ?? []) {
      if (n > count || (n === count && subjectId !== undefined && id < subjectId)) {
        subjectId = id;
        count = n;
      }
    }
    stamps.push({ week: monday, number: isoWeek(monday), activeDays, subjectId, count });
  }
  return stamps;
}
