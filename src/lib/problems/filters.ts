// Problem library filters and sorting (F6). Filters live in the URL query so links such as
// "#/problems?pattern=dsa.sliding-window.variable-window" work, and Back restores a view.
import { conceptById, topicById, topics } from "@/data/syllabus";
import type { Difficulty, Profile, ProblemState } from "@/lib/types";
import type { ProblemInfo } from "./catalog";
import { latestAttempt, reviewInfo, type ReviewInfo } from "./progress";

export type StatusFilter = "all" | "todo" | "attempted" | "solved" | "mastered";
export type SourceFilter = "all" | "leetcode" | "sql" | "quant" | "design" | "custom";
export type SortKey = "order" | "title" | "difficulty" | "status" | "result" | "last" | "next";
export type SortDir = "asc" | "desc";

export interface ProblemFilters {
  q: string;
  status: StatusFilter;
  difficulty: Difficulty[];
  source: SourceFilter;
  topic?: string;
  pattern?: string;
  tags: string[];
  due: boolean;
  starred: boolean;
  /** Undefined means "follow Settings" (profile.hidePremium). */
  premium?: "hide" | "show";
  sort: SortKey;
  dir: SortDir;
  group: boolean;
}

export const DEFAULT_FILTERS: ProblemFilters = {
  q: "",
  status: "all",
  difficulty: [],
  source: "all",
  tags: [],
  due: false,
  starred: false,
  sort: "order",
  dir: "asc",
  group: false,
};

const STATUS: StatusFilter[] = ["all", "todo", "attempted", "solved", "mastered"];
const SOURCE: SourceFilter[] = ["all", "leetcode", "sql", "quant", "design", "custom"];
const SORT: SortKey[] = ["order", "title", "difficulty", "status", "result", "last", "next"];
const DIFF: Difficulty[] = ["easy", "medium", "hard"];

const pick = <T extends string>(list: readonly T[], v: string | null, fallback: T): T =>
  v !== null && (list as readonly string[]).includes(v) ? (v as T) : fallback;
const csv = (v: string | null) => (v ? v.split(",").filter(Boolean) : []);

export function parseFilters(query: URLSearchParams): ProblemFilters {
  const premium = query.get("premium");
  return {
    q: query.get("q") ?? "",
    status: pick(STATUS, query.get("status"), "all"),
    difficulty: csv(query.get("difficulty")).filter((d): d is Difficulty =>
      (DIFF as string[]).includes(d),
    ),
    source: pick(SOURCE, query.get("source"), "all"),
    topic: query.get("topic") || undefined,
    pattern: query.get("pattern") || undefined,
    tags: csv(query.get("tags")),
    due: query.get("due") === "1",
    starred: query.get("starred") === "1",
    premium: premium === "hide" || premium === "show" ? premium : undefined,
    sort: pick(SORT, query.get("sort"), "order"),
    dir: query.get("dir") === "desc" ? "desc" : "asc",
    group: query.get("group") === "topic",
  };
}

/** The query for a set of filters, leaving out defaults so links stay short. */
export function filtersToQuery(f: ProblemFilters): Record<string, string> {
  const q: Record<string, string> = {};
  if (f.q) q.q = f.q;
  if (f.status !== "all") q.status = f.status;
  if (f.difficulty.length) q.difficulty = f.difficulty.join(",");
  if (f.source !== "all") q.source = f.source;
  if (f.topic) q.topic = f.topic;
  if (f.pattern) q.pattern = f.pattern;
  if (f.tags.length) q.tags = f.tags.join(",");
  if (f.due) q.due = "1";
  if (f.starred) q.starred = "1";
  if (f.premium) q.premium = f.premium;
  if (f.sort !== "order") q.sort = f.sort;
  if (f.dir !== "asc") q.dir = f.dir;
  if (f.group) q.group = "topic";
  return q;
}

