// Theme switching (F1, section 12.2). "system" follows prefers-color-scheme; "light" and "dark"
// set data-theme on <html>. The choice is mirrored to localStorage so index.html can apply it
// before the first paint (no flash); the Profile stores it for syncing across devices.
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
