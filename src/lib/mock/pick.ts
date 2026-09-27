// What a mock interview is about when the owner lets Atlas choose (F15): for coding, an unsolved
// problem (medium first) on the weakest pattern under way; for theory, the weakest subjects; for
// design, the weakest classic not tried yet; for behavioral, "Tell me about yourself" and three
// more questions from the bank. Pure; ties are broken by a seed.
import type { ProblemInfo } from "@/lib/problems/catalog";
import { mulberry32, seededRank } from "@/lib/random";
import type { BehavioralQuestion, Difficulty, ProblemState, Status } from "@/lib/types";

export interface PatternInfo {
  id: string;
  status: Status;
  /** 0 to 1 (section 11.2). */
  practice: number;
  order: number;
}

const DIFFICULTY_ORDER: Record<Difficulty, number> = { medium: 0, easy: 1, hard: 2 };

/** A coding problem for the weakest pattern under way (or the earliest pattern if none is). */
export function pickMockProblem(input: {
  patterns: readonly PatternInfo[];
  problems: readonly ProblemInfo[];
  states: Readonly<Record<string, ProblemState>>;
  hidePremium: boolean;
  seed: string;
}): { problemId: string; patternId: string } | null {
  const rank = seededRank(input.seed);
  const started = input.patterns.filter((p) => p.status === "learning" || p.status === "fading");
  const pool = (started.length ? started : input.patterns)
    .slice()
    .sort((a, b) => a.practice - b.practice || a.order - b.order);
  for (const pattern of pool) {
    const options = input.problems
      .filter(
        (p) =>
          p.source === "leetcode" &&
          p.language !== "sql" &&
          p.conceptIds.includes(pattern.id) &&
          !(input.hidePremium && p.premium) &&
          input.states[p.id]?.status !== "solved",
      )
      .sort(
        (a, b) =>
          DIFFICULTY_ORDER[a.difficulty] - DIFFICULTY_ORDER[b.difficulty] ||
          rank(a.id) - rank(b.id),
      );
    if (options[0]) return { problemId: options[0].id, patternId: pattern.id };
  }
  return null;
}

/** Subjects a theory round can cover (not the practice-first ones: DSA, puzzles, career). */
export const THEORY_SUBJECTS = [
  "os",
  "cn",
  "dbms",
  "oop",
  "lld",
  "conc",
  "sql",
  "sysd",
  "lang",
  "arch",
  "eng",
  "prob",
  "math",
  "markets",
  "apt",
] as const;

/** The two weakest subjects that count for the track (focus subjects first). */
export function pickTheorySubjects(input: {
  readiness: readonly { subjectId: string; readiness: number; weight: number }[];
  focus: readonly string[];
}): string[] {
  const allowed = new Set<string>(THEORY_SUBJECTS);
  const focus = input.focus.filter((s) => allowed.has(s));
  const weakest = input.readiness
    .filter((s) => allowed.has(s.subjectId) && s.weight > 0 && !focus.includes(s.subjectId))
    .sort((a, b) => a.readiness - b.readiness || b.weight - a.weight)
    .map((s) => s.subjectId);
  return [...focus, ...weakest].slice(0, 2);
}

/** "Tell me about yourself", then three more questions, shuffled by the seed. */
export function pickBehavioralQuestions(
  questions: readonly BehavioralQuestion[],
  seed: number,
  count = 4,
): string[] {
  const rng = mulberry32(seed);
  const first = questions.find((q) => q.id === "bq-tell-me-about-yourself");
  const rest = questions
    .filter((q) => q !== first && q.id !== "bq-do-you-have-any-questions-for-us")
    .map((q) => ({ q, r: rng() }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.q.id);
  return [...(first ? [first.id] : []), ...rest].slice(0, count);
}
