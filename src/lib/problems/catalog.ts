// One view of every problem (F6): the seed banks (LeetCode, quant puzzles, design prompts) plus
// the owner's own problems, which live in ProblemState.custom. Pure lookups over plain data.
import { leetCodeEditorialUrl, leetCodeSlug, leetCodeUrl } from "@/data/problems.seed";
import { SEED_PROBLEMS, seedProblemById, seedProblemsByConcept } from "@/data/seed";
import type {
  ConceptId,
  Difficulty,
  ProblemSource,
  ProblemState,
  SeedProblem,
  TopicId,
} from "@/lib/types";

export interface ProblemInfo {
  id: string;
  source: ProblemSource;
  number?: number;
  title: string;
  slug?: string;
  difficulty: Difficulty;
  topicId?: TopicId;
  conceptIds: ConceptId[];
  premium?: boolean;
  language?: "sql";
  prompt?: string;
  answer?: string | null;
  answerNote?: string;
  needsReview?: boolean;
  /** Added by the owner (not in the seed banks). */
  custom: boolean;
  /** Owner-supplied link for custom problems. */
  url?: string;
  /** Position in the syllabus order (seed order; custom problems after). */
  order: number;
}

const seedOrder = new Map(SEED_PROBLEMS.map((p, i) => [p.id, i]));

function fromSeed(p: SeedProblem): ProblemInfo {
  return { ...p, custom: false, order: seedOrder.get(p.id) ?? 0 };
}

const SEED_INFO: ReadonlyMap<string, ProblemInfo> = new Map(
  SEED_PROBLEMS.map((p) => [p.id, fromSeed(p)]),
);

/** The slug of a LeetCode link ("https://leetcode.com/problems/two-sum/description/" → "two-sum"). */
export function slugFromLeetCodeUrl(url: string): string | undefined {
  const m = /leetcode\.(?:com|cn)\/problems\/([a-z0-9-]+)/i.exec(url);
  return m?.[1]?.toLowerCase();
}

export function isCustomId(id: string): boolean {
  return id.startsWith("custom-");
}

/** A problem by id: from the seed banks, or the owner's own from its stored state. */
export function problemInfo(id: string, state?: ProblemState): ProblemInfo | undefined {
  const seed = SEED_INFO.get(id);
  if (seed) return seed;
  const c = state?.custom;
  if (!c) return undefined;
  const slug = c.url ? slugFromLeetCodeUrl(c.url) : undefined;
  return {
    id,
    source: c.source,
    title: c.title,
    slug,
    difficulty: c.difficulty,
    topicId: c.topicId,
    conceptIds: c.conceptIds,
    prompt: c.prompt,
    custom: true,
    url: c.url,
    order: SEED_PROBLEMS.length,
  };
}

/** Every problem: seed banks in syllabus order, then the owner's own. */
export function allProblems(states: Readonly<Record<string, ProblemState>>): ProblemInfo[] {
  const list: ProblemInfo[] = [...SEED_INFO.values()];
  const custom: ProblemInfo[] = [];
  for (const s of Object.values(states)) {
    if (!s.custom || SEED_INFO.has(s.problemId)) continue;
    const info = problemInfo(s.problemId, s);
    if (info) custom.push(info);
  }
  custom.sort((a, b) => a.title.localeCompare(b.title));
  custom.forEach((p, i) => (p.order = SEED_PROBLEMS.length + i));
  return [...list, ...custom];
}

/** Where to solve it: the owner's corrected link, a custom link, or the LeetCode page. */
export function problemUrl(info: ProblemInfo, state?: ProblemState): string | undefined {
  if (state?.urlOverride) return state.urlOverride;
  if (info.url) return info.url;
  return info.slug ? leetCodeUrl(info.slug) : undefined;
}

/** The LeetCode editorial (the offline "Show full solution"), when the problem is on LeetCode. */
export function editorialUrl(info: ProblemInfo, state?: ProblemState): string | undefined {
  const slug = (state?.urlOverride && slugFromLeetCodeUrl(state.urlOverride)) ?? info.slug;
  return slug ? leetCodeEditorialUrl(slug) : undefined;
}

/** "743. Network Delay Time", or the title alone. */
export function problemLabel(info: Pick<ProblemInfo, "number" | "title">): string {
  return info.number ? `${info.number}. ${info.title}` : info.title;
}

export function isDesignProblem(info: Pick<ProblemInfo, "source">): boolean {
  return info.source === "design-lld" || info.source === "design-hld";
}

/** Problems tagged with a concept: seed problems and the owner's own. */
export function problemsForConcept(
  conceptId: string,
  states: Readonly<Record<string, ProblemState>>,
): ProblemInfo[] {
  const seed = (seedProblemsByConcept.get(conceptId) ?? []).map((p) => SEED_INFO.get(p.id)!);
  const custom: ProblemInfo[] = [];
  for (const s of Object.values(states)) {
    if (s.custom?.conceptIds.includes(conceptId)) {
      const info = problemInfo(s.problemId, s);
      if (info) custom.push(info);
    }
  }
  return [...seed, ...custom];
}

/** Concepts a problem feeds (its patterns). */
export function conceptsOfProblem(id: string, state?: ProblemState): ConceptId[] {
  return problemInfo(id, state)?.conceptIds ?? [];
}

export { leetCodeSlug, seedProblemById };
