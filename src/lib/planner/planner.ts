// The daily planner (BUILD_SPEC.md 11.4, F16). Pure and deterministic: the same inputs always give
// the same plan, and ties are broken by a random rank seeded with the date string.
//
//   1. Minimum day (the switch, or a budget of 15 minutes or less): one small item.
//   2. Daily staples (budget ≥ 45): a drill; mental math for the Quant and Both tracks.
//   3. Reviews, up to 45% of the budget (60% within 14 days of the interview): due re-solves
//      (tricky first, then by overdue days / interval × importance), then fading concepts, then
//      due concepts, 3 or 4 per flashcard item. The most urgent re-solve always gets a place
//      when it fits the day, so a long one isn't pushed back forever by a small budget.
//   4. New learning with what is left, split by the balance setting: up to 2 ready concepts
//      (11.5), and new problems on the weakest pattern that is learning or ready (easy until 2
//      easy are solved alone, then medium; hard after 3 medium).
//   5. Weekly extras: a mock, design practice, story practice, when their conditions hold.
//   6. Within 14 days of the interview: a revision sheet every day, no new advanced concepts,
//      new problems only medium from the weakest patterns, and due-soon re-solves pulled forward.
//   7. Fit to the budget: at most B + min(15, 10% of B), aiming for at least 90% of B; no
//      single item longer than the budget (a smaller one of the same kind is chosen instead);
//      3 to 8 items when the budget allows.
//   8. Every item carries a plain-language reason (reasons.ts).
//
// Swap offers the next candidates of the same kind that aren't on the plan (never a duplicate).
import { conceptById, topicById } from "@/data/syllabus";
import { ESTIMATES, IMPORTANCE_WEIGHT } from "@/lib/constants";
import { computePractice, practiceBreakdown, type LinkedProblem } from "@/lib/mastery/status";
import { problemLabel, type ProblemInfo } from "@/lib/problems/catalog";
import { difficultyRamp } from "@/lib/problems/suggest";
import { latestAttempt, reviewInfo } from "@/lib/problems/progress";
import { seededRank } from "@/lib/random";
import { isLearnedStatus as isLearned, isReady, rankReady } from "@/lib/recommend/ready";
import { conceptInterval, type Intensity } from "@/lib/srs/intervals";
import { isTricky } from "@/lib/srs/problem";
import { addDaysToDate, daysBetween } from "@/lib/time";
import type {
  Concept,
  ConceptState,
  Difficulty,
  PlanItem,
  ProblemState,
  Status,
  Track,
} from "@/lib/types";
import { KIND_ORDER, refsOf, type PlanKind } from "./kinds";
import {
  bundleReason,
  drillReason,
  joinNames,
  learnReason,
  newProblemReason,
  resolveReason,
  revisionReason,
} from "./reasons";

export const MINIMUM_DAY_MINUTES = 15;
export const MAX_ITEMS = 8;
export const MIN_ITEMS = 3;
export const MAX_NEW_CONCEPTS = 2;
export const REVIEW_SHARE = 0.45;
export const REVIEW_SHARE_NEAR = 0.6;
export const NEAR_INTERVIEW_DAYS = 14;
export const STAPLES_MIN_BUDGET = 45;
export const EXTRAS_MIN_BUDGET = 90;
export const MOCK_MIN_READINESS = 30;
export const DESIGN_MAX_READINESS = 60;
export const STORY_WINDOW_DAYS = 45;
/** Near the interview, re-solves due within this many days may be pulled forward. */
export const EARLY_RESOLVE_DAYS = 7;

/** The most a plan may add up to: B + min(15, 10% of B). */
export function budgetCeiling(budget: number): number {
  return budget + Math.min(15, Math.round(budget * 0.1));
}

/** Minutes for a flashcard bundle (8 to 12, section 11.4). */
export function bundleMinutes(size: number): number {
  return size <= 2 ? 8 : size === 3 ? 10 : 12;
}

export interface PlannerHistory {
  /** Local dates of finished mock interviews, design practice and story practice. */
  mocks?: readonly string[];
  designs?: readonly string[];
  stories?: readonly string[];
}

export interface PlannerInput {
  /** yyyy-mm-dd, local. */
  date: string;
  budget: number;
  minimumDay: boolean;
  track: Track;
  interviewDate?: string;
  balance: { problems: number; theory: number };
  focusSubjects: readonly string[];
  hidePremium: boolean;
  intensity: Intensity;
  /** Concepts in the owner's scope: the track, not hidden, not another language's topic. */
  concepts: readonly Concept[];
  conceptStates: Readonly<Record<string, ConceptState>>;
  /** Every problem the planner may pick from or schedule (seed banks plus the owner's own). */
  problems: readonly ProblemInfo[];
  problemStates: Readonly<Record<string, ProblemState>>;
  /** Subject readiness 0 to 100 and the overall score (section 11.3). */
  subjectReadiness: Readonly<Record<string, number>>;
  overallReadiness: number;
  history?: PlannerHistory;
  /** The owner's weakest drill pattern over 60 days, for the drill's reason. */
  drillWeakest?: { name: string; correct: number; total: number };
  /** Behavioral questions, for story practice. */
  storyQuestions?: readonly { id: string; text: string }[];
  /** Kinds whose screens exist; others are never planned (kinds.ts). */
  available: ReadonlySet<PlanKind>;
}

