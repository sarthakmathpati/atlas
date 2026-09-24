// Typed access to the generated syllabus (built from content/ by scripts/build-syllabus.mjs),
// plus the lookup indexes every feature needs. Built once at module load.
import raw from "./syllabus.generated.json";
import type { Concept, ConceptId, Subject, SubjectId, Syllabus, Topic, TopicId } from "@/lib/types";

export const syllabus = raw as Syllabus;

export const subjects: readonly Subject[] = syllabus.subjects;
export const topics: readonly Topic[] = syllabus.topics;
export const concepts: readonly Concept[] = syllabus.concepts;

export const subjectById: ReadonlyMap<SubjectId, Subject> = new Map(subjects.map((s) => [s.id, s]));
export const topicById: ReadonlyMap<TopicId, Topic> = new Map(topics.map((t) => [t.id, t]));
export const conceptById: ReadonlyMap<ConceptId, Concept> = new Map(concepts.map((c) => [c.id, c]));

function groupBy<T, K>(items: readonly T[], key: (item: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = out.get(k);
    if (list) list.push(item);
    else out.set(k, [item]);
  }
  return out;
}

/** Topics of each subject, in learning order. */
export const topicsBySubject: ReadonlyMap<SubjectId, Topic[]> = groupBy(topics, (t) => t.subjectId);
/** Concepts of each topic, in learning order. */
export const conceptsByTopic: ReadonlyMap<TopicId, Concept[]> = groupBy(concepts, (c) => c.topicId);
/** Concepts of each subject, in learning order. */
export const conceptsBySubject: ReadonlyMap<SubjectId, Concept[]> = groupBy(
  concepts,
  (c) => c.subjectId,
);

/** For each concept, the concepts that list it as a prerequisite ("Unlocks"). */
export const dependentsOf: ReadonlyMap<ConceptId, ConceptId[]> = (() => {
  const map = new Map<ConceptId, ConceptId[]>();
  for (const c of concepts) {
    for (const p of c.prereqs) {
      const list = map.get(p);
      if (list) list.push(c.id);
      else map.set(p, [c.id]);
    }
  }
  return map;
})();

export const patternConcepts: readonly Concept[] = concepts.filter((c) => c.isPattern);

/** Whether the simple level, interview points and questions are written (data/content.ts has the text). */
export function hasCoreContent(concept: Concept): boolean {
  return concept.written.core;
}
