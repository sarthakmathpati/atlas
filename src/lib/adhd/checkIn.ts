// Breaks that work (F32, part 6): after 90 minutes of activity without a break, a gentle
// check-in, "Time for water and a stretch?", at most once every 90 minutes. Activity is time the
// activity clock counts (focus blocks, attempt and design timers, the Now card's clock). A focus
// break, or a pause of at least the break's length with nothing running, starts a fresh stretch.
export const CHECK_IN_AFTER_MS = 90 * 60_000;
/** The check-in shows at most once in this long. */
export const CHECK_IN_EVERY_MS = 90 * 60_000;

export interface ActivityStretch {
  /** Activity counted in this stretch. */
  ms: number;
  /** When activity was last counted (ms since epoch). */
  lastAt: number;
  /** When the check-in last showed (ms since epoch). */
  shownAt?: number;
}

export function emptyStretch(now: number): ActivityStretch {
  return { ms: 0, lastAt: now };
}

/**
 * Adds counted activity. When nothing was counted for `breakMs` or longer since the last
 * activity, that pause was a break and the stretch starts again.
 */
export function addActivity(
  stretch: ActivityStretch,
  countedMs: number,
  now: number,
  breakMs: number,
): ActivityStretch {
  const paused = now - countedMs - stretch.lastAt >= breakMs;
  return {
    ...stretch,
    ms: (paused ? 0 : stretch.ms) + countedMs,
    lastAt: now,
  };
}

/** A break was taken (a focus break started): the next stretch starts from zero. */
export function afterBreak(stretch: ActivityStretch, now: number): ActivityStretch {
  return { ...stretch, ms: 0, lastAt: now };
}

/** The check-in is due: 90 minutes without a break, and not shown in the last 90 minutes. */
export function checkInDue(stretch: ActivityStretch, now: number, breakMs: number): boolean {
  if (now - stretch.lastAt >= breakMs) return false;
  if (stretch.ms < CHECK_IN_AFTER_MS) return false;
  return stretch.shownAt === undefined || now - stretch.shownAt >= CHECK_IN_EVERY_MS;
}
