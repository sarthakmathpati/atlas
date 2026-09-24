// The one decorative moment (section 12.6): when a concept turns strong, its bubble fills like ink
// and the lines to concepts it made ready draw in. Status refreshes note the concepts here; the
// map plays each one once, if the bubble is on screen within a minute of the change.

const FRESH_MS = 60_000;
const pending = new Map<string, number>();

export function noteInked(conceptIds: readonly string[], now = Date.now()): void {
  for (const id of conceptIds) pending.set(id, now);
}

/** True once per change, while it is fresh; the caller plays the animation. */
export function takeInk(conceptId: string, now = Date.now()): boolean {
  const at = pending.get(conceptId);
  if (at === undefined) return false;
  pending.delete(conceptId);
  return now - at <= FRESH_MS;
}

export function clearInk(): void {
  pending.clear();
}
