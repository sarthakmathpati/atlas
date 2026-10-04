// ADHD mode (F32): the switch and its parts, stored in Profile.prefs.adhd (synced with the
// profile), and the card that lists what changed the first time the mode is turned on.
import { create } from "zustand";
import {
  adhdOn,
  adhdPartOn,
  adhdSettings,
  nextAdhdPrefs,
  type AdhdSettings,
} from "@/lib/adhd/prefs";
import { nowIso } from "@/lib/time";
import type { AdhdPart, AdhdPrefs } from "@/lib/types";
import { useProfileStore } from "./profileStore";

interface AdhdUiState {
  /** The "ADHD mode is on" card that lists what changed. */
  introOpen: boolean;
}

export const useAdhdUi = create<AdhdUiState>(() => ({ introOpen: false }));

function storedAdhd(): AdhdPrefs | undefined {
  return useProfileStore.getState().profile?.prefs.adhd;
}

/** Changes ADHD mode's settings (the profile saves and syncs them). */
export function setAdhd(changes: Partial<AdhdPrefs>): void {
  const store = useProfileStore.getState();
  if (!store.profile) return;
  store.updatePrefs({ adhd: nextAdhdPrefs(storedAdhd(), changes) });
}

/** Turns one part on or off. */
export function setAdhdPart(part: AdhdPart, on: boolean): void {
  setAdhd({ [part]: on });
}

/**
 * The switch: on or off. The first time it's turned on, the card listing what changed opens
 * (and is remembered as seen).
 */
export function setAdhdOn(on: boolean): void {
  const first = on && !storedAdhd()?.introSeenAt;
  setAdhd(first ? { on, introSeenAt: nowIso() } : { on });
  if (first) useAdhdUi.setState({ introOpen: true });
}

export function closeAdhdIntro(): void {
  useAdhdUi.setState({ introOpen: false });
}

/** True when ADHD mode is on (outside React). */
export function adhdModeOn(): boolean {
  return adhdOn(useProfileStore.getState().profile?.prefs);
}

/** True when ADHD mode and this part are on (outside React). */
export function adhdPart(part: AdhdPart): boolean {
  return adhdPartOn(useProfileStore.getState().profile?.prefs, part);
}

/** Every setting with its default, re-rendering when they change. */
export function useAdhd(): AdhdSettings {
  const adhd = useProfileStore((s) => s.profile?.prefs.adhd);
  return adhdSettings({ adhd });
}

export function useAdhdOn(): boolean {
  return useProfileStore((s) => adhdOn(s.profile?.prefs));
}

/** True when ADHD mode and this part are on. */
export function useAdhdPart(part: AdhdPart): boolean {
  return useProfileStore((s) => adhdPartOn(s.profile?.prefs, part));
}
