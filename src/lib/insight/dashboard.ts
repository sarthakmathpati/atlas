// The readiness dashboard's numbers (F17), as one pure model over the owner's records, so every
// figure on the page can show the data and the formula behind it:
//   - overall and subject readiness (section 11.3, from the shared readiness model);
//   - the pattern grid: practice per DSA pattern and problems solved alone by difficulty, with
//     pattern drill accuracy and confusion pairs over 60 days (F10);
//   - status mix per subject;
//   - problems solved per week by difficulty (solved attempts, re-solves included);
//   - memory health: reviews due today, overdue, and retention (re-solves solved alone, 30 days);
//   - the weakness report: weakest must-know concepts, patterns without a hard solve, subjects
//     untouched for 14 days;
//   - the projection to the interview date (pace over 14 days, shown as a ±20% range).
import { conceptById, subjectById, topicById } from "@/data/syllabus";
import {
  confusionPairs,
  patternAccuracy,
  STATS_DAYS,
  type ConfusionPair,
  type PatternAccuracy,
} from "@/lib/drill/drill";
import { computePractice, practiceBreakdown } from "@/lib/mastery/status";
import { allProblems, problemInfo, type ProblemInfo } from "@/lib/problems/catalog";
import { attemptDate, attemptsInOrder, reviewInfo } from "@/lib/problems/progress";
import { linkedProblems } from "@/lib/readiness/evaluate";
import type { ConceptEval, ReadinessModel, SubjectModel } from "@/lib/readiness/model";
import type { Intensity } from "@/lib/srs/intervals";
import { addDaysToDate, daysBetween, localDate, parseLocalDate } from "@/lib/time";
import type { Check, ConceptState, Difficulty, ProblemState, Profile } from "@/lib/types";
import { weekStart } from "../activity/heatmap";

export const WEEKS_SHOWN = 12;
export const RETENTION_DAYS = 30;
export const UNTOUCHED_DAYS = 14;
export const PACE_DAYS = 14;
export const PROJECTION_SPREAD = 0.2;

export interface DashboardSources {
  profile: Pick<Profile, "track" | "interviewDate" | "hidePremium">;
  model: ReadinessModel;
  conceptStates: Readonly<Record<string, ConceptState>>;
  checks: Readonly<Record<string, readonly Check[]>>;
  problemStates: Readonly<Record<string, ProblemState>>;
  today: string;
  intensity: Intensity;
}

// ----- subjects ----------------------------------------------------------------------------------

export interface SubjectRow extends SubjectModel {
  name: string;
  shortName: string;
  /** Share of the overall score this subject contributes (weight × readiness / Σ weights). */
  contribution: number;
}

export function subjectRows(model: ReadinessModel): SubjectRow[] {
  return model.subjects
    .map((s) => ({
      ...s,
      name: subjectById.get(s.subjectId)?.name ?? s.subjectId,
      shortName: subjectById.get(s.subjectId)?.shortName ?? s.subjectId,
      contribution: model.totalWeight > 0 ? (s.weight * s.readiness) / model.totalWeight : 0,
    }))
    .sort(
      (a, b) =>
        Number(b.weight > 0) - Number(a.weight > 0) ||
        a.readiness - b.readiness ||
        (subjectById.get(a.subjectId)?.order ?? 0) - (subjectById.get(b.subjectId)?.order ?? 0),
    );
}

// ----- the pattern grid --------------------------------------------------------------------------

export interface PatternTile {
  conceptId: string;
  name: string;
  topicName: string;
  status: ConceptEval["status"];
  /** 0 to 1 (section 11.2). */
  practice: number;
  /** The weighted sum before the cap: easy 0.5, medium 1, hard 1.5, hints count half. */
  sum: number;
  /** Linked problems whose latest attempt was solved alone, by difficulty. */
  alone: Record<Difficulty, number>;
  withHints: Record<Difficulty, number>;
  linked: Record<Difficulty, number>;
  noHard: boolean;
  /** Pattern drill answers on this pattern in the last 60 days (F10), or null if none. */
  drill: { correct: number; total: number } | null;
}