/** How many filters narrow the list (search text, sort and grouping don't count). */
export function activeFilterCount(f: ProblemFilters): number {
  return (
    (f.status !== "all" ? 1 : 0) +
    (f.difficulty.length ? 1 : 0) +
    (f.source !== "all" ? 1 : 0) +
    (f.topic ? 1 : 0) +
    (f.pattern ? 1 : 0) +
    (f.tags.length ? 1 : 0) +
    (f.due ? 1 : 0) +
    (f.starred ? 1 : 0) +
    (f.premium ? 1 : 0)
  );
}

export interface ProblemRow {
  info: ProblemInfo;
  state?: ProblemState;
  review: ReviewInfo;
  lastResult?: NonNullable<ProblemState["attempts"][number]["result"]>;
  /** ISO time of the latest attempt. */
  lastAt?: string;
}

export function buildRows(
  problems: readonly ProblemInfo[],
  states: Readonly<Record<string, ProblemState>>,
  intensity: Profile["reviewIntensity"],
  today: string,
): ProblemRow[] {
  return problems.map((info) => {
    const state = states[info.id];
    const last = latestAttempt(state);
    return {
      info,
      state,
      review: reviewInfo(state, info.difficulty, intensity, today),
      lastResult: last?.result,
      lastAt: last ? (last.finishedAt ?? last.startedAt) : undefined,
    };
  });
}

export function sourceOf(info: ProblemInfo): Exclude<SourceFilter, "all"> {
  if (info.custom) return "custom";
  if (info.language === "sql") return "sql";
  if (info.source === "quant") return "quant";
  if (info.source === "design-lld" || info.source === "design-hld") return "design";
  return "leetcode";
}

/** "743", "lc 743", "#743" → 743. */
function queryNumber(q: string): number | null {
  const m = /^(?:lc\s*|#)?(\d+)$/i.exec(q.trim());
  return m ? Number(m[1]) : null;
}

function matchesText(info: ProblemInfo, q: string): boolean {
  const n = queryNumber(q);
  if (n !== null) return info.number === n || String(info.number ?? "").startsWith(String(n));
  const title = info.title.toLowerCase();
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  return words.every((w) => title.includes(w) || (info.slug ?? "").includes(w));
}

export function applyFilters(
  rows: readonly ProblemRow[],
  f: ProblemFilters,
  hidePremiumByDefault: boolean,
): ProblemRow[] {
  const hidePremium = f.premium ? f.premium === "hide" : hidePremiumByDefault;
  const topicIsSubject = f.topic !== undefined && !topicById.has(f.topic);
  return rows.filter(({ info, state, review }) => {
    if (f.q.trim() && !matchesText(info, f.q)) return false;
    if (hidePremium && info.premium) return false;
    if (f.source !== "all" && sourceOf(info) !== f.source) return false;
    if (f.difficulty.length && !f.difficulty.includes(info.difficulty)) return false;
    if (f.topic) {
      const inTopic = topicIsSubject
        ? (info.topicId ?? "").split(".")[0] === f.topic
        : info.topicId === f.topic ||
          info.conceptIds.some((c) => conceptById.get(c)?.topicId === f.topic);
      if (!inTopic) return false;
    }
    if (f.pattern && !info.conceptIds.includes(f.pattern)) return false;
    if (f.tags.length && !f.tags.every((t) => state?.tags.includes(t))) return false;
    if (f.starred && !state?.starred) return false;
    if (f.due && review.kind !== "due") return false;
    const status = state?.status ?? "todo";
    if (f.status === "mastered") {
      if (review.kind !== "mastered") return false;
    } else if (f.status !== "all" && status !== f.status) return false;
    return true;
  });
}

const DIFF_RANK: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2 };
const STATUS_RANK = { todo: 0, attempted: 1, solved: 2 } as const;
const RESULT_RANK = { solved_alone: 0, solved_with_hints: 1, saw_solution: 2, not_solved: 3 };

