// Knowledge, practice and status of a concept (BUILD_SPEC.md 11.2). Pure functions: the stores
// gather the evidence (checks, linked problems) and cache the result in ConceptState.
//
// Status rules, in order:
// 1. A manual status wins, except a manual "strong" becomes "fading" when overdue (unless neverFade).
// 2. No evidence (not studied, not self-assessed, no checks, no attempts on linked problems):
//    not started.
// 3. Strong criteria: knowledge ≥ 0.8, plus practice ≥ 1 and a medium or hard problem solved
//    alone for patterns with linked problems, or practice ≥ 0.66 for other concepts with them.
// 4. Criteria met and not overdue: strong.
// 5. Overdue and (ever strong or knowledge ≥ 0.6): fading.
// 6. Otherwise: learning.
import { nowIso } from "@/lib/time";
import type { Check, ConceptState, Difficulty, ProblemState, Status } from "@/lib/types";
import {
  conceptInterval,
  daysOverdue,
  isOverdue,
  problemInterval,
  type Intensity,
} from "../srs/intervals";

const DAY_MS = 86_400_000;
export const CHECK_WINDOW_DAYS = 180;
export const STALE_CHECK_DAYS = 120;
export const STALE_FACTOR = 0.8;
export const STRONG_KNOWLEDGE = 0.8;
export const FADING_KNOWLEDGE = 0.6;
export const PATTERN_PRACTICE = 1;
export const OTHER_PRACTICE = 0.66;
export const PRACTICE_TARGET = 3;

export const CHECK_WEIGHT = {
  explain: 1,
  quiz: 1,
  flashcard: 0.9,
  drill: 0.6,
  manual: 0.8,
} as const;
export const DIFFICULTY_WEIGHT: Record<Difficulty, number> = { easy: 0.5, medium: 1, hard: 1.5 };

const byNewest = (a: Check, b: Check) => (a.createdAt < b.createdAt ? 1 : -1);

/**
 * Knowledge (0 to 1): the best of the latest check of each kind within 180 days (flashcards
 * average their last 3, drills the last 5), times 0.8 when the newest check is over 120 days old.
 * Marked studied → at least 0.3; self-assessed → at least that value until real checks exist.
 */
export function computeKnowledge(
  checks: readonly Check[],
  state: Pick<ConceptState, "studied" | "selfAssessed"> | undefined,
  now: Date,
): number {
  const cutoff = now.getTime() - CHECK_WINDOW_DAYS * DAY_MS;
  const recent = checks.filter((c) => Date.parse(c.createdAt) >= cutoff).sort(byNewest);
  const of = (kind: Check["kind"]) => recent.filter((c) => c.kind === kind);
  const avg = (list: Check[]) =>
    list.length ? list.reduce((s, c) => s + c.score, 0) / list.length : 0;

  const scores: number[] = [];
  const latest = (kind: "explain" | "quiz" | "manual") => {
    const c = of(kind)[0];
    if (c) scores.push(c.score * CHECK_WEIGHT[kind]);
  };
  latest("explain");
  latest("quiz");
  latest("manual");
  const cards = of("flashcard").slice(0, 3);
  if (cards.length) scores.push(avg(cards) * CHECK_WEIGHT.flashcard);
  const drills = of("drill").slice(0, 5);
  if (drills.length) scores.push(avg(drills) * CHECK_WEIGHT.drill);

  let knowledge = scores.length ? Math.max(...scores) : 0;
  const newest = recent[0];
  if (newest && now.getTime() - Date.parse(newest.createdAt) > STALE_CHECK_DAYS * DAY_MS) {
    knowledge *= STALE_FACTOR;
  }
  if (state?.studied) knowledge = Math.max(knowledge, 0.3);
  if (state?.selfAssessed !== undefined && checks.length === 0) {
    knowledge = Math.max(knowledge, state.selfAssessed);
  }
  return Math.min(1, Math.max(0, knowledge));
}

export interface LinkedProblem {
  id: string;
  difficulty: Difficulty;
  state?: ProblemState;
}

export interface Practice {
  /** 0 to 1: min(1, weighted solves / 3). */
  practice: number;
  /** The weighted sum before capping (easy 0.5, medium 1, hard 1.5; hints count half). */
  sum: number;
  /** A medium or hard problem whose latest attempt was solved alone. */
  hasMediumPlus: boolean;
  attempted: boolean;
}

function latestAttempt(state: ProblemState | undefined) {
  if (!state || state.attempts.length === 0) return undefined;
  return state.attempts.reduce((a, b) =>
    (b.finishedAt ?? b.startedAt) >= (a.finishedAt ?? a.startedAt) ? b : a,
  );
}

/** Practice from each linked problem's most recent attempt (section 11.2). */
export function computePractice(linked: readonly LinkedProblem[]): Practice {
  let sum = 0;
  let hasMediumPlus = false;
  let attempted = false;
  for (const p of linked) {
    const last = latestAttempt(p.state);
    if (!last) continue;
    attempted = true;
    const w = DIFFICULTY_WEIGHT[p.difficulty];
    if (last.result === "solved_alone") {
      sum += w;
      if (p.difficulty !== "easy") hasMediumPlus = true;
    } else if (last.result === "solved_with_hints") sum += w / 2;
  }
  return { practice: Math.min(1, sum / PRACTICE_TARGET), sum, hasMediumPlus, attempted };
}