/** A candidate for the plan (an item before it gets its done and skipped flags). */
export interface Candidate {
  kind: PlanKind;
  refId?: string;
  refIds?: string[];
  title: string;
  reason: string;
  estMinutes: number;
  /** Ordering hint inside a kind's list (for tests and swaps); lower first. */
  rank: number;
  /** Difficulty of a problem item. */
  difficulty?: Difficulty;
  /** A re-solve pulled forward before the interview (not due yet). */
  early?: boolean;
}

export function candidateId(c: Pick<Candidate, "kind" | "refId" | "refIds">): string {
  const refs = refsOf(c);
  return `${c.kind}:${refs.join("+")}`;
}

function toItem(c: Candidate): PlanItem {
  const item: PlanItem = {
    id: candidateId(c),
    kind: c.kind,
    title: c.title,
    reason: c.reason,
    estMinutes: c.estMinutes,
    done: false,
    skipped: false,
    origin: "planner",
  };
  if (c.refId !== undefined) item.refId = c.refId;
  if (c.refIds?.length) item.refIds = [...c.refIds];
  return item;
}

// ----- the context shared by every step ------------------------------------------------------

interface Ctx {
  input: PlannerInput;
  rank: (key: string) => number;
  daysLeft: number | null;
  near: boolean;
  inScope: ReadonlySet<string>;
  byId: ReadonlyMap<string, Concept>;
  statusOf: (id: string) => Status;
  linked: ReadonlyMap<string, LinkedProblem[]>;
  problemById: ReadonlyMap<string, ProblemInfo>;
  cache: Map<string, Candidate[]>;
}

function context(input: PlannerInput): Ctx {
  const daysLeft = input.interviewDate ? daysBetween(input.date, input.interviewDate) : null;
  const byId = new Map(input.concepts.map((c) => [c.id, c]));
  const linked = new Map<string, LinkedProblem[]>();
  for (const p of input.problems) {
    for (const id of p.conceptIds) {
      let list = linked.get(id);
      if (!list) linked.set(id, (list = []));
      list.push({ id: p.id, difficulty: p.difficulty, state: input.problemStates[p.id] });
    }
  }
  return {
    input,
    rank: seededRank(input.date),
    daysLeft,
    near: daysLeft !== null && daysLeft >= 0 && daysLeft <= NEAR_INTERVIEW_DAYS,
    inScope: new Set(byId.keys()),
    byId,
    statusOf: (id) => input.conceptStates[id]?.status ?? "not_started",
    linked,
    problemById: new Map(input.problems.map((p) => [p.id, p])),
    cache: new Map(),
  };
}

const conceptOf = (ctx: Ctx, id: string) => ctx.byId.get(id) ?? conceptById.get(id);

/** Importance weight of a problem: the heaviest of its concepts (must 3, important 2, …). */
function problemImportance(ctx: Ctx, p: ProblemInfo): number {
  let w = 0;
  for (const id of p.conceptIds) {
    const c = conceptOf(ctx, id);
    if (c) w = Math.max(w, IMPORTANCE_WEIGHT[c.importance]);
  }
  return w || IMPORTANCE_WEIGHT.important;
}

function memo(ctx: Ctx, key: string, build: () => Candidate[]): Candidate[] {
  let list = ctx.cache.get(key);
  if (!list) ctx.cache.set(key, (list = build()));
  return list;
}

// ----- candidates, best first, per kind --------------------------------------------------------

/** Due re-solves: tricky first, then (overdue days / interval) × importance; near the interview
 *  also those due within a week, soonest first. */
