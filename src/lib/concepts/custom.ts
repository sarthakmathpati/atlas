// Concepts the owner adds to a topic (F2 "Add your own concept"). They are stored as
// CustomConcept records and turned into full Concept objects here, so the map, the concept panel,
// statuses and search treat them like any other bubble. Their text is the owner's own note.
import { conceptsByTopic, topicById } from "@/data/syllabus";
import type { Concept, CustomConcept } from "@/lib/types";

export const CUSTOM_CONCEPT_PREFIX = "custom.";
export const CUSTOM_CONCEPT_MINUTES = 25;

export function isCustomConceptId(id: string): boolean {
  return id.startsWith(CUSTOM_CONCEPT_PREFIX);
}

/** A custom concept as a Concept, placed after the topic's own concepts (in the order added). */
export function customToConcept(custom: CustomConcept, indexInTopic = 0): Concept | undefined {
  const topic = topicById.get(custom.topicId);
  if (!topic) return undefined;
  const name = custom.name.trim();
  return {
    id: custom.id,
    topicId: topic.id,
    subjectId: topic.subjectId,
    name,
    scope: custom.scope.trim() || name,
    importance: custom.importance,
    tracks: topic.tracks,
    order: (conceptsByTopic.get(topic.id)?.length ?? 0) + indexInTopic,
    prereqs: [],
    related: [],
    estMinutes: CUSTOM_CONCEPT_MINUTES,
    isPattern: false,
    content: { simple: "", interview: [], questions: [] },
  };
}

/** Every custom concept as a Concept, keyed by id (topics' own order, oldest first). */
export function customConceptMap(list: readonly CustomConcept[]): Record<string, Concept> {
  const out: Record<string, Concept> = {};
  const perTopic = new Map<string, number>();
  const sorted = [...list].sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : a.id.localeCompare(b.id),
  );
  for (const c of sorted) {
    const i = perTopic.get(c.topicId) ?? 0;
    const concept = customToConcept(c, i);
    if (!concept) continue;
    perTopic.set(c.topicId, i + 1);
    out[c.id] = concept;
  }
  return out;
}
