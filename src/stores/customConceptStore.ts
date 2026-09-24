// The owner's own concepts (F2 "Add your own concept"), stored as CustomConcept records and
// exposed as full Concept objects. `findConcept` looks up any concept, seed or custom.
import { nanoid } from "nanoid";
import { useMemo } from "react";
import { create } from "zustand";
import { conceptById } from "@/data/syllabus";
import { CUSTOM_CONCEPT_PREFIX, customConceptMap } from "@/lib/concepts/custom";
import type { Repository } from "@/lib/storage/Repository";
import { nowIso } from "@/lib/time";
import type { Concept, CustomConcept, Importance } from "@/lib/types";
import { toast } from "./toastStore";

interface CustomConceptState {
  items: Record<string, CustomConcept>;
  /** The same records as Concept objects. */
  concepts: Record<string, Concept>;
  loaded: boolean;
}

export const useCustomConceptStore = create<CustomConceptState>(() => ({
  items: {},
  concepts: {},
  loaded: false,
}));

let repo: Repository | null = null;

function publish(items: Record<string, CustomConcept>) {
  useCustomConceptStore.setState({
    items,
    concepts: customConceptMap(Object.values(items)),
    loaded: true,
  });
}

export async function hydrateCustomConcepts(repository: Repository): Promise<void> {
  repo = repository;
  const list = await repository.customConcepts.list();
  publish(Object.fromEntries(list.map((c) => [c.id, c])));
}

export function detachCustomConcepts(): void {
  repo = null;
  useCustomConceptStore.setState({ items: {}, concepts: {}, loaded: false });
}

const saveFailed = () =>
  toast("Couldn't save that change. Check that storage is available, then try again.", {
    tone: "error",
  });

/** Any concept by id: the syllabus first, then the owner's own. */
export function findConcept(id: string): Concept | undefined {
  return conceptById.get(id) ?? useCustomConceptStore.getState().concepts[id];
}

export function useConcept(id: string | undefined): Concept | undefined {
  const custom = useCustomConceptStore((s) => (id ? s.concepts[id] : undefined));
  return id ? (conceptById.get(id) ?? custom) : undefined;
}

/** The owner's concepts in a topic, oldest first. */
export function useCustomConceptsIn(topicId: string): Concept[] {
  const concepts = useCustomConceptStore((s) => s.concepts);
  return useMemo(
    () =>
      Object.values(concepts)
        .filter((c) => c.topicId === topicId)
        .sort((a, b) => a.order - b.order),
    [concepts, topicId],
  );
}

export interface NewCustomConcept {
  topicId: string;
  name: string;
  scope: string;
  importance: Importance;
}

export function addCustomConcept(input: NewCustomConcept, now: Date = new Date()): string {
  const stamp = nowIso(now);
  const record: CustomConcept = {
    id: `${CUSTOM_CONCEPT_PREFIX}${nanoid(10)}`,
    topicId: input.topicId,
    name: input.name.trim(),
    scope: input.scope.trim(),
    importance: input.importance,
    createdAt: stamp,
    updatedAt: stamp,
  };
  publish({ ...useCustomConceptStore.getState().items, [record.id]: record });
  repo?.customConcepts.put(record).catch(saveFailed);
  return record.id;
}

export function updateCustomConcept(
  id: string,
  changes: Partial<Pick<CustomConcept, "name" | "scope" | "importance">>,
): void {
  const current = useCustomConceptStore.getState().items[id];
  if (!current) return;
  const next = { ...current, ...changes, updatedAt: nowIso() };
  publish({ ...useCustomConceptStore.getState().items, [id]: next });
  repo?.customConcepts.put(next).catch(saveFailed);
}

/** Deletes one of the owner's concepts. Returns the record, for Undo. */
export function deleteCustomConcept(id: string): CustomConcept | null {
  const { items } = useCustomConceptStore.getState();
  const current = items[id];
  if (!current) return null;
  const rest = { ...items };
  delete rest[id];
  publish(rest);
  repo?.customConcepts.delete(id).catch(saveFailed);
  return current;
}

export function restoreCustomConcept(record: CustomConcept): void {
  publish({ ...useCustomConceptStore.getState().items, [record.id]: record });
  repo?.customConcepts.put(record).catch(saveFailed);
}