function resolveCandidates(ctx: Ctx): Candidate[] {
  return memo(ctx, "resolve", () => {
    const { input } = ctx;
    const due: (Candidate & { tricky: boolean; score: number })[] = [];
    const early: (Candidate & { inDays: number })[] = [];
    for (const state of Object.values(input.problemStates)) {
      const info = ctx.problemById.get(state.problemId);
      if (!info) continue;
      const review = reviewInfo(state, info.difficulty, input.intensity, input.date);
      const est = ESTIMATES.resolve[info.difficulty];
      const last = latestAttempt(state);
      if (review.kind === "due") {
        const tricky = isTricky(state.srs);
        due.push({
          kind: "resolve",
          refId: info.id,
          title: `Re-solve: ${problemLabel(info)}`,
          reason: resolveReason({
            last,
            today: input.date,
            tricky,
            lapses: state.srs.lapses,
          }),
          estMinutes: est,
          rank: 0,
          difficulty: info.difficulty,
          tricky,
          score:
            (review.daysLate / Math.max(1, review.intervalDays)) * problemImportance(ctx, info),
        });
      } else if (
        ctx.near &&
        review.kind === "upcoming" &&
        review.inDays <= EARLY_RESOLVE_DAYS &&
        review.dueAt <= (input.interviewDate ?? review.dueAt)
      ) {
        early.push({
          kind: "resolve",
          refId: info.id,
          title: `Re-solve: ${problemLabel(info)}`,
          reason: resolveReason({
            last,
            today: input.date,
            tricky: false,
            lapses: state.srs.lapses,
            earlyInDays: review.inDays,
          }),
          estMinutes: est,
          rank: 0,
          difficulty: info.difficulty,
          inDays: review.inDays,
        });
      }
    }
    due.sort(
      (a, b) =>
        Number(b.tricky) - Number(a.tricky) ||
        b.score - a.score ||
        ctx.rank(a.refId!) - ctx.rank(b.refId!),
    );
    early.sort((a, b) => a.inDays - b.inDays || ctx.rank(a.refId!) - ctx.rank(b.refId!));
    return [...due, ...early].map((c, i) => ({
      kind: c.kind,
      refId: c.refId,
      title: c.title,
      reason: c.reason,
      estMinutes: c.estMinutes,
      difficulty: c.difficulty,
      early: "inDays" in c,
      rank: i,
    }));
  });
}

interface ReviewConcept {
  concept: Concept;
  state?: ConceptState;
  fading: boolean;
  daysLate: number;
  urgency: number;
}

/** Concepts to review: fading ones first (must-know first), then due ones by urgency. */
function reviewConcepts(ctx: Ctx): ReviewConcept[] {
  const { input } = ctx;
  const fading: ReviewConcept[] = [];
  const due: ReviewConcept[] = [];
  for (const concept of input.concepts) {
    const state = input.conceptStates[concept.id];
    if (!state || state.hidden) continue;
    const dueAt = state.srs.dueAt;
    const daysLate = dueAt ? daysBetween(dueAt, input.date) : -1;
    const urgency = (daysLate + 1) / conceptInterval(state.srs.step, input.intensity);
    if (state.status === "fading") {
      fading.push({ concept, state, fading: true, daysLate: Math.max(0, daysLate), urgency });
    } else if (dueAt && dueAt <= input.date) {
      due.push({ concept, state, fading: false, daysLate, urgency });
    }
  }
  const imp = (c: Concept) => IMPORTANCE_WEIGHT[c.importance];
  fading.sort(
    (a, b) =>
      imp(b.concept) - imp(a.concept) ||
      b.urgency - a.urgency ||
      ctx.rank(a.concept.id) - ctx.rank(b.concept.id),
  );
  due.sort((a, b) => b.urgency - a.urgency || ctx.rank(a.concept.id) - ctx.rank(b.concept.id));
  return [...fading, ...due];
}

function shortNames(list: readonly ReviewConcept[]): string {
  const names = list.map((r) => r.concept.name);
  return names.length <= 3
    ? joinNames(names)
    : `${names.slice(0, 2).join(", ")} and ${names.length - 2} more`;
}

function bundleCandidate(list: ReviewConcept[], date: string, rank: number): Candidate {
  const ids = list.map((r) => r.concept.id);
  return {
    kind: "review-concept",
    refId: ids.length === 1 ? ids[0] : undefined,
    refIds: ids,
    title: `Flashcards: ${shortNames(list)}`,
    reason: bundleReason(list, date),
    estMinutes: bundleMinutes(list.length),
    rank,
  };
}

/** The same bundle with only its first `size` concepts. */
function shrinkBundle(ctx: Ctx, c: Candidate, size: number): Candidate {
  const keep = new Set((c.refIds ?? []).slice(0, size));
  const list = reviewConcepts(ctx).filter((r) => keep.has(r.concept.id));
  return bundleCandidate(list, ctx.input.date, c.rank);
}

/** Flashcard bundles of 4 (the last may be smaller) from the concepts not in `exclude`. */
function bundleCandidates(ctx: Ctx, exclude: ReadonlySet<string> = new Set()): Candidate[] {
  const build = () => {
    const pool = reviewConcepts(ctx).filter((r) => !exclude.has(r.concept.id));
    const out: Candidate[] = [];
    for (let i = 0; i < pool.length; i += 4) {
      out.push(bundleCandidate(pool.slice(i, i + 4), ctx.input.date, out.length));
    }
    return out;
  };
  return exclude.size ? build() : memo(ctx, "bundles", build);
}