export function patternTiles(
  src: DashboardSources,
  accuracy: readonly PatternAccuracy[] = patternAccuracy(allChecks(src), src.today),
): PatternTile[] {
  const byPattern = new Map(accuracy.map((a) => [a.conceptId, a]));
  const out: PatternTile[] = [];
  for (const e of src.model.byId.values()) {
    const c = e.concept;
    if (!c.isPattern) continue;
    const linked = linkedProblems(c.id, src.problemStates);
    const { practice, sum } = computePractice(linked);
    const b = practiceBreakdown(linked);
    out.push({
      conceptId: c.id,
      name: c.name,
      topicName: topicById.get(c.topicId)?.name ?? "",
      status: e.status,
      practice,
      sum,
      alone: b.alone,
      withHints: b.withHints,
      linked: b.total,
      noHard: b.alone.hard === 0,
      drill: byPattern.has(c.id)
        ? { correct: byPattern.get(c.id)!.correct, total: byPattern.get(c.id)!.total }
        : null,
    });
  }
  const topicOrder = (id: string) => topicById.get(conceptById.get(id)?.topicId ?? "")?.order ?? 0;
  return out.sort(
    (a, b) =>
      topicOrder(a.conceptId) - topicOrder(b.conceptId) ||
      (conceptById.get(a.conceptId)?.order ?? 0) - (conceptById.get(b.conceptId)?.order ?? 0),
  );
}

/** 0 (none) to 4 (practice complete) for the tile tint. */
export function practiceLevel(practice: number): 0 | 1 | 2 | 3 | 4 {
  if (practice <= 0) return 0;
  if (practice >= 1) return 4;
  if (practice < 1 / 3) return 1;
  if (practice < 2 / 3) return 2;
  return 3;
}

// ----- pattern recognition (the drill, F10) ------------------------------------------------------

function allChecks(src: DashboardSources): Check[] {
  return Object.values(src.checks).flat();
}

export interface Recognition {
  /** Drill answers in the last 60 days, and how many named the main pattern. */
  answered: number;
  correct: number;
  /** correct ÷ answered, or null with no answers. */
  accuracy: number | null;
  days: number;
  /** Up to 3 patterns recognized least often (at least 2 answers, under 100%). */
  weakest: PatternAccuracy[];
  /** "You often pick X when it's Y" (twice or more), the top 3. */
  confusion: ConfusionPair[];
}

export function recognition(
  src: DashboardSources,
  accuracy: readonly PatternAccuracy[] = patternAccuracy(allChecks(src), src.today),
): Recognition {
  const answered = accuracy.reduce((n, a) => n + a.total, 0);
  const correct = accuracy.reduce((n, a) => n + a.correct, 0);
  return {
    answered,
    correct,
    accuracy: answered ? correct / answered : null,
    days: STATS_DAYS,
    weakest: accuracy.filter((a) => a.total >= 2 && a.accuracy < 1).slice(0, 3),
    confusion: confusionPairs(allChecks(src), src.today, STATS_DAYS, 3),
  };
}

// ----- problems over time ------------------------------------------------------------------------

export interface WeekSolved {
  /** Monday of the week (yyyy-mm-dd). */
  week: string;
  easy: number;
  medium: number;
  hard: number;
}

/** Solved attempts (alone or with hints, re-solves included) per ISO week, by difficulty. */
export function solvedByWeek(
  problemStates: Readonly<Record<string, ProblemState>>,
  today: string,
  weeks = WEEKS_SHOWN,
): WeekSolved[] {
  const first = addDaysToDate(weekStart(today), -7 * (weeks - 1));
  const rows: WeekSolved[] = Array.from({ length: weeks }, (_, i) => ({
    week: addDaysToDate(first, 7 * i),
    easy: 0,
    medium: 0,
    hard: 0,
  }));
  for (const state of Object.values(problemStates)) {
    const info = problemInfo(state.problemId, state);
    if (!info) continue;
    for (const a of state.attempts) {
      if (a.result !== "solved_alone" && a.result !== "solved_with_hints") continue;
      const day = attemptDate(a);
      if (day < first || day > today) continue;
      const i = Math.floor(daysBetween(first, day) / 7);
      rows[i]![info.difficulty]++;
    }
  }
  return rows;
}

