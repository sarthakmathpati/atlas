// Loads every store from the Repository: on start, after an import or a reset, and whenever
// another device changes synced data (artifact runtime).
import type { Repository } from "@/lib/storage/Repository";
import { detachActivity, hydrateActivity } from "./activityStore";
import { hydrateConceptStates } from "./conceptStateStore";
import { detachProfile, hydrateProfile } from "./profileStore";

export async function hydrateAll(repository: Repository): Promise<void> {
  await Promise.all([
    hydrateProfile(repository),
    hydrateActivity(repository),
    hydrateConceptStates(repository),
  ]);
}

export function detachAll(): void {
  detachProfile();
  detachActivity();
}