/** Ready concepts (section 11.5), best first. */
function learnCandidates(ctx: Ctx): Candidate[] {
  return memo(ctx, "learn", () => {
    const { input } = ctx;
    const ranked = rankReady(input.concepts, {
      statusOf: ctx.statusOf,
      inScope: (c) => ctx.inScope.has(c.id),
      track: input.track,
      focusSubjects: input.focusSubjects,
      subjectReadiness: input.subjectReadiness,
      today: input.date,
      interviewDate: input.interviewDate,
    });
    return ranked.map((concept, i) => {
      const prereqs = concept.prereqs
        .filter((id) => ctx.inScope.has(id))
        .map((id) => ({
          name: conceptOf(ctx, id)?.name ?? id,
          strong: ctx.statusOf(id) === "strong",
        }));
      return {
        kind: "learn-concept" as const,
        refId: concept.id,
        title: `Learn: ${concept.name}`,
        reason: learnReason({
          concept,
          prereqs,
          focus: input.focusSubjects.includes(concept.subjectId),
          topicName: topicById.get(concept.topicId)?.name,
        }),
        estMinutes: concept.estMinutes || 25,
        rank: i,
      };
    });
  });
}

const RAMP_ORDER: Record<Difficulty, Difficulty[]> = {
  easy: ["easy", "medium", "hard"],
  medium: ["medium", "hard", "easy"],
  hard: ["hard", "medium", "easy"],
};

/** New problems: one per pattern first (weakest pattern first), then a second pick per pattern. */
function newProblemCandidates(ctx: Ctx): Candidate[] {
  return memo(ctx, "new-problem", () => {
    const { input } = ctx;
    const dueOrSoon = new Set(resolveCandidates(ctx).map((c) => c.refId!));
    const patterns: { concept: Concept; practice: number; started: boolean; learning: boolean }[] =
      [];
    for (const concept of input.concepts) {
      if (!concept.isPattern) continue;
      const status = ctx.statusOf(concept.id);
      const linked = ctx.linked.get(concept.id) ?? [];
      const { practice } = computePractice(linked);
      if (ctx.near) {
        // Near the interview: the weakest patterns among those already under way.
        if (status === "not_started" || practice >= 1) continue;
      } else if (status === "strong" || status === "fading") continue;
      else if (status === "not_started") {
        const ready = isReady(concept, {
          statusOf: ctx.statusOf,
          inScope: (c) => ctx.inScope.has(c.id),
        });
        if (!ready) continue;
      }
      patterns.push({
        concept,
        practice,
        started: status !== "not_started",
        learning: status === "learning",
      });
    }
    // A gentle start: before any pattern is learning or ready (the first days, while the topic
    // prerequisites are still being learned), easy problems on the earliest patterns whose own
    // prerequisites are met (CLAUDE.md decision 86).
    let gentle = false;
    if (patterns.length === 0 && !ctx.near) {
      gentle = true;
      for (const concept of input.concepts) {
        if (!concept.isPattern || ctx.statusOf(concept.id) !== "not_started") continue;
        const unmet = concept.prereqs.some(
          (id) => ctx.inScope.has(id) && !isLearned(ctx.statusOf(id)),
        );
        if (!unmet) patterns.push({ concept, practice: 0, started: false, learning: false });
      }
    }
    const focus = new Set(input.focusSubjects);
    const topicOrder = (c: Concept) => topicById.get(c.topicId)?.order ?? 0;
    patterns.sort(
      (a, b) =>
        a.practice - b.practice ||
        Number(focus.has(b.concept.subjectId)) - Number(focus.has(a.concept.subjectId)) ||
        Number(b.learning) - Number(a.learning) ||
        IMPORTANCE_WEIGHT[b.concept.importance] - IMPORTANCE_WEIGHT[a.concept.importance] ||
        topicOrder(a.concept) - topicOrder(b.concept) ||
        a.concept.order - b.concept.order,
    );

    const firsts: Candidate[] = [];
    const seconds: Candidate[] = [];
    const used = new Set<string>();
    for (const pat of patterns) {
      const linkedInfo = (ctx.linked.get(pat.concept.id) ?? [])
        .map((l) => ctx.problemById.get(l.id))
        .filter((p): p is ProblemInfo => Boolean(p));
      const alone = practiceBreakdown(ctx.linked.get(pat.concept.id) ?? []).alone;
      // The difficulty ramp counts problems ever solved alone (as the Practice tab does).
      const ramp = difficultyRamp(linkedInfo, input.problemStates);
      const target: Difficulty = ctx.near ? "medium" : gentle ? "easy" : ramp.target;
      const open = linkedInfo
        .filter(
          (p) =>
            p.source === "leetcode" &&
            !p.language &&
            input.problemStates[p.id]?.status !== "solved" &&
            !dueOrSoon.has(p.id) &&
            !used.has(p.id) &&
            !(input.hidePremium && p.premium),
        )
        .sort(
          (a, b) =>
            Number(Boolean(input.problemStates[a.id]?.attempts.length)) -
              Number(Boolean(input.problemStates[b.id]?.attempts.length)) || a.order - b.order,
        );
      const order: Difficulty[] = ctx.near ? ["medium"] : gentle ? ["easy"] : RAMP_ORDER[target];
      const picks: ProblemInfo[] = [];
      for (const d of order) {
        for (const p of open) if (p.difficulty === d && picks.length < 2) picks.push(p);
        if (picks.length >= 2) break;
      }
      picks.forEach((p, i) => {
        used.add(p.id);
        const c: Candidate = {
          kind: "new-problem",
          refId: p.id,
          title: `New problem: ${problemLabel(p)}`,
          reason: newProblemReason({
            pattern: pat.concept.name,
            alone,
            started: pat.started,
            nearInterview: ctx.near,
            gentle,
            difficulty: p.difficulty,
          }),
          estMinutes: ESTIMATES.newProblem[p.difficulty],
          difficulty: p.difficulty,
          rank: 0,
        };
        (i === 0 ? firsts : seconds).push(c);
      });
    }
    return [...firsts, ...seconds].map((c, i) => ({ ...c, rank: i }));
  });
}

