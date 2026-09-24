// Onboarding self-assessment (F5, step 4). Per subject the owner says "Haven't started", "Some" or
// "Comfortable" and ticks the topics they know:
//   - ticked under "Some":        selfAssessed = 0.3 (the concepts show as learning);
//   - ticked under "Comfortable": selfAssessed = 0.5, and a concept review is scheduled so quick
//     checks verify it before anything turns green. Nothing turns strong from this alone.
// Reviews are spread out: at most 15 a day from tomorrow, must-know concepts first, so the owner
// isn't flooded. Re-running onboarding recomputes selfAssessed from the new answers; schedules
// that already exist are kept.
import { conceptsByTopic, subjectById, topicById, topicsBySubject } from "@/data/syllabus";
import { addDaysToDate, nowIso } from "@/lib/time";
import type { Concept, ConceptState, Importance, SubjectId, TopicId } from "@/lib/types";
import { createConceptState } from "../storage/defaults";

export type AssessLevel = "none" | "some" | "comfortable";

export interface SubjectAssessment {
  level: AssessLevel;
  /** Topics the owner ticked (only meaningful for "some" and "comfortable"). */
  topics: TopicId[];
}

export type SelfAssessment = Record<SubjectId, SubjectAssessment>;

export const MAX_REVIEWS_PER_DAY = 15;
export const SELF_ASSESSED: Record<Exclude<AssessLevel, "none">, 0.3 | 0.5> = {
  some: 0.3,
  comfortable: 0.5,
};

const IMPORTANCE_RANK: Record<Importance, number> = { must: 0, important: 1, advanced: 2 };

/** The answers implied by stored progress, so re-running onboarding starts from them. */
export function assessmentFromStates(
  states: Readonly<Record<string, ConceptState>>,
): SelfAssessment {
  const out: SelfAssessment = {};
  for (const [subjectId, topicList] of topicsBySubject) {
    const some: TopicId[] = [];
    const comfortable: TopicId[] = [];
    for (const t of topicList) {
      const values = (conceptsByTopic.get(t.id) ?? []).map((c) => states[c.id]?.selfAssessed);
      if (values.includes(0.5)) comfortable.push(t.id);
      else if (values.includes(0.3)) some.push(t.id);
    }
    out[subjectId] = comfortable.length
      ? { level: "comfortable", topics: [...comfortable, ...some] }
      : some.length
        ? { level: "some", topics: some }
        : { level: "none", topics: [] };
  }
  return out;
}

export interface SelfAssessPlan {
  /** Concept states to write (only the ones that change). */
  changed: ConceptState[];
  /** How many concept reviews were scheduled, and over how many days. */
  scheduled: number;
  days: number;
  learning: number;
}

export interface SelfAssessOptions {
  today: string;
  now?: Date;
  /** Concepts outside the owner's track or scope are skipped. */
  inScope: (concept: Concept) => boolean;
  maxPerDay?: number;
}

function compareConcepts(a: Concept, b: Concept): number {
  return (
    IMPORTANCE_RANK[a.importance] - IMPORTANCE_RANK[b.importance] ||
    (subjectById.get(a.subjectId)?.order ?? 0) - (subjectById.get(b.subjectId)?.order ?? 0) ||
    (topicById.get(a.topicId)?.order ?? 0) - (topicById.get(b.topicId)?.order ?? 0) ||
    a.order - b.order
  );
}

export function planSelfAssessment(
  assessment: SelfAssessment,
  states: Readonly<Record<string, ConceptState>>,
  options: SelfAssessOptions,
): SelfAssessPlan {
  const now = options.now ?? new Date();
  const stamp = nowIso(now);
  const maxPerDay = options.maxPerDay ?? MAX_REVIEWS_PER_DAY;

  // The new value for every concept in a ticked topic.
  const target = new Map<string, 0.3 | 0.5>();
  const concepts = new Map<string, Concept>();
  for (const [subjectId, answer] of Object.entries(assessment)) {
    if (answer.level === "none") continue;
    const value = SELF_ASSESSED[answer.level];
    for (const topicId of answer.topics) {
      const topic = topicById.get(topicId);
      if (!topic || topic.subjectId !== subjectId) continue;
      for (const c of conceptsByTopic.get(topicId) ?? []) {
        if (!options.inScope(c)) continue;
        target.set(c.id, value);
        concepts.set(c.id, c);
      }
    }
  }

  const next = new Map<string, ConceptState>();
  const edit = (id: string) => {
    let s = next.get(id);
    if (!s) {
      s = structuredClone(states[id] ?? createConceptState(id, now));
      next.set(id, s);
    }
    return s;
  };

  // Clear answers that were taken back.
  for (const [id, s] of Object.entries(states)) {
    if (s.selfAssessed !== undefined && !target.has(id)) delete edit(id).selfAssessed;
  }
  let learning = 0;
  for (const [id, value] of target) {
    learning++;
    if (states[id]?.selfAssessed !== value) edit(id).selfAssessed = value;
  }

  // Schedule reviews for "comfortable" concepts that aren't in review yet.
  const toSchedule = [...target]
    .filter(([id, v]) => v === 0.5 && states[id]?.srs.dueAt === undefined)
    .map(([id]) => concepts.get(id)!)
    .sort(compareConcepts);
  toSchedule.forEach((c, i) => {
    const s = edit(c.id);
    s.srs = {
      ...s.srs,
      step: 0,
      dueAt: addDaysToDate(options.today, 1 + Math.floor(i / maxPerDay)),
    };
  });

  const changed = [...next.values()].map((s) => ({ ...s, updatedAt: stamp }));
  return {
    changed,
    scheduled: toSchedule.length,
    days: Math.ceil(toSchedule.length / maxPerDay),
    learning,
  };
}
