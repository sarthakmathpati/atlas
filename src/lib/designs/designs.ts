// Design practice (BUILD_SPEC.md F26): the sections of an LLD or HLD answer, how a finished
// attempt is scored (Claude's rubric review, prompt 12, or the owner's own review against the
// same rubric), and the status and last score shown in the list. Pure helpers.
import { designReviewSchema, type DesignReview } from "@/lib/ai/schemas";
import type { AttemptResult, DesignAttempt, SeedProblem } from "@/lib/types";

export type DesignKind = "lld" | "hld";

export interface DesignSection {
  key: string;
  label: string;
  hint: string;
  /** Code (CodeMirror) or the architecture sketch instead of plain text. */
  editor?: "code" | "sketch";
  rows?: number;
}

export const DESIGN_MINUTES = 45;

export const LLD_SECTIONS: readonly DesignSection[] = [
  {
    key: "requirements",
    label: "Requirements",
    hint: "What the system must do, what's out of scope, and the questions you'd ask first.",
  },
  {
    key: "entities",
    label: "Entities and classes",
    hint: "The main classes and what each one is responsible for.",
  },
  {
    key: "relationships",
    label: "Relationships",
    hint: "Who owns, uses or extends whom, with multiplicities.",
  },
  {
    key: "methods",
    label: "Key methods and APIs",
    hint: "The public methods that carry the main flows, with their inputs and outputs.",
  },
  {
    key: "patterns",
    label: "Design patterns used",
    hint: "Which patterns you'd use, where, and why they fit.",
    rows: 3,
  },
  {
    key: "concurrency",
    label: "Concurrency concerns",
    hint: "What can happen at the same time, and how you keep it correct.",
    rows: 3,
  },
  { key: "code", label: "Code", hint: "The core classes in code.", editor: "code" },
  {
    key: "extensions",
    label: "Extensions",
    hint: "How the design grows: new types, new rules, more scale.",
    rows: 3,
  },
];

export const HLD_SECTIONS: readonly DesignSection[] = [
  {
    key: "requirements",
    label: "Functional and non-functional requirements",
    hint: "What users can do; scale, latency, availability and consistency targets.",
  },
  {
    key: "estimates",
    label: "Estimates",
    hint: "Requests per second, storage per year, bandwidth. Show the arithmetic.",
    rows: 3,
  },
  {
    key: "api",
    label: "API",
    hint: "The main endpoints or calls, with what they take and return.",
  },
  {
    key: "dataModel",
    label: "Data model",
    hint: "Tables or documents, keys and indexes, and where each lives.",
  },
  {
    key: "architecture",
    label: "High-level architecture",
    hint: "Walk through the main request paths. Draw them in the sketch below.",
  },
  {
    key: "deepDives",
    label: "Deep dives",
    hint: "The one or two parts an interviewer would push on, in detail.",
  },
  {
    key: "tradeoffs",
    label: "Bottlenecks and trade-offs",
    hint: "What breaks first at scale, and what you gave up for what.",
  },
];

/** The architecture sketch, for both kinds (class boxes for LLD, services for HLD). */
export const SKETCH_SECTION: DesignSection = {
  key: "sketch",
  label: "Architecture sketch",
  hint: "One arrow per line, such as “Client -> API Gateway : HTTPS”.",
  editor: "sketch",
};

export function designKind(p: Pick<SeedProblem, "source">): DesignKind {
  return p.source === "design-lld" ? "lld" : "hld";
}

export function sectionsFor(kind: DesignKind): DesignSection[] {
  return kind === "lld"
    ? [
        ...LLD_SECTIONS.slice(0, 3),
        {
          ...SKETCH_SECTION,
          label: "Class sketch",
          hint: "One arrow per line, such as “ParkingLot -> Floor : has many”.",
        },
        ...LLD_SECTIONS.slice(3),
      ]
    : [...HLD_SECTIONS.slice(0, 5), SKETCH_SECTION, ...HLD_SECTIONS.slice(5)];
}

/** Sections with something written, in order (what Claude reviews). */
export function filledSections(
  kind: DesignKind,
  sections: Readonly<Record<string, string>>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const s of sectionsFor(kind)) {
    const v = sections[s.key]?.trim();
    if (v) out[s.label] = v;
  }
  return out;
}

export function wordsWritten(sections: Readonly<Record<string, string>>): number {
  return Object.values(sections).join(" ").split(/\s+/).filter(Boolean).length;
}

// ----- scoring -------------------------------------------------------------------------------------

/** A stored review (typed unknown in the data) if it has the right shape. */
export function readReview(value: unknown): DesignReview | null {
  const parsed = designReviewSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** The owner's own review: 0 (missed), 1 (partly) or 2 (covered) per rubric point. */
export type SelfReview = number[];

/** Overall 1 to 5 from rubric points scored 0 to 2 (all covered well: 5; none: 1). */
export function overallFromPoints(points: readonly number[]): number {
  if (points.length === 0) return 1;
  const share = points.reduce((s, p) => s + Math.min(2, Math.max(0, p)), 0) / (2 * points.length);
  return Math.round((1 + 4 * share) * 10) / 10;
}

/**
 * The attempt result a design review stands for, so designs count as practice evidence for their
 * classic concept like any problem: 4 or more out of 5 is a solve, 3 or more a solve with help,
 * less is not solved yet.
 */
export function resultFromOverall(overall: number): AttemptResult {
  if (overall >= 4) return "solved_alone";
  if (overall >= 3) return "solved_with_hints";
  return "not_solved";
}

export type DesignStatus = "not_started" | "in_progress" | "done";

export interface DesignSummary {
  status: DesignStatus;
  /** The latest finished attempt's overall score (1 to 5). */
  lastScore?: number;
  lastScoreBy?: "claude" | "self";
  lastFinished?: string;
  finished: number;
  /** The unfinished attempt, if any. */
  open?: DesignAttempt;
}

export function attemptScore(a: DesignAttempt): { score: number; by: "claude" | "self" } | null {
  const review = readReview(a.review);
  if (review) return { score: review.overall, by: "claude" };
  if (a.selfReview?.length) return { score: overallFromPoints(a.selfReview), by: "self" };
  return null;
}

export function summarizeDesign(attempts: readonly DesignAttempt[]): DesignSummary {
  const finished = attempts
    .filter((a) => a.finishedAt)
    .sort((a, b) => (a.finishedAt! < b.finishedAt! ? 1 : -1));
  const open = attempts
    .filter((a) => !a.finishedAt)
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))[0];
  const last = finished[0];
  const score = last ? attemptScore(last) : null;
  return {
    status: open ? "in_progress" : finished.length ? "done" : "not_started",
    ...(score ? { lastScore: score.score, lastScoreBy: score.by } : {}),
    ...(last ? { lastFinished: last.finishedAt } : {}),
    finished: finished.length,
    ...(open ? { open } : {}),
  };
}
