// Cached concept statuses (section 4.2 ConceptState.status). Phase 4 adds the mastery engine that
// recomputes them; until then the cached value (for example from an imported backup) is shown.
import { create } from "zustand";
import type { Repository } from "@/lib/storage/Repository";
import type { ConceptState, Status } from "@/lib/types";

interface ConceptStateStore {
  states: Record<string, ConceptState>;
}

export const useConceptStateStore = create<ConceptStateStore>(() => ({ states: {} }));

export async function hydrateConceptStates(repository: Repository): Promise<void> {
  const list = await repository.conceptStates.list();
  const states: Record<string, ConceptState> = {};
  for (const s of list) states[s.conceptId] = s;
  useConceptStateStore.setState({ states });
}

/** One concept's status; re-renders only when that concept's status changes. */
export function useConceptStatus(conceptId: string): Status {
  return useConceptStateStore((s) => s.states[conceptId]?.status ?? "not_started");
}
