// Fuzzy search for the command palette (F23): one MiniSearch index over concepts, topics,
// subjects, problems, puzzles, design prompts and mistake tags. Built once, updated in place.
import MiniSearch, { type SearchResult } from "minisearch";

export type SearchKind =
  "concept" | "topic" | "subject" | "problem" | "puzzle" | "design" | "mistake";

export interface SearchDoc {
  id: string;
  kind: SearchKind;
  title: string;
  /** A short second line (topic, difficulty, …). */
  subtitle?: string;
  /** Longer text that should match (scope, simple content, description). */
  text?: string;
  /** Extra words that should match strongly (ids, "lc", synonyms). */
  keywords?: string;
  /** LeetCode number as text, so "743" finds problem 743. */
  num?: string;
  /** In-app link. */
  href: string;
}

export interface SearchHit {
  id: string;
  kind: SearchKind;
  title: string;
  subtitle?: string;
  href: string;
  score: number;
}

export interface SearchGroup {
  kind: SearchKind;
  hits: SearchHit[];
}

/** How many results each group shows at most. */
export const GROUP_LIMITS: Record<SearchKind, number> = {
  concept: 8,
  problem: 6,
  topic: 4,
  subject: 3,
  puzzle: 4,
  design: 4,
  mistake: 4,
};

export class SearchIndex {
  private readonly mini: MiniSearch<SearchDoc>;
  /** Ids per kind, so one kind can be refreshed without touching the rest. */
  private readonly kindIds = new Map<SearchKind, Set<string>>();

  constructor(docs: SearchDoc[] = []) {
    this.mini = new MiniSearch<SearchDoc>({
      idField: "id",
      fields: ["title", "keywords", "num", "text"],
      storeFields: ["kind", "title", "subtitle", "href"],
      searchOptions: {
        boost: { title: 4, num: 6, keywords: 2, text: 0.6 },
        prefix: true,
        // Typo tolerance for longer words: "dijsktra" still finds Dijkstra.
        fuzzy: (term) => (term.length >= 4 ? 0.25 : false),
        combineWith: "AND",
      },
    });
    this.mini.addAll(docs);
    for (const doc of docs) this.remember(doc);
  }

  get size(): number {
    return this.mini.documentCount;
  }

  private remember(doc: SearchDoc): void {
    const set = this.kindIds.get(doc.kind) ?? new Set<string>();
    set.add(doc.id);
    this.kindIds.set(doc.kind, set);
  }

  /** Replaces every document of one kind (for example the owner's mistake tags). */
  replaceKind(kind: SearchKind, docs: SearchDoc[]): void {
    const next = new Set(docs.map((d) => d.id));
    for (const id of this.kindIds.get(kind) ?? []) {
      if (!next.has(id) && this.mini.has(id)) this.mini.discard(id);
    }
    this.kindIds.set(kind, new Set());
    for (const doc of docs) {
      if (this.mini.has(doc.id)) this.mini.replace(doc);
      else this.mini.add(doc);
      this.remember(doc);
    }
  }

  /** Grouped results, the group with the best match first. */
  search(query: string): SearchGroup[] {
    const q = query.trim();
    if (!q) return [];
    let results: SearchResult[] = this.mini.search(q);
    if (results.length === 0) results = this.mini.search(q, { combineWith: "OR" });
    const groups = new Map<SearchKind, SearchHit[]>();
    for (const r of results) {
      const kind = r.kind as SearchKind;
      const list = groups.get(kind) ?? [];
      if (list.length >= GROUP_LIMITS[kind]) continue;
      list.push({
        id: String(r.id),
        kind,
        title: r.title as string,
        subtitle: r.subtitle as string | undefined,
        href: r.href as string,
        score: r.score,
      });
      groups.set(kind, list);
    }
    return [...groups.entries()]
      .map(([kind, hits]) => ({ kind, hits }))
      .sort((a, b) => (b.hits[0]?.score ?? 0) - (a.hits[0]?.score ?? 0));
  }
}
