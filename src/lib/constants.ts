// App-wide constants. Algorithm constants from BUILD_SPEC.md section 11 live here so they can be
// tuned in one place and imported by tests.
import type { Importance, Tier, TrackId } from "./types";

/** The app's name, shown in the UI and written into exports. Rename the app here. */
export const APP_NAME = "Atlas";
export const APP_EMOJI = "🧭";
export const APP_VERSION: string = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";

/** Current user-data schema version (see lib/storage/migrations.ts). */
export const SCHEMA_VERSION = 1;

// Spaced repetition (11.1)
export const PROBLEM_STEPS_DAYS = [1, 3, 7, 14, 30, 60, 120] as const;
export const CONCEPT_STEPS_DAYS = [2, 5, 12, 25, 50, 90] as const;
export const REVIEW_INTENSITY = { gentle: 1.25, normal: 1, intense: 0.8 } as const;
export const DIFFICULTY_FACTOR = { easy: 1.1, medium: 1, hard: 0.9 } as const;

// Attempts (F7)
export const ATTEMPT_CAP = 30;
export const ATTEMPT_WARN = 20;

// Readiness (11.3)
export const IMPORTANCE_WEIGHT: Record<Importance, number> = {
  must: 3,
  important: 2,
  advanced: 0.5,
};
export const SUBJECT_WEIGHTS: Record<string, Record<TrackId, number>> = {
  dsa: { sde: 34, quant: 24 },
  sysd: { sde: 12, quant: 0 },
  oop: { sde: 7, quant: 2 },
  lld: { sde: 7, quant: 0 },
  os: { sde: 8, quant: 4 },
  cn: { sde: 7, quant: 0 },
  dbms: { sde: 7, quant: 0 },
  sql: { sde: 4, quant: 0 },
  lang: { sde: 4, quant: 7 },
  conc: { sde: 3, quant: 4 },
  eng: { sde: 2, quant: 0 },
  career: { sde: 2, quant: 2 },
  apt: { sde: 2, quant: 3 },
  prob: { sde: 0, quant: 22 },
  math: { sde: 0, quant: 10 },
  puzzles: { sde: 1, quant: 9 },
  markets: { sde: 0, quant: 8 },
  arch: { sde: 0, quant: 5 },
};

/** Language topics that only count when they match the owner's languages (section 6 note). */
export const LANGUAGE_TOPICS: Record<"cpp" | "java" | "python", string[]> = {
  cpp: ["lang.cpp-core", "lang.cpp-stl", "lang.cpp-modern"],
  java: ["lang.java-core"],
  python: ["lang.python-core"],
};

/** Default Claude model per tier (API key mode). Editable in Settings; check docs.claude.com. */
export const DEFAULT_TIER_MODELS: Record<Tier, string> = {
  quick: "claude-haiku-4-5-20251001",
  default: "claude-sonnet-5",
  complex: "claude-opus-5-5",
};

/** Time estimates in minutes (11.4). */
export const ESTIMATES = {
  resolve: { easy: 15, medium: 25, hard: 40 },
  newProblem: { easy: 20, medium: 30, hard: 45 },
  conceptReviewBundle: 10,
  drill: 6,
  mentalMath: 8,
  mock: 45,
  design: 45,
  story: 10,
  revision: 20,
} as const;

/** Storage limits for the claude.ai `db` capability (section 4.3). */
export const DB_LIMITS = {
  maxDocuments: 5000,
  maxDocBytes: 256 * 1024,
  problemDocSoftBytes: 200 * 1024,
  keepFullAttempts: 20,
  trimmedCodeChars: 2000,
  checksPerSubject: 400,
  mentalMathRuns: 300,
  planDays: 60,
  writeDebounceMs: 800,
  pageSize: 500,
} as const;
