// F23: fuzzy search over the whole syllabus and seed banks, fast enough to feel instant.
import { describe, expect, it } from "vitest";
import { buildSeedDocs, mistakeTagDocs } from "@/features/palette/docs";
import { SearchIndex } from "@/lib/search/searchIndex";
import { concepts, subjects, topics } from "@/data/syllabus";
import { SEED_PROBLEMS } from "@/data/seed";
import type { MistakeTag } from "@/lib/types";

const index = new SearchIndex(buildSeedDocs());
const top = (q: string) => index.search(q)[0]?.hits[0];

describe("search index", () => {
  it("indexes every subject, topic, concept and seed problem", () => {
    expect(index.size).toBe(
      subjects.length + topics.length + concepts.length + SEED_PROBLEMS.length,
    );
  });

  it("finds concepts by name, with typos", () => {
    expect(top("dijkstra")?.id).toBe("concept:dsa.shortest-paths.dijkstras-algorithm");
    expect(top("dijsktra")?.id).toBe("concept:dsa.shortest-paths.dijkstras-algorithm");
    expect(top("bfs")?.kind).toBe("concept");
  });

  it("finds LeetCode problems by number and title", () => {
    expect(top("743")?.id).toBe("problem:lc-743");
    expect(top("lc 743")?.id).toBe("problem:lc-743");
    expect(
      index
        .search("two sum")
        .flatMap((g) => g.hits)
        .some((h) => h.id === "problem:lc-1"),
    ).toBe(true);
  });

  it("finds subjects, topics and design prompts", () => {
    expect(
      index
        .search("operating systems")
        .flatMap((g) => g.hits)
        .some((h) => h.id === "subject:os"),
    ).toBe(true);
    expect(
      index
        .search("parking lot")
        .flatMap((g) => g.hits)
        .some((h) => h.kind === "design"),
    ).toBe(true);
    expect(
      index
        .search("sliding window")
        .flatMap((g) => g.hits)
        .some((h) => h.kind === "topic"),
    ).toBe(true);
  });

  it("groups results with the best group first and limits each group", () => {
    const groups = index.search("tree");
    expect(groups.length).toBeGreaterThan(1);
    for (const g of groups) expect(g.hits.length).toBeLessThanOrEqual(8);
    for (let i = 1; i < groups.length; i++) {
      expect(groups[i - 1]!.hits[0]!.score).toBeGreaterThanOrEqual(groups[i]!.hits[0]!.score);
    }
  });

  it("returns nothing for an empty query", () => {
    expect(index.search("   ")).toEqual([]);
  });

  it("answers typical queries in well under 50 ms", () => {
    const queries = ["dijkstra", "sliding win", "dp", "743", "deadlock", "tcp handshake", "option"];
    const start = performance.now();
    for (let i = 0; i < 10; i++) for (const q of queries) index.search(q);
    const perQuery = (performance.now() - start) / (10 * queries.length);
    expect(perQuery).toBeLessThan(50);
  });

  it("replaces the owner's mistake tags in place", () => {
    const local = new SearchIndex(buildSeedDocs());
    const tag = (id: string, label: string): MistakeTag => ({
      id,
      label,
      category: "logic",
      custom: true,
      updatedAt: "2026-09-24T00:00:00.000Z",
    });
    local.replaceKind(
      "mistake",
      mistakeTagDocs([tag("t1", "Forgot the empty input"), tag("t2", "Wrong loop bound")]),
    );
    expect(local.search("empty input")[0]?.hits[0]?.id).toBe("mistake:t1");
    local.replaceKind("mistake", mistakeTagDocs([tag("t2", "Wrong loop bound")]));
    expect(
      local
        .search("forgot empty")
        .flatMap((g) => g.hits)
        .some((h) => h.id === "mistake:t1"),
    ).toBe(false);
    expect(local.search("loop bound")[0]?.hits[0]?.id).toBe("mistake:t2");
  });
});
