// Fills the stores once storage is ready, keeps them in sync with other devices, and turns
// storage notices (quota, retries, read-only) into toasts.
import { useEffect } from "react";
import { hydrateActivity } from "@/stores/activityStore";
import { attachAI, detachAI } from "@/stores/aiStore";
import { useClockStore, tickClock } from "@/stores/clockStore";
import { flushNotes, hydrateConceptNotes } from "@/stores/conceptNoteStore";
import { hydrateConceptStates, refreshAllConcepts } from "@/stores/conceptStateStore";
import { hydrateCustomConcepts } from "@/stores/customConceptStore";
import { hydrateGeneratedDrills } from "@/stores/drillStore";
import { hydrateMapOverrides } from "@/stores/mapStore";
import { hydrateMentalMath } from "@/stores/mentalMathStore";
import { hydrateStories } from "@/stores/storyStore";
import { hydrateDesigns } from "@/stores/designStore";
import { hydrateMocks } from "@/stores/mockStore";
import { hydratePlan } from "@/stores/planStore";
import { detachAll, hydrateAll } from "@/stores/hydrate";
import { hydrateProfile, useProfileStore } from "@/stores/profileStore";
import { toast } from "@/stores/toastStore";
import { applyMotion, readStoredSchedule, readStoredTheme, useThemeController } from "../theme";
import { useServicesState } from "./servicesContext";

export function StoreHydrator() {
  const state = useServicesState();
  const repository = state.status === "ready" ? state.services.repository : null;
  const ai = state.status === "ready" ? state.services.ai : null;

  useEffect(() => {
    if (!ai) return;
    void attachAI(ai);
    return () => detachAI();
  }, [ai]);

  useEffect(() => {
    if (!repository) return;
    hydrateAll(repository).catch((e: unknown) => {
      console.error("Loading saved data failed", e);
      toast("Some saved data couldn't be loaded. Reload the page to try again.", { tone: "error" });
    });
    const unsubscribe = repository.subscribe((event) => {
      if (event.type === "remote-change") {
        if (event.table === "profile") void hydrateProfile(repository);
        else if (event.table === "activity") void hydrateActivity(repository);
        else if (event.table === "conceptStates" || event.table === "checks")
          void hydrateConceptStates(repository);
        else if (event.table === "conceptNotes") void hydrateConceptNotes(repository);
        else if (event.table === "customConcepts") void hydrateCustomConcepts(repository);
        else if (event.table === "mapOverrides") void hydrateMapOverrides(repository);
        else if (event.table === "dayPlans") void hydratePlan(repository);
        else if (event.table === "generatedDrills") void hydrateGeneratedDrills(repository);
        else if (event.table === "mentalMath") void hydrateMentalMath(repository);
        else if (event.table === "stories") void hydrateStories(repository);
        else if (event.table === "designs") void hydrateDesigns(repository);
        else if (event.table === "mocks") void hydrateMocks(repository);
        return;
      }
      toast(event.message, {
        tone: event.level === "error" ? "error" : "neutral",
        id: `storage-${event.code}`,
      });
    });
    const unwatch = repository.watch("profile", "profile");
    return () => {
      unsubscribe();
      unwatch();
      detachAll();
    };
  }, [repository]);

  // Today's plan syncs live across devices; after midnight the new day's plan is watched.
  const today = useClockStore((s) => s.today);
  useEffect(() => {
    if (!repository) return;
    return repository.watch("dayPlans", today);
  }, [repository, today]);

  // A new day: statuses can turn fading and new problems become due.
  useEffect(() => {
    const check = () => tickClock();
    const id = setInterval(check, 60_000);
    // Leaving or hiding the page writes what is still waiting (notes, then the storage debounce),
    // so a reload right after an exchange keeps it.
    const flushAll = () => {
      flushNotes();
      void repository?.flush();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
      else flushAll();
    };
    window.addEventListener("pagehide", flushAll);
    document.addEventListener("visibilitychange", onVisible);
    const unsubscribe = useClockStore.subscribe((state, prev) => {
      if (state.today === prev.today) return;
      refreshAllConcepts();
      if (repository) void hydratePlan(repository, state.today);
    });
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pagehide", flushAll);
      unsubscribe();
    };
  }, [repository]);

  return null;
}

/**
 * Applies the profile's theme and motion settings (the profile syncs across devices). Until the
 * profile loads, the choice mirrored in localStorage (the one index.html applied) keeps showing.
 */
export function AppearanceSync() {
  const theme = useProfileStore((s) => s.profile?.theme) ?? readStoredTheme();
  const schedule = useProfileStore((s) => s.profile?.prefs.themeSchedule) ?? readStoredSchedule();
  const motion = useProfileStore((s) => s.profile?.prefs.reducedMotion);
  useThemeController(theme, schedule);
  useEffect(() => {
    if (motion) applyMotion(motion);
  }, [motion]);
  return null;
}
