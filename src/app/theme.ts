// Theme switching (F1, BUILD_SPEC.md 12.10.2). The choice is System, Day, Dusk, Night or "By time
// of day"; <html data-theme> always holds the theme showing (day, dusk or night). The choice and
// the schedule are mirrored to localStorage so index.html can apply them before the first paint
// (no flash); the Profile stores them for syncing across devices. While the app is open, the
// theme follows the device (System) or switches at the set times (By time of day), with a 200 ms
// cross-fade unless motion is reduced.
import { useEffect } from "react";
import { prefersReducedMotion } from "@/components/ui/hooks";
import {
  nextThemeSwitch,
  normalizeSchedule,
  normalizeThemeChoice,
  resolveTheme,
  type ThemeName,
} from "@/lib/theme";
import type { ThemeChoice, ThemeSchedule } from "@/lib/types";
import { useProfileStore } from "@/stores/profileStore";

export type { ThemeChoice };

const STORAGE_KEY = "atlas.theme";
const SCHEDULE_KEY = "atlas.themeSchedule";

export function readStoredTheme(): ThemeChoice {
  try {
    return normalizeThemeChoice(localStorage.getItem(STORAGE_KEY));
  } catch {
    return "system";
  }
}

export function readStoredSchedule(): ThemeSchedule {
  try {
    const raw = localStorage.getItem(SCHEDULE_KEY);
    return normalizeSchedule(raw ? JSON.parse(raw) : null);
  } catch {
    return normalizeSchedule(null);
  }
}

function storeTheme(choice: ThemeChoice, schedule: ThemeSchedule): void {
  try {
    localStorage.setItem(STORAGE_KEY, choice);
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(schedule));
  } catch {
    /* storage can be blocked; the theme still applies for this visit */
  }
}

export function systemPrefersDark(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function"
    ? window.matchMedia("(prefers-color-scheme: dark)").matches
    : false;
}

/** The theme showing right now. */
export function currentTheme(): ThemeName {
  const shown = document.documentElement.getAttribute("data-theme");
  return shown === "dusk" || shown === "night" ? shown : "day";
}

type TransitionDocument = Document & { startViewTransition?: (update: () => void) => unknown };

/** Shows a theme, cross-fading when it changes (12.10.9) unless motion is reduced. */
export function showTheme(name: ThemeName): void {
  const root = document.documentElement;
  if (root.getAttribute("data-theme") === name) return;
  const update = () => root.setAttribute("data-theme", name);
  const doc = document as TransitionDocument;
  // ADHD mode's calm screen keeps motion for feedback only: the theme changes at once.
  const calm = (root.getAttribute("data-adhd") ?? "").split(" ").includes("calm");
  if (root.hasAttribute("data-theme") && !document.hidden && !prefersReducedMotion() && !calm) {
    try {
      if (doc.startViewTransition) {
        doc.startViewTransition(update);
        return;
      }
    } catch {
      /* fall through to an instant switch */
    }
  }
  update();
}

/** Mirrors a choice to localStorage and shows the theme it resolves to now. */
export function applyTheme(
  choice: ThemeChoice,
  schedule: ThemeSchedule = readStoredSchedule(),
  now: Date = new Date(),
): ThemeName {
  const safe = normalizeSchedule(schedule);
  storeTheme(choice, safe);
  const name = resolveTheme(choice, { schedule: safe, now, prefersDark: systemPrefersDark() });
  showTheme(name);
  return name;
}

/** Applies a theme choice now and saves it to the profile (when storage is ready). */
export function setTheme(choice: ThemeChoice): void {
  const schedule = useProfileStore.getState().profile?.prefs.themeSchedule ?? readStoredSchedule();
  applyTheme(choice, schedule);
  useProfileStore.getState().update({ theme: choice });
}

/** Saves new start times for "By time of day" (and applies them when that's the choice). */
export function setThemeSchedule(schedule: ThemeSchedule): void {
  const choice = useProfileStore.getState().profile?.theme ?? readStoredTheme();
  applyTheme(choice, schedule);
  useProfileStore.getState().updatePrefs({ themeSchedule: normalizeSchedule(schedule) });
}

/** Longest delay setTimeout accepts; later switches are re-armed when it fires. */
const MAX_DELAY = 2 ** 31 - 1;

/**
 * Keeps the showing theme right while the app is open: follows the device's light or dark
 * setting for System, and switches at the set times for By time of day (re-checked when the tab
 * comes back, since timers pause while a laptop sleeps).
 */
export function useThemeController(choice: ThemeChoice, schedule: ThemeSchedule): void {
  const { day, dusk, night } = schedule;
  useEffect(() => {
    const times: ThemeSchedule = { day, dusk, night };
    const apply = () => applyTheme(choice, times);
    apply();
    const cleanups: (() => void)[] = [];
    if (choice === "system" && typeof window.matchMedia === "function") {
      const query = window.matchMedia("(prefers-color-scheme: dark)");
      query.addEventListener?.("change", apply);
      cleanups.push(() => query.removeEventListener?.("change", apply));
    }
    if (choice === "schedule") {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const arm = () => {
        clearTimeout(timer);
        const wait = nextThemeSwitch(times, new Date()).getTime() - Date.now() + 250;
        timer = setTimeout(
          () => {
            apply();
            arm();
          },
          Math.min(Math.max(wait, 1000), MAX_DELAY),
        );
      };
      const onVisible = () => {
        if (document.hidden) return;
        apply();
        arm();
      };
      arm();
      document.addEventListener("visibilitychange", onVisible);
      cleanups.push(() => {
        clearTimeout(timer);
        document.removeEventListener("visibilitychange", onVisible);
      });
    }
    return () => cleanups.forEach((fn) => fn());
  }, [choice, day, dusk, night]);
}

/** Applies the reduced-motion override from Settings (F30). */
export function applyMotion(pref: "system" | "on" | "off"): void {
  const root = document.documentElement;
  if (pref === "on") root.dataset.motion = "reduce";
  else if (pref === "off") root.dataset.motion = "full";
  else delete root.dataset.motion;
}
