// Loads every store from the Repository: on start, after an import or a reset, and whenever
// another device changes synced data (artifact runtime). Concept statuses are refreshed once
// everything is loaded, so they reflect today's date and the latest attempts.
import { create } from "zustand";
import type { Repository } from "@/lib/storage/Repository";
import { detachActivity, hydrateActivity } from "./activityStore";
import { detachConceptNotes, hydrateConceptNotes } from "./conceptNoteStore";
import { detachConceptStates, hydrateConceptStates, refreshAllConcepts } from "./conceptStateStore";
import { detachCustomConcepts, hydrateCustomConcepts } from "./customConceptStore";
import { detachGeneratedDrills, hydrateGeneratedDrills } from "./drillStore";
import { clearInk } from "./inkStore";
import { detachMapOverrides, hydrateMapOverrides } from "./mapStore";
import { detachMentalMath, hydrateMentalMath } from "./mentalMathStore";
import { detachStories, hydrateStories } from "./storyStore";
import { detachDesigns, hydrateDesigns } from "./designStore";
import { detachMistakeTags, hydrateMistakeTags } from "./mistakeTagStore";
import { setPlanEffectsRepository } from "./planEffects";
import { detachPlan, hydratePlan } from "./planStore";
import { detachProblems, hydrateProblems } from "./problemStore";
import { detachProfile, hydrateProfile } from "./profileStore";

/** True once every store has loaded (the planner and the dashboard wait for it). */
export const useDataReady = create<{ ready: boolean }>(() => ({ ready: false }));

export async function hydrateAll(repository: Repository): Promise<void> {
  useDataReady.setState({ ready: false });
  setPlanEffectsRepository(repository);
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
    hydrateGeneratedDrills(repository),
    hydrateMentalMath(repository),
    hydrateStories(repository),
    hydrateDesigns(repository),
  ]);
  refreshAllConcepts();
  // Loading isn't a change the owner made: no ink for statuses that were already strong.
  clearInk();
  useDataReady.setState({ ready: true });
}

export function detachAll(): void {
  useDataReady.setState({ ready: false });
  setPlanEffectsRepository(null);
  detachProfile();
  detachActivity();
  detachProblems();
  detachMistakeTags();
  detachConceptStates();
  detachConceptNotes();
  detachCustomConcepts();
  detachMapOverrides();
  detachPlan();
  detachGeneratedDrills();
  detachMentalMath();
  detachStories();
  detachDesigns();
}
