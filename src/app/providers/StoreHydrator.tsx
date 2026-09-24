// Fills the stores once storage is ready, keeps them in sync with other devices, and turns
// storage notices (quota, retries, read-only) into toasts.
import { useEffect } from "react";
import { hydrateActivity } from "@/stores/activityStore";
import { hydrateConceptStates } from "@/stores/conceptStateStore";
import { detachAll, hydrateAll } from "@/stores/hydrate";
import { hydrateProfile, useProfileStore } from "@/stores/profileStore";
import { toast } from "@/stores/toastStore";
import { applyMotion, applyTheme, readStoredTheme } from "../theme";
import { useServicesState } from "./servicesContext";

export function StoreHydrator() {
  const state = useServicesState();
  const repository = state.status === "ready" ? state.services.repository : null;

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
        else if (event.table === "conceptStates") void hydrateConceptStates(repository);
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

  return null;
}

/** Applies the profile's theme and motion settings (the profile syncs across devices). */
export function AppearanceSync() {
  const theme = useProfileStore((s) => s.profile?.theme);
  const motion = useProfileStore((s) => s.profile?.prefs.reducedMotion);
  useEffect(() => {
    if (theme && theme !== readStoredTheme()) applyTheme(theme);
  }, [theme]);
  useEffect(() => {
    if (motion) applyMotion(motion);
  }, [motion]);
  return null;
}