function drillCandidates(ctx: Ctx): Candidate[] {
  return [
    {
      kind: "drill",
      title: "Pattern drill: 5 prompts",
      reason: drillReason(ctx.input.drillWeakest),
      estMinutes: ESTIMATES.drill,
      rank: 0,
    },
  ];
}

function mentalMathCandidates(): Candidate[] {
  return [
    {
      kind: "mental-math",
      title: "Mental math sprint",
      reason: "Eight minutes of speed arithmetic keeps you quick for quant rounds.",
      estMinutes: ESTIMATES.mentalMath,
      rank: 0,
    },
  ];
}

function revisionCandidates(ctx: Ctx): Candidate[] {
  const days = Math.max(0, ctx.daysLeft ?? 0);
  const main: "day" | "week" = days > 3 ? "week" : "day";
  const other: "day" | "week" = main === "week" ? "day" : "week";
  return [main, other].map((scope, i) => ({
    kind: "revision" as const,
    refId: `revision-${scope}`,
    title:
      scope === "week" ? "Revision sheet: the 1-week sheet" : "Revision sheet: the 1-day sheet",
    reason: revisionReason(days, scope),
    estMinutes: ESTIMATES.revision,
    rank: i,
  }));
}

function lastWithin(dates: readonly string[] | undefined, date: string, days: number): number {
  const since = addDaysToDate(date, -days + 1);
  return (dates ?? []).filter((d) => d >= since && d <= date).length;
}

const isWeekend = (date: string) => {
  const d = new Date(`${date}T12:00:00`).getDay();
  return d === 0 || d === 6;
};

