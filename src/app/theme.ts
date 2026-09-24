// Theme switching (F1, section 12.2). "system" follows prefers-color-scheme; "light" and "dark"
// set data-theme on <html>. The choice is mirrored to localStorage so index.html can apply it
// before the first paint (no flash); the Profile stores it for syncing across devices.
import { useProfileStore } from "@/stores/profileStore";

export type ThemeChoice = "system" | "light" | "dark";

const STORAGE_KEY = "atlas.theme";

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);
  try {
    localStorage.setItem(STORAGE_KEY, choice);
  } catch {
    /* storage can be blocked; the theme still applies for this visit */
  }
}

export function readStoredTheme(): ThemeChoice {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    /* ignore */
  }
  return "system";
}

/** Applies a theme now and saves it to the profile (when storage is ready). */
export function setTheme(choice: ThemeChoice): void {
  applyTheme(choice);
  useProfileStore.getState().update({ theme: choice });
}

/** The theme actually showing right now (resolves "system"). */
export function resolvedTheme(): "light" | "dark" {
  const forced = document.documentElement.getAttribute("data-theme");
  if (forced === "light" || forced === "dark") return forced;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Applies the reduced-motion override from Settings (F30). */
export function applyMotion(pref: "system" | "on" | "off"): void {
  const root = document.documentElement;
  if (pref === "on") root.dataset.motion = "reduce";
  else if (pref === "off") root.dataset.motion = "full";
  else delete root.dataset.motion;
}
