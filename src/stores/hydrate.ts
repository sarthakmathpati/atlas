// Loads every store from the Repository: on start, after an import or a reset, and whenever
// another device changes synced data (artifact runtime). Concept statuses are refreshed once
// everything is loaded, so they reflect today's date and the latest attempts.
import type { Repository } from "@/lib/storage/Repository";
import { detachActivity, hydrateActivity } from "./activityStore";
import { detachConceptStates, hydrateConceptStates, refreshAllConcepts } from "./conceptStateStore";
import { detachMistakeTags, hydrateMistakeTags } from "./mistakeTagStore";
import { detachProblems, hydrateProblems } from "./problemStore";
import { detachProfile, hydrateProfile } from "./profileStore";

export async function hydrateAll(repository: Repository): Promise<void> {
  await Promise.all([
    hydrateProfile(repository),
    hydrateActivity(repository),
    hydrateConceptStates(repository),
    hydrateProblems(repository),
    hydrateMistakeTags(repository),
  ]);
  refreshAllConcepts();
}

export function detachAll(): void {
  detachProfile();
  detachActivity();
  detachProblems();
  detachMistakeTags();
  detachConceptStates();
}