/** Weekly extras (step 5): each is a list of at most one candidate when its conditions hold. */
function extraCandidates(ctx: Ctx, kind: "mock" | "design" | "story", budget: number): Candidate[] {
  const { input } = ctx;
  const history = input.history ?? {};
  if (kind === "mock") {
    if (budget < EXTRAS_MIN_BUDGET || input.overallReadiness < MOCK_MIN_READINESS) return [];
    if (lastWithin(history.mocks, input.date, 7) > 0) return [];
    // Prefer weekends: on a weekday only once it has been more than 10 days.
    if (!isWeekend(input.date) && lastWithin(history.mocks, input.date, 10) > 0) return [];
    return [
      {
        kind: "mock",
        title: "Mock interview: coding",
        reason: `No mock in the last week, and your readiness (${Math.round(input.overallReadiness)}) is ready for one.`,
        estMinutes: ESTIMATES.mock,
        rank: 0,
      },
    ];
  }
  if (kind === "design") {
    if (input.track === "quant" || budget < EXTRAS_MIN_BUDGET) return [];
    const sysd = input.subjectReadiness.sysd ?? 0;
    if (sysd >= DESIGN_MAX_READINESS) return [];
    if (lastWithin(history.designs, input.date, 7) > 0) return [];
    // The design prompt for the weakest classic system design concept in scope.
    const classics = input.concepts
      .filter((c) => c.topicId === "sysd.classics" && ctx.statusOf(c.id) !== "strong")
      .sort((a, b) => a.order - b.order);
    const prompts = input.problems.filter((p) => p.source === "design-hld");
    const tried = (id: string) => Boolean(input.problemStates[id]?.attempts.length);
    const pick =
      classics
        .map((c) => prompts.find((p) => p.conceptIds.includes(c.id)))
        .find((p): p is ProblemInfo => Boolean(p) && !tried(p!.id)) ??
      prompts.find((p) => !tried(p.id));
    if (!pick) return [];
    return [
      {
        kind: "design",
        refId: pick.id,
        title: `Design practice: ${pick.title}`,
        reason: `System design readiness is ${Math.round(sysd)}; one timed design a week builds it steadily.`,
        estMinutes: ESTIMATES.design,
        rank: 0,
      },
    ];
  }
  if (ctx.daysLeft === null || ctx.daysLeft < 0 || ctx.daysLeft > STORY_WINDOW_DAYS) return [];
  const recent = lastWithin(history.stories, input.date, 7);
  const yesterday = addDaysToDate(input.date, -1);
  if (recent >= 2 || (history.stories ?? []).some((d) => d === input.date || d === yesterday))
    return [];
  const questions = input.storyQuestions ?? [];
  if (questions.length === 0) return [];
  const q = [...questions].sort((a, b) => ctx.rank(a.id) - ctx.rank(b.id))[0]!;
  return [
    {
      kind: "story",
      refId: q.id,
      title: "Story practice: one behavioral answer",
      reason: `Your interview is ${ctx.daysLeft} days away. Ten minutes on "${q.text}" keeps your stories ready.`,
      estMinutes: ESTIMATES.story,
      rank: 0,
    },
  ];
}

// ----- building a plan -------------------------------------------------------------------------

class PlanBuilder {
  readonly items: Candidate[] = [];
  readonly taken = new Set<string>();
  total: number;
  count: number;
  readonly kinds = new Map<PlanKind, number>();

  constructor(
    readonly budget: number,
    kept: readonly PlanItem[],
  ) {
    this.total = 0;
    this.count = 0;
    for (const item of kept) {
      for (const r of refsOf(item)) this.taken.add(r);
      if (item.skipped) continue;
      this.total += item.estMinutes;
      this.count++;
      this.kinds.set(item.kind, (this.kinds.get(item.kind) ?? 0) + 1);
    }
  }

  get ceiling() {
    return budgetCeiling(this.budget);
  }

  free(c: Candidate): boolean {
    return refsOf(c).every((r) => !this.taken.has(r));
  }

  fits(c: Candidate): boolean {
    return (
      this.count < MAX_ITEMS &&
      c.estMinutes <= this.budget &&
      this.total + c.estMinutes <= this.ceiling &&
      this.free(c)
    );
  }

  add(c: Candidate): void {
    this.items.push(c);
    for (const r of refsOf(c)) this.taken.add(r);
    this.total += c.estMinutes;
    this.count++;
    this.kinds.set(c.kind, (this.kinds.get(c.kind) ?? 0) + 1);
  }

  has(kind: PlanKind): boolean {
    return (this.kinds.get(kind) ?? 0) > 0;
  }

  tryFirst(list: readonly Candidate[]): boolean {
    const c = list.find((x) => this.fits(x));
    if (!c) return false;
    this.add(c);
    return true;
  }
}

function minimumDay(ctx: Ctx, b: PlanBuilder): void {
  const { input } = ctx;
  const available = input.available;
  if (available.has("resolve")) {
    const due = resolveCandidates(ctx).filter(
      (c) => c.difficulty !== "hard" && !c.early && b.free(c),
    );
    // "The most overdue": the ranking is by lateness relative to the interval; prefer raw days.
    const late = (c: Candidate) => {
      const s = input.problemStates[c.refId!];
      return s?.srs.dueAt ? daysBetween(s.srs.dueAt, input.date) : 0;
    };
    // One small thing: the most overdue easy re-solve (it fits the 15 minutes), else the most
    // overdue medium one.
    const pick = [...due].sort(
      (a, x) =>
        Number(a.difficulty !== "easy") - Number(x.difficulty !== "easy") ||
        late(x) - late(a) ||
        a.rank - x.rank,
    )[0];
    if (pick) {
      b.add(pick);
      return;
    }
  }
  if (available.has("review-concept")) {
    const pool = reviewConcepts(ctx).filter((r) => !b.taken.has(r.concept.id));
    if (pool.length > 0) {
      b.add(bundleCandidate(pool.slice(0, 3), input.date, 0));
      return;
    }
  }
  if (available.has("drill") && !b.has("drill")) b.add(drillCandidates(ctx)[0]!);
}

