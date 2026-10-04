// ADHD mode settings (F32). `Profile.prefs.adhd` is missing until the switch is first turned on,
// so profiles from before Phase 9.4 need no migration. Each part has its own flag; a missing
// flag means on (like the focus layer's prefs). Focus sound and Study with Claude start off,
// even in ADHD mode (12.10.10).
import type { AdhdPart, AdhdPrefs, Profile } from "@/lib/types";

/** The parts with their own switch, in the order of F32. */
export const ADHD_PARTS: readonly AdhdPart[] = [
  "calm",
  "nowCard",
  "time",
  "place",
  "rewards",
  "breaks",
  "startHelp",
  "reading",
  "gentle",
];

export const DEFAULT_ADHD: Readonly<AdhdPrefs> = {
  on: false,
  blockMinutes: 15,
  breakMinutes: 5,
  sound: "off",
  volume: 0.5,
  studyWithClaude: false,
};

/** What each part does, for Settings and the card shown the first time the mode is turned on. */
export const ADHD_PART_INFO: Record<AdhdPart, { label: string; description: string }> = {
  calm: {
    label: "Calm screen",
    description:
      "The sidebar shrinks to icons without badges or counts, extra cards fold behind Show more, text is one step larger, motion is kept for feedback and nothing is red.",
  },
  nowCard: {
    label: "The Now card",
    description:
      "Today shows one task at a time with small steps to tick, a 2-minute start, help when you're stuck, and the rest of the day folded away.",
  },
  time: {
    label: "Time you can see",
    description:
      "A shrinking disc on timed work, planned against actual minutes after each item, and estimates that learn your pace.",
  },
  place: {
    label: "Keep your place",
    description: "After 10 minutes or more away, a card shows where you left off.",
  },
  rewards: {
    label: "Rewards right away",
    description:
      "Each finished step drops ink on Today, and a finished day adds a flag to the week. Nothing is ever taken away.",
  },
  breaks: {
    label: "Breaks that work",
    description:
      "Shorter focus blocks with breaks after them, a movement idea on breaks, and a check-in after 90 minutes without one.",
  },
  startHelp: {
    label: "Starting help",
    description: "An if-then line on Today: when you'll start the first stop.",
  },
  reading: {
    label: "Reading support",
    description:
      "Lessons one part at a time with a quick check after each, read aloud, and an optional line focus.",
  },
  gentle: {
    label: "Gentle language",
    description:
      "Fresh start when reviews pile up, Welcome back after a gap, and no red for wrong or late.",
  },
};

export interface AdhdSettings extends Omit<AdhdPrefs, AdhdPart> {
  /** Every part's switch (whether or not the mode is on). */
  parts: Record<AdhdPart, boolean>;
}

/** The stored settings with every default filled in. */
export function adhdSettings(prefs: Pick<Profile["prefs"], "adhd"> | undefined): AdhdSettings {
  const stored: Partial<AdhdPrefs> = prefs?.adhd ?? {};
  const parts = Object.fromEntries(ADHD_PARTS.map((p) => [p, stored[p] !== false])) as Record<
    AdhdPart,
    boolean
  >;
  const rest = { ...DEFAULT_ADHD, ...stored };
  for (const p of ADHD_PARTS) delete (rest as Partial<AdhdPrefs>)[p];
  return { ...rest, parts };
}

/** True when ADHD mode is on and so is this part. */
export function adhdPartOn(
  prefs: Pick<Profile["prefs"], "adhd"> | undefined,
  part: AdhdPart,
): boolean {
  const adhd = prefs?.adhd;
  return Boolean(adhd?.on) && adhd?.[part] !== false;
}

/** True when ADHD mode is on. */
export function adhdOn(prefs: Pick<Profile["prefs"], "adhd"> | undefined): boolean {
  return Boolean(prefs?.adhd?.on);
}

/** The stored prefs after a change, starting from the defaults the first time. */
export function nextAdhdPrefs(
  current: AdhdPrefs | undefined,
  changes: Partial<AdhdPrefs>,
): AdhdPrefs {
  return { ...DEFAULT_ADHD, ...current, ...changes };
}

/**
 * The value of `<html data-adhd>`: the parts that are on, separated by spaces (CSS matches them
 * with `[data-adhd~="calm"]`), or null when the mode is off. The pre-paint script in index.html
 * reads the same value from localStorage, so the calm screen shows from the first paint.
 */
export function adhdAttribute(prefs: Pick<Profile["prefs"], "adhd"> | undefined): string | null {
  if (!adhdOn(prefs)) return null;
  return ADHD_PARTS.filter((p) => adhdPartOn(prefs, p)).join(" ");
}

/** A value read back from localStorage for the pre-paint script: only known part names. */
export function cleanAdhdAttribute(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const known = new Set<string>(ADHD_PARTS);
  return raw
    .split(/\s+/)
    .filter((p) => known.has(p))
    .join(" ");
}
