// Quick add (F6): paste a LeetCode link or type a title or number. A match in the seed banks (or
// among the owner's own problems) opens it; otherwise a new problem is prefilled from the link.
// Also an offline "suggest concepts": the patterns of the most similar seed problems by title.
import { conceptById } from "@/data/syllabus";
import type { ConceptId, ProblemState } from "@/lib/types";
import {
  allProblems,
  leetCodeSlug,
  slugFromLeetCodeUrl,
  withScheme,
  type ProblemInfo,
} from "./catalog";

export type ParsedInput =
  | { kind: "empty" }
  | { kind: "url"; url: string; slug?: string }
  | { kind: "number"; number: number }
  | { kind: "title"; title: string };

export function parseProblemInput(text: string): ParsedInput {
  const t = text.trim();
  if (!t) return { kind: "empty" };
  if (/^https?:\/\//i.test(t) || /^(www\.)?leetcode\.(com|cn)\//i.test(t)) {
    const url = withScheme(t);
    return { kind: "url", url, slug: slugFromLeetCodeUrl(url) };
  }
  const n = /^(?:lc\s*|leetcode\s*|#)?(\d{1,5})\.?$/i.exec(t);
  if (n) return { kind: "number", number: Number(n[1]) };
  return { kind: "title", title: t };
}

const SMALL_WORDS = new Set([
  "a",
  "an",
  "and",
  "as",
  "at",
  "by",
  "for",
  "from",
  "in",
  "into",
  "of",
  "on",
  "or",
  "the",
  "to",
  "with",
  "vs",
]);

/** "best-time-to-buy-and-sell-stock" → "Best Time to Buy and Sell Stock". */
export function titleFromSlug(slug: string): string {
  const words = slug.split("-").filter(Boolean);
  return words
    .map((w, i) => {
      if (/^[ivx]+$/.test(w) && w.length <= 4) return w.toUpperCase(); // roman numerals: "II"
      if (i > 0 && SMALL_WORDS.has(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1);
    })
    .join(" ");
}

const norm = (s: string) => leetCodeSlug(s);

/**
 * Problems that match what the owner typed, best first: an exact link, number or title match
 * gives one result; otherwise titles containing every word.
 */
export function findProblemMatches(
  input: ParsedInput,
  states: Readonly<Record<string, ProblemState>>,
  limit = 6,
): { exact: ProblemInfo | undefined; matches: ProblemInfo[] } {
  if (input.kind === "empty") return { exact: undefined, matches: [] };
  const all = allProblems(states).filter(
    (p) => p.source !== "design-lld" && p.source !== "design-hld",
  );
  if (input.kind === "url") {
    const exact =
      (input.slug && all.find((p) => p.slug === input.slug)) ||
      all.find((p) => p.url && p.url.replace(/\/+$/, "") === input.url.replace(/\/+$/, ""));
    return { exact: exact || undefined, matches: exact ? [exact] : [] };
  }
  if (input.kind === "number") {
    const exact = all.find((p) => p.number === input.number);
    return { exact, matches: exact ? [exact] : [] };
  }
  const slug = norm(input.title);
  const exact = all.find((p) => (p.slug ?? norm(p.title)) === slug);
  if (exact) return { exact, matches: [exact] };
  const words = input.title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  if (words.length === 0) return { exact: undefined, matches: [] };
  const matches = all
    .filter((p) => {
      const title = p.title.toLowerCase();
      return words.every((w) => title.includes(w));
    })
    .sort((a, b) => a.title.length - b.title.length)
    .slice(0, limit);
  return { exact: undefined, matches };
}

// ----- offline concept suggestions ---------------------------------------------------------------

const STOP = new Set([
  ...SMALL_WORDS,
  "i",
  "ii",
  "iii",
  "iv",
  "number",
  "find",
  "get",
  "all",
  "is",
  "k",
  "th",
  "kth",
  "your",
  "two",
  "using",
  "make",
  "minimum",
  "maximum",
  "count",
  "sum",
]);

function titleWords(title: string): string[] {
  return title
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length > 1 && !STOP.has(w))
    .map((w) => (w.endsWith("s") && w.length > 3 ? w.slice(0, -1) : w));
}

let idf: Map<string, number> | null = null;
let seedWords: { info: ProblemInfo; words: Set<string> }[] | null = null;

function prepare(): void {
  if (idf && seedWords) return;
  seedWords = allProblems({})
    .filter((p) => p.source === "leetcode")
    .map((info) => ({ info, words: new Set(titleWords(info.title)) }));
  const df = new Map<string, number>();
  for (const { words } of seedWords) for (const w of words) df.set(w, (df.get(w) ?? 0) + 1);
  idf = new Map([...df].map(([w, n]) => [w, Math.log(1 + seedWords!.length / n)]));
}

/**
 * Up to `max` concepts for a new problem, from the seed problems whose titles share the most
 * distinctive words with it ("Kth Largest Element in a Stream" → the heap patterns of "Kth Largest
 * Element in an Array"). Empty when nothing is similar enough.
 */
export function suggestConcepts(title: string, max = 3): ConceptId[] {
  prepare();
  const words = new Set(titleWords(title));
  if (words.size === 0) return [];
  const scored = seedWords!
    .map(({ info, words: w }) => {
      let score = 0;
      for (const x of words) if (w.has(x)) score += idf!.get(x) ?? 0;
      return { info, score };
    })
    .filter((s) => s.score > 1.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const votes = new Map<ConceptId, number>();
  for (const { info, score } of scored) {
    info.conceptIds.forEach((c, i) => {
      if (!conceptById.has(c)) return;
      votes.set(c, (votes.get(c) ?? 0) + score / (i + 1));
    });
  }
  return [...votes.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([c]) => c);
}
