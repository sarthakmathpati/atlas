// Tracks which subjects' concept text has loaded (data/content.ts), so components re-render when
// it arrives. The hooks load a concept's subject on first use; a failed load (for example offline
// after an update) can be retried.
import { useEffect } from "react";
import { create } from "zustand";
import { conceptContentNow, loadSubjectContent } from "@/data/content";
import type { Concept, ConceptContent, SubjectId } from "@/lib/types";

interface ContentState {
  /** Bumped whenever a subject finishes loading. */
  version: number;
  failed: Readonly<Record<SubjectId, true>>;
}

export const useContentStore = create<ContentState>(() => ({ version: 0, failed: {} }));

export function ensureSubjectContent(subjectId: SubjectId): Promise<void> {
  if (useContentStore.getState().failed[subjectId]) {
    // Trying again: show loading rather than the error while it runs.
    useContentStore.setState((s) => {
      const failed = { ...s.failed };
      delete failed[subjectId];
      return { failed };
    });
  }
  return loadSubjectContent(subjectId).then(
    () => useContentStore.setState((s) => ({ version: s.version + 1 })),
    () => useContentStore.setState((s) => ({ failed: { ...s.failed, [subjectId]: true } })),
  );
}

export interface ContentResult<T> {
  /** Undefined while loading (or after a failed load). */
  value: T | undefined;
  failed: boolean;
  retry: () => void;
}

/** The text of several concepts, in the same order, once every one is available. */
export function useConceptContents(
  concepts: readonly Concept[],
): ContentResult<readonly ConceptContent[]> {
  useContentStore((s) => s.version);
  const failedMap = useContentStore((s) => s.failed);
  const now = concepts.map(conceptContentNow);
  const missing = [
    ...new Set(concepts.filter((_, i) => now[i] === undefined).map((c) => c.subjectId)),
  ];
  const failed = missing.some((id) => failedMap[id]);
  const key = missing.join(",");
  useEffect(() => {
    if (!key || failed) return;
    for (const id of key.split(",")) void ensureSubjectContent(id);
  }, [key, failed]);
  const value = missing.length === 0 ? (now as ConceptContent[]) : undefined;
  return {
    value,
    failed,
    retry: () => {
      for (const id of missing) void ensureSubjectContent(id);
    },
  };
}

/** One concept's text; undefined concept gives undefined. */
export function useConceptContent(concept: Concept | undefined): ContentResult<ConceptContent> {
  const result = useConceptContents(concept ? [concept] : NONE);
  return { ...result, value: concept ? result.value?.[0] : undefined };
}

const NONE: readonly Concept[] = [];
