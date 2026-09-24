// Loads every store from the Repository: on start, after an import or a reset, and whenever
// another device changes synced data (artifact runtime). Concept statuses are refreshed once
// everything is loaded, so they reflect today's date and the latest attempts.
import type { Repository } from "@/lib/storage/Repository";
import { detachActivity, hydrateActivity } from "./activityStore";
import { detachConceptNotes, hydrateConceptNotes } from "./conceptNoteStore";
import { detachConceptStates, hydrateConceptStates, refreshAllConcepts } from "./conceptStateStore";
import { detachCustomConcepts, hydrateCustomConcepts } from "./customConceptStore";
import { clearInk } from "./inkStore";
import { detachMapOverrides, hydrateMapOverrides } from "./mapStore";
import { detachMistakeTags, hydrateMistakeTags } from "./mistakeTagStore";
import { detachPlan, hydratePlan } from "./planStore";
import { detachProblems, hydrateProblems } from "./problemStore";
import { detachProfile, hydrateProfile } from "./profileStore";

export async function hydrateAll(repository: Repository): Promise<void> {
  await Promise.all([
    hydrateProfile(repository),
    hydrateActivity(repository),
    hydrateCustomConcepts(repository),
    hydrateConceptStates(repository),
    hydrateConceptNotes(repository),
    hydrateProblems(repository),
    hydrateMistakeTags(repository),
    hydrateMapOverrides(repository),
    hydratePlan(repository),
  ]);
  refreshAllConcepts();
  // Loading isn't a change the owner made: no ink for statuses that were already strong.
  clearInk();
}

export function detachAll(): void {
  detachProfile();
  detachActivity();
  detachProblems();
  detachMistakeTags();
  detachConceptStates();
  detachConceptNotes();
  detachCustomConcepts();
  detachMapOverrides();
  detachPlan();
}
