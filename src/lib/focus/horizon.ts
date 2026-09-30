// The horizon line (F31, 12.10.9): a 2 px line that shrinks from full width to nothing over a
// focus block or a timed round. It moves in 5-second steps (never animated) and turns dotted
// near the end: the last 2 minutes of a block, or the last quarter of a shorter round.
export const HORIZON_STEP_MS = 5_000;
export const HORIZON_DOTTED_MS = 2 * 60_000;

/** Time left as the line shows it: the elapsed time is counted in whole 5-second steps. */
export function horizonRemainingMs(elapsedMs: number, totalMs: number): number {
  if (totalMs <= 0) return 0;
  const stepped = Math.floor(Math.max(0, elapsedMs) / HORIZON_STEP_MS) * HORIZON_STEP_MS;
  return Math.max(0, totalMs - stepped);
}

/** How much of the line is left, from 1 (just started) to 0 (time is up). */
export function horizonFraction(elapsedMs: number, totalMs: number): number {
  if (totalMs <= 0) return 0;
  return horizonRemainingMs(elapsedMs, totalMs) / totalMs;
}

/** From how much time left the line is dotted: 2 minutes, or a quarter of a shorter round. */
export function dottedFromMs(totalMs: number): number {
  return Math.min(HORIZON_DOTTED_MS, totalMs / 4);
}

export function horizonDotted(elapsedMs: number, totalMs: number): boolean {
  const left = horizonRemainingMs(elapsedMs, totalMs);
  return left > 0 && left <= dottedFromMs(totalMs);
}