function nextRank(r: ReviewInfo): number {
  // Soonest first: overdue, due, upcoming by date, then out of review, mastered, never attempted.
  switch (r.kind) {
    case "due":
      return -r.daysLate;
    case "upcoming":
      return r.inDays;
    case "off":
      return 1e6;
    case "mastered":
      return 2e6;
    case "none":
      return 3e6;
  }
}

/** Sorts rows; empty values (never attempted) stay at the end in both directions. */
export function sortRows(rows: readonly ProblemRow[], key: SortKey, dir: SortDir): ProblemRow[] {
  const sign = dir === "asc" ? 1 : -1;
  const byOrder = (a: ProblemRow, b: ProblemRow) => a.info.order - b.info.order;
  const value = (r: ProblemRow): number | string | undefined => {
    switch (key) {
      case "order":
        return r.info.order;
      case "title":
        return r.info.number ?? r.info.title.toLowerCase();
      case "difficulty":
        return DIFF_RANK[r.info.difficulty];
      case "status":
        return r.review.kind === "mastered" ? 3 : STATUS_RANK[r.state?.status ?? "todo"];
      case "result":
        return r.lastResult ? RESULT_RANK[r.lastResult] : undefined;
      case "last":
        return r.lastAt;
      case "next":
        return r.review.kind === "none" ? undefined : nextRank(r.review);
    }
  };
  return [...rows].sort((a, b) => {
    const va = value(a);
    const vb = value(b);
    if (va === undefined && vb === undefined) return byOrder(a, b);
    if (va === undefined) return 1;
    if (vb === undefined) return -1;
    if (typeof va === "number" && typeof vb === "string") return -1 * sign;
    if (typeof va === "string" && typeof vb === "number") return 1 * sign;
    if (va < vb) return -1 * sign;
    if (va > vb) return 1 * sign;
    return byOrder(a, b);
  });
}

/** Topics in syllabus order (subjects in order, then topics within each). */
const TOPIC_INDEX = new Map(topics.map((t, i) => [t.id, i]));

export interface RowGroup {
  topicId: string;
  rows: ProblemRow[];
}

/** Groups rows by topic in syllabus order; problems without a topic go last. */
export function groupByTopic(rows: readonly ProblemRow[]): RowGroup[] {
  const groups = new Map<string, ProblemRow[]>();
  for (const r of rows) {
    const key = r.info.topicId ?? "";
    const list = groups.get(key);
    if (list) list.push(r);
    else groups.set(key, [r]);
  }
  return [...groups.entries()]
    .map(([topicId, list]) => ({ topicId, rows: list }))
    .sort((a, b) => (TOPIC_INDEX.get(a.topicId) ?? 1e9) - (TOPIC_INDEX.get(b.topicId) ?? 1e9));
}

export interface LibraryStats {
  solved: Record<Difficulty, number>;
  solvedThisWeek: number;
  dueToday: number;
  total: number;
}

/** Header stats: solved by difficulty, solved in the last 7 days, due today. */
export function libraryStats(rows: readonly ProblemRow[], today: string): LibraryStats {
  const solved: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  let solvedThisWeek = 0;
  let dueToday = 0;
  const [y, m, d] = today.split("-").map(Number);
  const weekAgo = new Date(y ?? 2000, (m ?? 1) - 1, (d ?? 1) - 6).getTime();
  for (const r of rows) {
    if (r.state?.status === "solved") solved[r.info.difficulty]++;
    if (r.review.kind === "due") dueToday++;
    const solvedRecently = r.state?.attempts.some(
      (a) =>
        (a.result === "solved_alone" || a.result === "solved_with_hints") &&
        Date.parse(a.finishedAt ?? a.startedAt) >= weekAgo,
    );
    if (solvedRecently) solvedThisWeek++;
  }
  return { solved, solvedThisWeek, dueToday, total: rows.length };
}
