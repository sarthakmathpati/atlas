// Focus layer settings (F31). Stored flags are optional, so profiles from before Phase 9 need
// no migration: a missing flag means on.
import type { FocusPrefs, Profile } from "@/lib/types";

export const DEFAULT_FOCUS_PREFS: Required<FocusPrefs> = {
  dim: true,
  holdNotices: true,
  breakView: true,
};

export function focusPrefs(
  prefs: Pick<Profile["prefs"], "focus"> | undefined,
): Required<FocusPrefs> {
  return { ...DEFAULT_FOCUS_PREFS, ...prefs?.focus };
}
