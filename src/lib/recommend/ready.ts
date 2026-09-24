// "Ready to learn" (BUILD_SPEC.md 11.5). A concept is ready when it is not started, belongs to the
// track, every concept-level prerequisite is learning or strong, and at least 60% of the
// must-know concepts in each prerequisite topic are learning or strong. Prerequisites outside the
// owner's scope (another track, hidden, another language) are ignored, and a prerequisite topic
// with no must-know concepts in scope counts as satisfied.
import { conceptById, conceptsByTopic, subjectById, topicById } from "@/data/syllabus";
import { daysBetween } from "@/lib/time";
import type { Concept, Importance, Status, Track } from "@/lib/types";
import { subjectWeight } from "../readiness/score";

export const TOPIC_READY_SHARE = 0.6;
const IMPORTANCE_RANK: Record<Importance, number> = { must: 0, important: 1, advanced: 2 };

export interface ReadyContext {
  statusOf: (conceptId: string) => Status;
  /** In the owner's track, not hidden, and not another language's topic. */
  inScope: (concept: Concept) => boolean;
}

export const isLearnedStatus = (s: Status) => s === "learning" || s === "strong";

/** Why a concept is or isn't ready: the unmet prerequisites and topics. */
export interface Readiness {
  ready: boolean;
  missingConcepts: string[];
  /** Prerequisite topics below 60% of their must-know concepts learned. */
  missingTopics: { topicId: string; learned: number; total: number }[];
}

export function readiness(concept: Concept, ctx: ReadyContext): Readiness {
  const missingConcepts: string[] = [];
  for (const id of concept.prereqs) {
    const p = conceptById.get(id);
    if (!p || !ctx.inScope(p)) continue;
    if (!isLearnedStatus(ctx.statusOf(id))) missingConcepts.push(id);
  }
  const missingTopics: Readiness["missingTopics"] = [];
  for (const topicId of topicById.get(concept.topicId)?.prereqTopics ?? []) {
    const musts = (conceptsByTopic.get(topicId) ?? []).filter(
      (c) => c.importance === "must" && ctx.inScope(c),
    );
    if (musts.length === 0) continue;
    const learned = musts.filter((c) => isLearnedStatus(ctx.statusOf(c.id))).length;
    if (learned < TOPIC_READY_SHARE * musts.length) {
      missingTopics.push({ topicId, learned, total: musts.length });
    }
  }
  const ready =
    ctx.statusOf(concept.id) === "not_started" &&
    ctx.inScope(concept) &&
    missingConcepts.length === 0 &&
    missingTopics.length === 0;
  return { ready, missingConcepts, missingTopics };
}

export function isReady(concept: Concept, ctx: ReadyContext): boolean {
  return readiness(concept, ctx).ready;
}

export interface RankContext extends ReadyContext {
  track: Track;
  focusSubjects: readonly string[];
  /** Subject readiness 0 to 100 (section 11.3); missing subjects count as 0. */
  subjectReadiness: Readonly<Record<string, number>>;
  /** yyyy-mm-dd; advanced concepts are left out within 14 days of the interview. */
  today?: string;
  interviewDate?: string;
}

/**
 * Ready concepts, best first: must-know first, then focus subjects, then subjects with the most
 * to gain (weight × distance from ready), then learning order.
 */
export function rankReady(candidates: readonly Concept[], ctx: RankContext): Concept[] {
  const nearInterview =
    ctx.interviewDate && ctx.today ? daysBetween(ctx.today, ctx.interviewDate) <= 14 : false;
  const focus = new Set(ctx.focusSubjects);
  const gain = (c: Concept) =>
    subjectWeight(c.subjectId, ctx.track) * (1 - (ctx.subjectReadiness[c.subjectId] ?? 0) / 100);
  const topicOrder = (c: Concept) => topicById.get(c.topicId)?.order ?? 0;
  const subjectOrder = (c: Concept) => subjectById.get(c.subjectId)?.order ?? 0;
  return candidates
    .filter((c) => !(nearInterview && c.importance === "advanced") && isReady(c, ctx))
    .sort(
      (a, b) =>
        IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance] ||
        Number(focus.has(b.subjectId)) - Number(focus.has(a.subjectId)) ||
        gain(b) - gain(a) ||
        subjectOrder(a) - subjectOrder(b) ||
        topicOrder(a) - topicOrder(b) ||
        a.order - b.order,
    );
}
