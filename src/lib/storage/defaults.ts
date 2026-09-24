// Factory functions for fresh records, so every new record starts complete and valid.
import { DEFAULT_TIER_MODELS, SCHEMA_VERSION } from "@/lib/constants";
import { nowIso } from "@/lib/time";
import type { ConceptState, MistakeTag, ProblemState, Profile, SrsState } from "@/lib/types";

export function createDefaultProfile(now: Date = new Date()): Profile {
  const stamp = nowIso(now);
  return {
    name: "",
    track: "both",
    primaryLanguage: "cpp",
    dailyMinutes: 90,
    balance: { problems: 60, theory: 40 },
    focusSubjects: [],
    theme: "system",
    ai: { mode: "copy", tierModels: { ...DEFAULT_TIER_MODELS } },
    onboardingDone: false,
    hidePremium: false,
    reviewIntensity: "normal",
    prefs: {
      reducedMotion: "system",
      labelDensity: "normal",
      showAdvanced: true,
      streakFreeze: true,
      focusMinutes: 25,
      breakMinutes: 5,
      timerAutoStart: true,
      extraLanguages: [],
      backupReminder: true,
    },
    createdAt: stamp,
    updatedAt: stamp,
    schemaVersion: SCHEMA_VERSION,
  };
}

export function emptySrs(): SrsState {
  return { step: 0, lapses: 0, soloStreak: 0 };
}

export function createConceptState(conceptId: string, now: Date = new Date()): ConceptState {
  return {
    conceptId,
    status: "not_started",
    everStrong: false,
    studied: false,
    knowledge: 0,
    srs: emptySrs(),
    updatedAt: nowIso(now),
  };
}

export function createProblemState(problemId: string, now: Date = new Date()): ProblemState {
  return {
    problemId,
    status: "todo",
    starred: false,
    tags: [],
    srs: emptySrs(),
    inReview: false,
    attempts: [],
    updatedAt: nowIso(now),
  };
}

/** Seed tags become stored records on first run so the owner can rename, merge or archive them. */
export function seedTagsToRecords(
  seed: readonly Omit<MistakeTag, "updatedAt" | "custom">[],
  now: Date = new Date(),
): MistakeTag[] {
  const stamp = nowIso(now);
  return seed.map((t) => ({ ...t, custom: false, updatedAt: stamp }));
}
