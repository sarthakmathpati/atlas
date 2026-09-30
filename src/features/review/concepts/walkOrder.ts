// The memory walk's order for a flashcard session (F31): a topic's or a subject's concepts in the
// order of a nearest-neighbour walk over their places on the map (moved bubbles where the owner
// moved them; the owner's own concepts at their place, else their topic's).
import { positionOf } from "@/data/layout";
import { concepts as SYLLABUS_CONCEPTS } from "@/data/syllabus";
import { walkDeckOrder } from "@/lib/focus/walk";
import { MAX_SESSION_CARDS } from "@/lib/review/flashcards";
import type { Concept } from "@/lib/types";
import { findConcept } from "@/stores/customConceptStore";
import { useMapStore } from "@/stores/mapStore";

const syllabusIndex = new Map(SYLLABUS_CONCEPTS.map((c, i) => [c.id, i]));

/** Where a concept sits on the map: a moved bubble, its laid-out place, or its topic's. */
export function placeOf(id: string): { x: number; y: number } | undefined {
  const moved = useMapStore.getState().overrides[id];
  if (moved) return moved;
  const laid = positionOf(id);
  if (laid) return laid;
  const concept = findConcept(id);
  return concept ? positionOf(concept.topicId) : undefined;
}

/** The session's concepts in order: as given, or as a memory walk. */
export function sessionConcepts(ids: readonly string[], walk: boolean | undefined): Concept[] {
  const found = ids.map((id) => findConcept(id)).filter((c): c is Concept => Boolean(c));
  if (!walk) return found;
  const order = walkDeckOrder(
    found.map((c) => c.id),
    placeOf,
    (id) => syllabusIndex.get(id) ?? Number.MAX_SAFE_INTEGER,
    Math.min(found.length, MAX_SESSION_CARDS),
  );
  const byId = new Map(found.map((c) => [c.id, c]));
  return order.map((id) => byId.get(id)!);
}
