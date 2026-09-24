// The owner's profile and preferences (F24), hydrated from the Repository once storage is ready.
// Updates apply at once (optimistic) and are written through the Repository in the background.
import { create } from "zustand";
import type { Repository } from "@/lib/storage/Repository";
import { nowIso } from "@/lib/time";
import type { Profile } from "@/lib/types";
import { toast } from "./toastStore";

interface ProfileState {
  profile: Profile | null;
  update: (changes: Partial<Profile>) => void;
  updatePrefs: (changes: Partial<Profile["prefs"]>) => void;
}

let repo: Repository | null = null;

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: null,
  update: (changes) => {
    const current = get().profile;
    if (!current) return;
    set({ profile: { ...current, ...changes, updatedAt: nowIso() } });
    if (!repo) return;
    repo.profile.patch(changes).catch(() => {
      toast("Couldn't save that change. Check that storage is available, then try again.", {
        tone: "error",
      });
    });
  },
  updatePrefs: (changes) => {
    const current = get().profile;
    if (!current) return;
    get().update({ prefs: { ...current.prefs, ...changes } });
  },
}));

/** Loads the profile from storage (on start, after an import or reset, and on remote change). */
export async function hydrateProfile(repository: Repository): Promise<void> {
  repo = repository;
  const profile = (await repository.profile.get()) ?? null;
  useProfileStore.setState({ profile });
}

export function detachProfile(): void {
  repo = null;
  useProfileStore.setState({ profile: null });
}
