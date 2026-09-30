// Hooks for the focus layer (F31): the block's state, whether notices are held, a slow clock,
// and the line a page suggests for the next block.
import { useEffect, useState } from "react";
import { wrapUpDue, wrapUpNight } from "@/lib/focus/bedtime";
import { thoughtsBack } from "@/lib/focus/park";
import { focusPrefs } from "@/lib/focus/prefs";
import { backupReminderDue } from "@/features/settings/backup";
import { blockRunning, useFocusLineStore, useFocusTimerStore } from "@/stores/focusTimerStore";
import { useParkStore } from "@/stores/parkStore";
import { useProfileStore } from "@/stores/profileStore";
import { wrapUpClosedFor } from "./wrapUp";

/**
 * Re-renders every `ms` while `active` (the horizon line uses 5 s). Until the first tick after
 * becoming active, the time from the last render is returned; callers clamp elapsed times at 0.
 */
export function useTicker(ms: number, active = true): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms, active]);
  return now;
}

/** True while notices wait for the break (a block runs and "hold notices" is on). */
export function useHoldingNotices(): boolean {
  const running = useFocusTimerStore((s) => blockRunning(s));
  const shown = useFocusTimerStore((s) => s.heldShown);
  const hold = useProfileStore((s) => focusPrefs(s.profile?.prefs).holdNotices);
  return running && hold && !shown;
}

/** The lens dims the screen around the work while a block runs ("dim" on). */
export function useLensOn(): boolean {
  const running = useFocusTimerStore((s) => blockRunning(s));
  const dim = useProfileStore((s) => focusPrefs(s.profile?.prefs).dim);
  return running && dim;
}

/**
 * Everything waiting for the break: held toasts, the backup reminder, parked thoughts whose time
 * came, and the wrap-up note.
 */
export function useHeldCount(): number {
  const holding = useHoldingNotices();
  const toasts = useFocusTimerStore((s) => s.held.length);
  const profile = useProfileStore((s) => s.profile);
  const thoughts = useParkStore((s) => s.thoughts);
  const now = useTicker(30_000, holding);
  if (!holding) return 0;
  const date = new Date(now);
  const back = thoughtsBack(Object.values(thoughts), date).length;
  const backup = profile && backupReminderDue(profile) ? 1 : 0;
  const bedtime = profile?.prefs.bedtime;
  const wrap = wrapUpDue(bedtime, date) && !wrapUpClosedFor(wrapUpNight(bedtime, date)) ? 1 : 0;
  return toasts + back + backup + wrap;
}

/**
 * The line this page suggests for a focus block ("Solve 1. Two Sum"), and the problem or concept
 * it's about, so a matching plan item's line is used instead.
 */
export function usePageFocusLine(line: string, refId: string | null = null): void {
  useEffect(() => {
    useFocusLineStore.setState({ line, refId });
    return () => {
      const s = useFocusLineStore.getState();
      if (s.line === line && s.refId === refId)
        useFocusLineStore.setState({ line: "", refId: null });
    };
  }, [line, refId]);
}