/**
 * Plans the day: the new items to add next to `kept` (items the owner added, and everything done
 * or skipped today, which stay as they are). Kept items count toward the budget and are never
 * planned again.
 */
export function planDay(input: PlannerInput, kept: readonly PlanItem[] = []): PlanItem[] {
  const ctx = context(input);
  const budget = input.minimumDay ? MINIMUM_DAY_MINUTES : Math.max(0, input.budget);
  const b = new PlanBuilder(budget, kept);
  const can = (k: PlanKind) => input.available.has(k);

  if (input.minimumDay || budget <= MINIMUM_DAY_MINUTES) {
    minimumDay(ctx, b);
    return finish(b);
  }

  // 6. Revision sheet every day near the interview.
  if (ctx.near && can("revision") && !b.has("revision")) b.tryFirst(revisionCandidates(ctx));

  // 2. Daily staples.
  if (budget >= STAPLES_MIN_BUDGET) {
    if (can("drill") && !b.has("drill")) b.tryFirst(drillCandidates(ctx));
    if (input.track !== "sde" && can("mental-math") && !b.has("mental-math"))
      b.tryFirst(mentalMathCandidates());
  }

  // 5. Weekly extras (each has narrow conditions and happens at most once or twice a week).
  //    Usually before the reviews, so a day of many small re-solves doesn't crowd them out; within
  //    14 days of the interview after them, because then reviews come first (step 6).
  const extras = () => {
    // Near the interview the short story practice goes first; it's meant for those weeks.
    const order = ctx.near
      ? (["story", "mock", "design"] as const)
      : (["mock", "design", "story"] as const);
    for (const kind of order) {
      if (can(kind) && !b.has(kind)) b.tryFirst(extraCandidates(ctx, kind, budget));
    }
  };
  if (!ctx.near) extras();

  // 3. Reviews block.
  const cap = budget * (ctx.near ? REVIEW_SHARE_NEAR : REVIEW_SHARE);
  let block = kept
    .filter((i) => !i.skipped && (i.kind === "resolve" || i.kind === "review-concept"))
    .reduce((n, i) => n + i.estMinutes, 0);
  // Slots stay free for a flashcard bundle and one learning item, so a long list of short
  // re-solves can't fill all 8 places on its own.
  const learnList = can("learn-concept") ? learnCandidates(ctx) : [];
  const problemList = can("new-problem") ? newProblemCandidates(ctx) : [];
  const reserved =
    (can("review-concept") && !b.has("review-concept") && bundleCandidates(ctx).length ? 1 : 0) +
    (learnList.length || problemList.length ? 1 : 0);
  if (can("resolve")) {
    let first = !b.has("resolve");
    for (const c of resolveCandidates(ctx)) {
      if (!b.fits(c)) continue;
      if (!first && b.count >= MAX_ITEMS - reserved) break;
      if (block + c.estMinutes <= cap || first) {
        b.add(c);
        block += c.estMinutes;
      }
      first = false;
    }
  }
  if (can("review-concept")) {
    // The first bundle always gets a place when it fits the day (fading concepts shouldn't wait
    // behind a long list of re-solves); later ones fit the reviews share, shrinking from 4
    // concepts to 3 when that is what fits.
    let first = !b.has("review-concept");
    const learningSlot = learnList.length || problemList.length ? 1 : 0;
    for (const c of bundleCandidates(ctx)) {
      if (!first && b.count >= MAX_ITEMS - learningSlot) break;
      const ids = c.refIds ?? [];
      const sizes = ids.length === 4 ? [4, 3] : [ids.length];
      for (const size of sizes) {
        const pick = size === ids.length ? c : shrinkBundle(ctx, c, size);
        if (!b.fits(pick) || (!first && block + pick.estMinutes > cap)) continue;
        b.add(pick);
        block += pick.estMinutes;
        break;
      }
      first = false;
    }
  }

  if (ctx.near) extras();

  // 4. New learning, split by the balance setting.
  const remaining = Math.max(0, budget - b.total);
  const share = input.balance.problems + input.balance.theory;
  const theoryShare = share > 0 ? input.balance.theory / share : 0.4;
  let theoryLeft = remaining * theoryShare;
  let problemsLeft = remaining - theoryLeft;
  const learnRoom = () => MAX_NEW_CONCEPTS - (b.kinds.get("learn-concept") ?? 0);
  const learn = learnList;
  const problems = problemList;
  while (b.total < budget) {
    const theoryFirst = theoryLeft > problemsLeft;
    const sides: ("theory" | "problems")[] = theoryFirst
      ? ["theory", "problems"]
      : ["problems", "theory"];
    let added = false;
    for (const side of sides) {
      if (side === "theory") {
        if (learnRoom() <= 0) continue;
        const c = learn.find((x) => b.fits(x));
        if (!c) continue;
        b.add(c);
        theoryLeft -= c.estMinutes;
      } else {
        const c = problems.find((x) => b.fits(x));
        if (!c) continue;
        b.add(c);
        problemsLeft -= c.estMinutes;
      }
      added = true;
      break;
    }
    if (!added) break;
  }

  // 7. Fit: fill toward 90% of the budget, then make sure there are a few items to choose from.
  const fillers = (): Candidate[][] => [
    can("resolve") ? resolveCandidates(ctx) : [],
    can("review-concept") ? bundleCandidates(ctx) : [],
    learnRoom() > 0 ? learn : [],
    problems,
    can("drill") && !b.has("drill") ? drillCandidates(ctx) : [],
  ];
  while (b.total < budget * 0.9 && b.count < MAX_ITEMS) {
    if (!fillers().some((list) => b.tryFirst(list))) break;
  }
  if (b.count < MIN_ITEMS) {
    const small = (): Candidate[] =>
      [
        ...(can("drill") && !b.has("drill") ? drillCandidates(ctx) : []),
        ...(can("review-concept") ? bundleCandidates(ctx) : []),
        ...(can("resolve") ? resolveCandidates(ctx) : []),
        ...problems,
        ...(learnRoom() > 0 ? learn : []),
      ].sort((a, x) => a.estMinutes - x.estMinutes);
    while (b.count < MIN_ITEMS && b.tryFirst(small())) {
      /* keep adding the smallest items that fit */
    }
  }
  return finish(b);
}