// ----- memory health -----------------------------------------------------------------------------

export interface MemoryHealth {
  /** Due today exactly (problems and concepts). */
  dueToday: { problems: number; concepts: number };
  /** Due before today and still waiting. */
  overdue: { problems: number; concepts: number };
  /** Re-solves (any attempt after a problem's first) in the last 30 days. */
  retention: { alone: number; total: number; rate: number | null; since: string };
}

export function memoryHealth(src: DashboardSources): MemoryHealth {
  const { today } = src;
  const dueToday = { problems: 0, concepts: 0 };
  const overdue = { problems: 0, concepts: 0 };
  for (const state of Object.values(src.problemStates)) {
    const info = problemInfo(state.problemId, state);
    if (!info) continue;
    const r = reviewInfo(state, info.difficulty, src.intensity, today);
    if (r.kind !== "due") continue;
    if (r.dueAt === today) dueToday.problems++;
    else overdue.problems++;
  }
  for (const e of src.model.byId.values()) {
    const dueAt = src.conceptStates[e.concept.id]?.srs.dueAt;
    if (!dueAt || dueAt > today) continue;
    if (dueAt === today) dueToday.concepts++;
    else overdue.concepts++;
  }
  const since = addDaysToDate(today, -(RETENTION_DAYS - 1));
  let alone = 0;
  let total = 0;
  for (const state of Object.values(src.problemStates)) {
    const ordered = attemptsInOrder(state);
    ordered.forEach((a, i) => {
      if (i === 0) return;
      const day = attemptDate(a);
      if (day < since || day > today) return;
      total++;
      if (a.result === "solved_alone") alone++;
    });
  }
  return {
    dueToday,
    overdue,
    retention: { alone, total, rate: total ? alone / total : null, since },
  };
}

// ----- weakness report ---------------------------------------------------------------------------

export interface WeakSubject {
  subjectId: string;
  name: string;
  /** Local date of the last activity in the subject. */
  lastActive: string;
  daysSince: number;
}

export interface WeaknessReport {
  concepts: ConceptEval[];
  patterns: (PatternTile & { hardProblem: ProblemInfo })[];
  subjects: WeakSubject[];
}

/** The last day anything happened in each subject: concept activity, checks, attempts. */
export function lastActivityBySubject(src: DashboardSources): Map<string, string> {
  const last = new Map<string, string>();
  const note = (subjectId: string | undefined, day: string) => {
    if (!subjectId) return;
    const prev = last.get(subjectId);
    if (!prev || day > prev) last.set(subjectId, day);
  };
  for (const e of src.model.byId.values()) {
    const at = src.conceptStates[e.concept.id]?.lastActivityAt;
    if (at) note(e.concept.subjectId, localDate(new Date(at)));
    const checks = src.checks[e.concept.id];
    const lastCheck = checks?.[checks.length - 1];
    if (lastCheck) note(e.concept.subjectId, localDate(new Date(lastCheck.createdAt)));
  }
  for (const state of Object.values(src.problemStates)) {
    const info = problemInfo(state.problemId, state);
    const a = attemptsInOrder(state).at(-1);
    if (!info || !a) continue;
    for (const id of info.conceptIds) note(conceptById.get(id)?.subjectId, attemptDate(a));
  }
  return last;
}

