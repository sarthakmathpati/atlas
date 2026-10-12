// F23: fuzzy search over the whole syllabus and seed banks, fast enough to feel instant, plus
// the owner's mistake tags, notes and stories.
import { describe, expect, it } from "vitest";
import { buildSeedDocs, mistakeTagDocs, noteDocs, storyDocs } from "@/features/palette/docs";
import { SearchIndex } from "@/lib/search/searchIndex";
import { concepts, subjects, topics } from "@/data/syllabus";
import { SEED_PROBLEMS } from "@/data/seed";
import { conceptById } from "@/data/syllabus";
import { INTRO_STORY_ID, UNSORTED_STORY_ID } from "@/lib/stories/stories";
import type { ConceptNote, MistakeTag, ProblemState, Story } from "@/lib/types";

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

describe("the owner's notes and stories (F23)", () => {
  const T = "2026-10-01T10:00:00.000Z";
  const note: ConceptNote = {
    conceptId: "dsa.graph-basics.bfs",
    markdown:
      "## Remember\n\nMark **visited** when pushing, not when popping: avoids zigzag duplicates.",
    savedAnswers: [
      { id: "a1", question: "Why a queue?", answer: "Layer order", createdAt: T, source: "copy" },
    ],
    updatedAt: T,
  };
  const empty: ConceptNote = {
    ...note,
    conceptId: "dsa.arrays.cyclic-sort",
    markdown: "",
    savedAnswers: [],
  };
  const states: Record<string, ProblemState> = {
    "lc-1": {
      problemId: "lc-1",
      status: "solved",
      starred: false,
      tags: [],
      inReview: true,
      srs: { step: 1, lapses: 0, soloStreak: 0 },
      attempts: [],
      insight: "Complement lookup in one pass with a hash map",
      summary: "pairs that hit a target",
      updatedAt: T,
    },
  };
  const story = (id: string, extra: Partial<Story> = {}): Story => ({
    id,
    title: "",
    situation: "Our nightly import kept timing out",
    task: "",
    action: "Batched the writes",
    result: "Runs in four minutes",
    tags: ["ownership"],
    questionIds: [],
    updatedAt: T,
    ...extra,
  });
  const stories = {
    s1: story("s1", { title: "Fixing the flaky import" }),
    [INTRO_STORY_ID]: story(INTRO_STORY_ID, { kind: "intro", situation: "Final-year student" }),
    [UNSORTED_STORY_ID]: story(UNSORTED_STORY_ID, { situation: "zigzag unsorted practice" }),
  };
  const find = (id: string) => conceptById.get(id);
  const docs = new SearchIndex(buildSeedDocs());
  docs.replaceKind(
    "note",
    noteDocs({ [note.conceptId]: note, [empty.conceptId]: empty }, states, find),
  );
  docs.replaceKind("story", storyDocs(stories));
  const group = (q: string, kind: string) =>
    docs.search(q).find((g) => g.kind === kind)?.hits ?? [];

  it("finds a concept note by its words and saved answers, opening on the Notes tab", () => {
    const [hit] = group("zigzag", "note");
    expect(hit).toMatchObject({
      title: "Notes on BFS",
      href: "#/concept/dsa.graph-basics.bfs?tab=notes",
    });
    expect(group("layer order", "note")[0]?.id).toBe("note:concept:dsa.graph-basics.bfs");
    // An empty note isn't indexed, and the unsorted practice story never shows.
    expect(group("cyclic", "note")).toEqual([]);
    expect(group("zigzag", "story")).toEqual([]);
  });

  it("finds a problem's insight, summary and notes", () => {
    const [hit] = group("complement lookup", "note");
    expect(hit).toMatchObject({ title: "Notes on 1. Two Sum", href: "#/problems/lc-1" });
  });

  it("finds stories by their STAR text, and the intro script on its own tab", () => {
    expect(group("nightly import", "story")[0]).toMatchObject({
      title: "Fixing the flaky import",
      href: "#/stories?story=s1",
    });
    expect(group("final-year", "story")[0]).toMatchObject({
      title: "Tell me about yourself",
      href: "#/stories?tab=intro",
    });
  });
});