export interface StatusInput {
  concept: { id: string; isPattern: boolean };
  state?: ConceptState;
  checks: readonly Check[];
  linked: readonly LinkedProblem[];
  today: string;
  now: Date;
  intensity: Intensity;
}

export interface StatusResult {
  status: Status;
  knowledge: number;
  practice: number;
  hasMediumPlus: boolean;
  hasLinkedProblems: boolean;
  evidence: boolean;
  overdue: boolean;
  /** Days past due, from the concept's own schedule or its most overdue linked problem. */
  overdueDays: number;
  strongCriteria: boolean;
  /** "What would turn it green": the unmet parts of the strong criteria, in plain words. */
  toGreen: string[];
}

/** Linked problems in review, not mastered, and overdue beyond their own grace period. */
function overdueLinked(linked: readonly LinkedProblem[], today: string, intensity: Intensity) {
  return linked.filter((p) => {
    const s = p.state;
    if (!s || !s.inReview || s.srs.retired || !s.srs.dueAt) return false;
    return isOverdue(s.srs.dueAt, problemInterval(s.srs.step, intensity, p.difficulty), today);
  });
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function computeStatus(input: StatusInput): StatusResult {
  const { concept, state, checks, linked, today, now, intensity } = input;
  const knowledge = computeKnowledge(checks, state, now);
  const { practice, sum, hasMediumPlus, attempted } = computePractice(linked);
  const hasLinkedProblems = linked.length > 0;

  const srs = state?.srs;
  const ownOverdue =
    srs?.dueAt !== undefined && isOverdue(srs.dueAt, conceptInterval(srs.step, intensity), today);
  const lateProblems = concept.isPattern ? overdueLinked(linked, today, intensity) : [];
  const overdue = ownOverdue || lateProblems.length >= 2;
  const overdueDays = Math.max(
    ownOverdue ? daysOverdue(srs?.dueAt, today) : 0,
    ...lateProblems.map((p) => daysOverdue(p.state?.srs.dueAt, today)),
  );

  const evidence =
    Boolean(state?.studied) || state?.selfAssessed !== undefined || checks.length > 0 || attempted;

  const toGreen: string[] = [];
  if (knowledge < STRONG_KNOWLEDGE) {
    toGreen.push("Score 80% or more on a quick quiz or explain it back");
  }
  let practiceOk = true;
  if (hasLinkedProblems && concept.isPattern) {
    practiceOk = practice >= PATTERN_PRACTICE && hasMediumPlus;
    const missing = Math.ceil(PRACTICE_TARGET - sum - 1e-9);
    if (missing > 0) {
      toGreen.push(
        `Solve ${plural(missing, "more medium problem", "more medium problems")} on your own`,
      );
    } else if (!hasMediumPlus) {
      toGreen.push("Solve a medium or hard problem on your own");
    }
  } else if (hasLinkedProblems) {
    practiceOk = practice >= OTHER_PRACTICE;
    const missing = Math.ceil(OTHER_PRACTICE * PRACTICE_TARGET - sum - 1e-9);
    if (missing > 0) {
      toGreen.push(
        `Solve ${plural(missing, "more linked problem", "more linked problems")} on your own`,
      );
    }
  }
  const strongCriteria = knowledge >= STRONG_KNOWLEDGE && practiceOk;
  if (overdue) {
    toGreen.push(
      overdueDays > 0 ? `Review it (due ${plural(overdueDays, "day", "days")} ago)` : "Review it",
    );
  }

  let status: Status;
  if (state?.manualStatus) {
    status =
      state.manualStatus === "strong" && overdue && !state.neverFade
        ? "fading"
        : state.manualStatus;
  } else if (!evidence) status = "not_started";
  else if (strongCriteria && !overdue) status = "strong";
  else if (overdue && (state?.everStrong || knowledge >= FADING_KNOWLEDGE)) status = "fading";
  else status = "learning";

  return {
    status,
    knowledge,
    practice,
    hasMediumPlus,
    hasLinkedProblems,
    evidence,
    overdue,
    overdueDays,
    strongCriteria,
    toGreen: status === "strong" ? [] : toGreen,
  };
}

/**
 * The ConceptState to store after a recompute, or null when nothing changed (so nothing is
 * written). Keeps everStrong and stamps strongSince when the concept newly turns strong.
 */
export function nextConceptState(
  conceptId: string,
  prev: ConceptState | undefined,
  result: StatusResult,
  now: Date,
  activityAt?: string,
): ConceptState | null {
  const knowledge = Math.round(result.knowledge * 1000) / 1000;
  const becameStrong = result.status === "strong" && prev?.status !== "strong";
  const everStrong = (prev?.everStrong ?? false) || result.status === "strong";
  const unchanged =
    prev &&
    prev.status === result.status &&
    prev.knowledge === knowledge &&
    prev.everStrong === everStrong &&
    !activityAt;
  if (unchanged) return null;
  if (!prev && result.status === "not_started" && !activityAt) return null;
  const stamp = nowIso(now);
  const next: ConceptState = prev
    ? { ...prev }
    : {
        conceptId,
        status: "not_started",
        everStrong: false,
        studied: false,
        knowledge: 0,
        srs: { step: 0, lapses: 0, soloStreak: 0 },
        updatedAt: stamp,
      };
  next.status = result.status;
  next.knowledge = knowledge;
  next.everStrong = everStrong;
  if (becameStrong) next.strongSince = stamp;
  if (activityAt) {
    next.firstActivityAt ??= activityAt;
    next.lastActivityAt = activityAt;
  }
  next.updatedAt = stamp;
  return next;
}