export function weaknessReport(
  src: DashboardSources,
  tiles: readonly PatternTile[],
): WeaknessReport {
  const concepts = [...src.model.byId.values()]
    .filter(
      (e) => e.concept.importance === "must" && (e.status === "learning" || e.status === "fading"),
    )
    .sort(
      (a, b) =>
        a.score - b.score ||
        Number(b.status === "fading") - Number(a.status === "fading") ||
        a.concept.name.localeCompare(b.concept.name),
    )
    .slice(0, 5);

  const problems = allProblems(src.problemStates);
  const patterns: WeaknessReport["patterns"] = [];
  for (const t of [...tiles]
    .filter((x) => x.noHard && x.sum > 0)
    .sort((a, b) => b.practice - a.practice)) {
    if (patterns.length >= 3) break;
    const hard = problems.find(
      (p) =>
        p.difficulty === "hard" &&
        p.source === "leetcode" &&
        p.conceptIds.includes(t.conceptId) &&
        src.problemStates[p.id]?.status !== "solved" &&
        !(src.profile.hidePremium && p.premium),
    );
    if (hard) patterns.push({ ...t, hardProblem: hard });
  }

  const last = lastActivityBySubject(src);
  const subjects: WeakSubject[] = [];
  for (const s of src.model.subjects) {
    if (s.weight <= 0) continue;
    const started = s.counts.learning + s.counts.strong + s.counts.fading;
    const day = last.get(s.subjectId);
    if (!started || !day) continue;
    const daysSince = daysBetween(day, src.today);
    if (daysSince >= UNTOUCHED_DAYS)
      subjects.push({
        subjectId: s.subjectId,
        name: subjectById.get(s.subjectId)?.name ?? s.subjectId,
        lastActive: day,
        daysSince,
      });
  }
  subjects.sort((a, b) => b.daysSince - a.daysSince);
  return { concepts, patterns, subjects };
}

// ----- projection ----------------------------------------------------------------------------------

export interface Projection {
  interviewDate: string;
  daysLeft: number;
  totalMust: number;
  strongMust: number;
  /** Must-know concepts that turned strong in the last 14 days. */
  recentStrong: number;
  since: string;
  /** Must-know concepts per day. */
  pace: number;
  projected: number;
  low: number;
  high: number;
}

export function projection(src: DashboardSources): Projection | null {
  const date = src.profile.interviewDate;
  if (!date) return null;
  const daysLeft = daysBetween(src.today, date);
  if (daysLeft < 0) return null;
  const since = addDaysToDate(src.today, -(PACE_DAYS - 1));
  let totalMust = 0;
  let strongMust = 0;
  let recentStrong = 0;
  for (const e of src.model.byId.values()) {
    if (e.concept.importance !== "must") continue;
    totalMust++;
    if (e.status === "strong") strongMust++;
    const at = src.conceptStates[e.concept.id]?.strongSince;
    if (at && localDate(new Date(at)) >= since && localDate(new Date(at)) <= src.today)
      recentStrong++;
  }
  const pace = recentStrong / PACE_DAYS;
  const cap = (n: number) => Math.min(totalMust, n);
  return {
    interviewDate: date,
    daysLeft,
    totalMust,
    strongMust,
    recentStrong,
    since,
    pace,
    projected: cap(strongMust + pace * daysLeft),
    low: cap(strongMust + pace * daysLeft * (1 - PROJECTION_SPREAD)),
    high: cap(strongMust + pace * daysLeft * (1 + PROJECTION_SPREAD)),
  };
}

// ----- all together ----------------------------------------------------------------------------------

export interface DashboardModel {
  subjects: SubjectRow[];
  patterns: PatternTile[];
  recognition: Recognition;
  weeks: WeekSolved[];
  memory: MemoryHealth;
  weakness: WeaknessReport;
  projection: Projection | null;
}

export function dashboardModel(src: DashboardSources): DashboardModel {
  const accuracy = patternAccuracy(allChecks(src), src.today);
  const patterns = patternTiles(src, accuracy);
  return {
    subjects: subjectRows(src.model),
    patterns,
    recognition: recognition(src, accuracy),
    weeks: solvedByWeek(src.problemStates, src.today),
    memory: memoryHealth(src),
    weakness: weaknessReport(src, patterns),
    projection: projection(src),
  };
}

/** "21 Sep" for a week label. */
export function shortDay(day: string): string {
  return parseLocalDate(day).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}