function finish(b: PlanBuilder): PlanItem[] {
  return b.items
    .map((c, i) => ({ c, i }))
    .sort((x, y) => KIND_ORDER[x.c.kind] - KIND_ORDER[y.c.kind] || x.i - y.i)
    .map(({ c }) => toItem(c));
}

// ----- swapping ----------------------------------------------------------------------------------

export const SWAP_OPTIONS = 3;

/**
 * Up to 3 alternatives of the same kind for one item, none already on the plan (done and skipped
 * items included), each short enough for the budget. Ones that keep the day within its ceiling
 * come first.
 */
export function swapOptions(
  input: PlannerInput,
  items: readonly PlanItem[],
  itemId: string,
): PlanItem[] {
  const item = items.find((i) => i.id === itemId);
  if (!item) return [];
  const ctx = context(input);
  const budget = input.minimumDay ? MINIMUM_DAY_MINUTES : input.budget;
  const taken = new Set<string>();
  for (const other of items) for (const r of refsOf(other)) taken.add(r);
  const planned = items
    .filter((i) => !i.skipped && i.id !== itemId)
    .reduce((n, i) => n + i.estMinutes, 0);
  const room = budgetCeiling(budget) - planned;

  let pool: Candidate[];
  switch (item.kind) {
    case "resolve":
      pool = resolveCandidates(ctx);
      break;
    case "review-concept":
      pool = bundleCandidates(ctx, taken);
      break;
    case "learn-concept":
      pool = learnCandidates(ctx);
      break;
    case "new-problem":
      pool = newProblemCandidates(ctx);
      break;
    case "revision":
      pool = revisionCandidates(ctx);
      break;
    case "design":
    case "mock":
    case "story":
      pool = extraCandidates(ctx, item.kind, Math.max(budget, EXTRAS_MIN_BUDGET));
      break;
    default:
      pool = [];
  }
  const options = pool.filter(
    (c) =>
      c.kind === item.kind &&
      refsOf(c).every((r) => !taken.has(r)) &&
      c.estMinutes <= Math.max(budget, item.estMinutes),
  );
  const fitting = options.filter((c) => c.estMinutes <= room);
  const rest = options.filter((c) => c.estMinutes > room);
  return [...fitting, ...rest].slice(0, SWAP_OPTIONS).map(toItem);
}

/** Replaces one item with a chosen alternative (same place in the list). */
export function applySwap(
  items: readonly PlanItem[],
  itemId: string,
  replacement: PlanItem,
): PlanItem[] {
  return items.map((i) =>
    i.id === itemId ? { ...replacement, done: false, skipped: false, origin: "planner" } : i,
  );
}

/** Items that stay when the plan is made again (a new budget, minimum day): done, skipped and
 *  the owner's own. */
export function keptOnReplan(items: readonly PlanItem[]): PlanItem[] {
  return items.filter((i) => i.done || i.skipped || i.origin !== "planner");
}

/** Planned minutes (skipped items don't count) and minutes done. */
export function planMinutes(items: readonly PlanItem[]): { planned: number; done: number } {
  let planned = 0;
  let done = 0;
  for (const i of items) {
    if (i.skipped) continue;
    planned += i.estMinutes;
    if (i.done) done += i.estMinutes;
  }
  return { planned, done };
}
