// "Breathe for a minute" (F31, 12.10.9): a ring grows for 5 seconds and shrinks for 5, six
// times (about six breaths a minute). With reduced motion the ring stays still and a text count
// carries the rhythm instead.
export const BREATH_PHASE_MS = 5_000;
export const BREATHS = 6;
export const BREATHING_MS = BREATHS * 2 * BREATH_PHASE_MS;

export interface BreathingMoment {
  done: boolean;
  /** Which breath, 1 to 6. */
  breath: number;
  phase: "in" | "out";
  /** The second of the phase, 1 to 5 (the text count). */
  second: number;
}

export function breathingAt(elapsedMs: number): BreathingMoment {
  if (elapsedMs >= BREATHING_MS) return { done: true, breath: BREATHS, phase: "out", second: 5 };
  const t = Math.max(0, elapsedMs);
  const breath = Math.floor(t / (2 * BREATH_PHASE_MS)) + 1;
  const inBreath = t % (2 * BREATH_PHASE_MS);
  const phase = inBreath < BREATH_PHASE_MS ? "in" : "out";
  const second = Math.floor((inBreath % BREATH_PHASE_MS) / 1000) + 1;
  return { done: false, breath, phase, second };
}
