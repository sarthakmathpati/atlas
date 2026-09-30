// Closing the wrap-up note lasts for that night: the night's date is kept in this browser
// (atlas.wrapUp, a per-browser convenience; decision 28).
const KEY = "atlas.wrapUp";

export function wrapUpClosedFor(night: string | null): boolean {
  if (!night) return false;
  try {
    return localStorage.getItem(KEY) === night;
  } catch {
    return false;
  }
}

export function closeWrapUpFor(night: string): void {
  try {
    localStorage.setItem(KEY, night);
  } catch {
    /* only a convenience */
  }
}
