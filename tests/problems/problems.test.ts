// F6, F8, F11, F22 helpers: quick add, CSV import, filters, the offline hint ladder, mistake
// statistics and the Markdown export of notes.
import { describe, expect, it } from "vitest";
import { conceptById } from "@/data/syllabus";
import { SEED_PROBLEMS } from "@/data/seed";
import { buildNotesMarkdown } from "@/lib/export/notesMarkdown";
import {
  categoryCounts,
  checklistTags,
  mergeTagInStates,
  newTagId,
  tagCounts,
  taggedAttempts,
  topPatternFor,
} from "@/lib/mistakes/stats";
import {
  allProblems,
  problemInfo,
  problemsForConcept,
  problemUrl,
  withScheme,
} from "@/lib/problems/catalog";
import {
  csvAttemptId,
  mapColumns,
  parseCsv,
  parseCsvDate,
  parseCsvMinutes,
  parseCsvResult,
  planCsvImport,
} from "@/lib/problems/csv";
import {
  applyFilters,
  buildRows,
  DEFAULT_FILTERS,
  filtersToQuery,
  groupByTopic,
  libraryStats,
  parseFilters,
  sortRows,
} from "@/lib/problems/filters";
import { buildOfflineHints } from "@/lib/problems/hints";
import { reviewInfo, reviewLabel } from "@/lib/problems/progress";
import {
  findProblemMatches,
  parseProblemInput,
  suggestConcepts,
  titleFromSlug,
} from "@/lib/problems/quickAdd";
import type { MistakeTag, ProblemState } from "@/lib/types";
import { makeAttempt, makeProblem } from "../fixtures/userData";

const custom: ProblemState = {
  problemId: "custom-abc",
  custom: {
    title: "Count Lucky Triplets",
    url: "https://leetcode.com/problems/count-lucky-triplets/",
    difficulty: "easy",
    source: "leetcode",
    conceptIds: ["dsa.heaps.top-k-elements"],
  },
  status: "todo",
  starred: false,
  tags: [],
  srs: { step: 0, lapses: 0, soloStreak: 0 },
  inReview: false,
  attempts: [],
  updatedAt: "2026-09-01T00:00:00.000Z",
};

describe("catalog", () => {
  it("lists every seed problem and the owner's own", () => {
    const all = allProblems({ [custom.problemId]: custom });
    expect(all.length).toBe(SEED_PROBLEMS.length + 1);
    expect(all.at(-1)).toMatchObject({
      id: "custom-abc",
      custom: true,
      slug: "count-lucky-triplets",
    });
  });
  it("prefers the owner's corrected link", () => {
    const info = problemInfo("lc-1")!;
    expect(problemUrl(info)).toBe("https://leetcode.com/problems/two-sum/");
    expect(
      problemUrl(info, { ...makeProblem("lc-1", 0), urlOverride: "https://example.org/x" }),
    ).toBe("https://example.org/x");
  });
  it("adds https to links typed without a scheme", () => {
    expect(withScheme("leetcode.com/problems/two-sum/")).toBe(
      "https://leetcode.com/problems/two-sum/",
    );
    expect(withScheme("example.org")).toBe("https://example.org/");
    expect(withScheme("http://example.org/a")).toBe("http://example.org/a");
    expect(withScheme("")).toBe("");
  });
  it("finds custom problems by concept", () => {
    expect(conceptById.has("dsa.heaps.top-k-elements")).toBe(true);
    const list = problemsForConcept("dsa.heaps.top-k-elements", { [custom.problemId]: custom });
    expect(list.some((p) => p.id === "custom-abc")).toBe(true);
    expect(list.some((p) => !p.custom)).toBe(true);
  });
});

describe("quick add", () => {
  it("parses links, numbers and titles", () => {
    expect(parseProblemInput("https://leetcode.com/problems/two-sum/description/")).toMatchObject({
      kind: "url",
      slug: "two-sum",
    });
    expect(parseProblemInput("leetcode.com/problems/lru-cache")).toMatchObject({
      kind: "url",
      slug: "lru-cache",
    });
    expect(parseProblemInput("743")).toEqual({ kind: "number", number: 743 });
    expect(parseProblemInput("LC 743")).toEqual({ kind: "number", number: 743 });
    expect(parseProblemInput("  network delay ")).toEqual({
      kind: "title",
      title: "network delay",
    });
    expect(parseProblemInput("")).toEqual({ kind: "empty" });
  });
  it("matches the seed by slug, number and title", () => {
    expect(
      findProblemMatches(parseProblemInput("https://leetcode.com/problems/network-delay-time/"), {})
        .exact?.id,
    ).toBe("lc-743");
    expect(findProblemMatches(parseProblemInput("743"), {}).exact?.id).toBe("lc-743");
    expect(findProblemMatches(parseProblemInput("Network Delay Time"), {}).exact?.id).toBe(
      "lc-743",
    );
    const partial = findProblemMatches(parseProblemInput("delay"), {});
    expect(partial.exact).toBeUndefined();
    expect(partial.matches.map((p) => p.id)).toContain("lc-743");
  });
  it("matches the owner's own problems too", () => {
    const r = findProblemMatches(
      parseProblemInput("https://leetcode.com/problems/count-lucky-triplets"),
      {
        [custom.problemId]: custom,
      },
    );
    expect(r.exact?.id).toBe("custom-abc");
  });
  it("prefills a title from a slug", () => {
    expect(titleFromSlug("best-time-to-buy-and-sell-stock-ii")).toBe(
      "Best Time to Buy and Sell Stock II",
    );
    expect(titleFromSlug("a-number-after-a-double-reversal")).toBe(
      "A Number After a Double Reversal",
    );
  });
  it("suggests patterns from similar seed problems", () => {
    const s = suggestConcepts("Kth Largest Element in a Stream");
    expect(s.length).toBeGreaterThan(0);
    expect(s.every((id) => conceptById.has(id))).toBe(true);
    expect(s.some((id) => id.startsWith("dsa.heaps."))).toBe(true);
    expect(suggestConcepts("xyzzy plugh")).toEqual([]);
  });
});

describe("CSV", () => {
  it("parses quotes, doubled quotes, newlines in fields and other delimiters", () => {
    expect(parseCsv('title,notes\r\n"Two Sum","a, b ""c""\nd"\n\n3Sum,x\n')).toEqual([
      ["title", "notes"],
      ["Two Sum", 'a, b "c"\nd'],
      ["3Sum", "x"],
    ]);
    expect(parseCsv("title;minutes\nTwo Sum;12")).toEqual([
      ["title", "minutes"],
      ["Two Sum", "12"],
    ]);
    expect(parseCsv("title\tminutes\nTwo Sum\t12")).toEqual([
      ["title", "minutes"],
      ["Two Sum", "12"],
    ]);
  });
  it("maps header synonyms", () => {
    expect(
      mapColumns([
        "Problem Name",
        "Link",
        "Level",
        "Solved On",
        "Status",
        "Time Taken",
        "Comments",
      ]),
    ).toEqual({
      title: 0,
      url: 1,
      difficulty: 2,
      date: 3,
      result: 4,
      minutes: 5,
      notes: 6,
    });
  });
  it("reads dates day first unless told otherwise", () => {
    expect(parseCsvDate("2026-09-04")).toBe("2026-09-04");
    expect(parseCsvDate("2026/9/4")).toBe("2026-09-04");
    expect(parseCsvDate("04/09/2026")).toBe("2026-09-04");
    expect(parseCsvDate("04/09/2026", true)).toBe("2026-04-09");
    expect(parseCsvDate("09/24/2026")).toBe("2026-09-24"); // 24 can't be a month
    expect(parseCsvDate("4 Sep 2026")).toBe("2026-09-04");
    expect(parseCsvDate("Sep 4, 2026")).toBe("2026-09-04");
    expect(parseCsvDate("31/02/2026")).toBeNull();
    expect(parseCsvDate("soon")).toBeNull();
  });
  it("reads results and minutes", () => {
    expect(parseCsvResult("Solved")).toBe("solved_alone");
    expect(parseCsvResult("AC")).toBe("solved_alone");
    expect(parseCsvResult("with hints")).toBe("solved_with_hints");
    expect(parseCsvResult("saw editorial")).toBe("saw_solution");
    expect(parseCsvResult("Not solved")).toBe("not_solved");
    expect(parseCsvResult("TLE")).toBe("not_solved");
    expect(parseCsvResult("maybe")).toBeNull();
    expect(parseCsvMinutes("45")).toBe(45);
    expect(parseCsvMinutes("45 min")).toBe(45);
    expect(parseCsvMinutes("1h 20m")).toBe(80);
    expect(parseCsvMinutes("1:20")).toBe(80);
    expect(parseCsvMinutes("1.5h")).toBe(90);
    expect(parseCsvMinutes("quick")).toBeNull();
  });
  it("plans an import with matched, new and skipped rows", () => {
    const text = [
      "title,url,difficulty,date,result,minutes,notes",
      "Two Sum,,,2026-09-01,solved,12,warm-up",
      ",https://leetcode.com/problems/network-delay-time/,,2026-09-02,hints,40,",
      "743. Network Delay Time,,,2026-09-03,,30,",
      "My Own Puzzle,,hard,2026-09-04,failed,,",
      "My Own Puzzle,,hard,2026-09-05,solved,,",
      ",,,2026-09-06,solved,,",
    ].join("\n");
    const plan = planCsvImport(
      text,
      {},
      { monthFirst: false, defaultResult: "solved_alone", addUnmatched: true },
    );
    expect(plan.rows.map((r) => r.status)).toEqual([
      "matched",
      "matched",
      "matched",
      "new",
      "new",
      "skipped",
    ]);
    expect(plan.rows[0]).toMatchObject({
      match: { id: "lc-1" },
      date: "2026-09-01",
      result: "solved_alone",
      minutes: 12,
      notes: "warm-up",
    });
    expect(plan.rows[1]).toMatchObject({ match: { id: "lc-743" }, result: "solved_with_hints" });
    expect(plan.rows[2]).toMatchObject({
      match: { id: "lc-743" },
      result: "solved_alone",
      resultGiven: false,
    });
    expect(plan.rows[3]).toMatchObject({
      difficulty: "hard",
      newKey: "my-own-puzzle",
      result: "not_solved",
    });
    expect(plan).toMatchObject({ matched: 3, added: 1, skipped: 1, missingColumns: false });
    const noNew = planCsvImport(
      text,
      {},
      { monthFirst: false, defaultResult: "solved_alone", addUnmatched: false },
    );
    expect(noNew.rows[3]!.status).toBe("skipped");
    expect(
      planCsvImport(
        "foo,bar\n1,2",
        {},
        { monthFirst: false, defaultResult: "solved_alone", addUnmatched: true },
      ).missingColumns,
    ).toBe(true);
  });
  it("gives the same attempt id when the same file is imported twice", () => {
    const text = "title,date,result\nTwo Sum,2026-09-01,solved";
    const opts = { monthFirst: false, defaultResult: "solved_alone" as const, addUnmatched: true };
    const a = planCsvImport(text, {}, opts).rows[0]!;
    const b = planCsvImport(`\n${text}`, {}, opts).rows[0]!;
    expect(csvAttemptId("lc-1", a)).toBe(csvAttemptId("lc-1", b));
  });
});

describe("filters and sorting", () => {
  const states: Record<string, ProblemState> = {
    "lc-1": {
      ...makeProblem("lc-1", 2),
      srs: { step: 1, dueAt: "2026-09-20", lapses: 0, soloStreak: 1 },
    },
    "lc-743": {
      ...makeProblem("lc-743", 1),
      starred: false,
      tags: ["google"],
      srs: { step: 2, dueAt: "2026-10-01", lapses: 0, soloStreak: 1 },
    },
    [custom.problemId]: custom,
  };
  const rows = buildRows(allProblems(states), states, "normal", "2026-09-24");
  const f = (changes: Partial<typeof DEFAULT_FILTERS>) =>
    applyFilters(rows, { ...DEFAULT_FILTERS, ...changes }, false).map((r) => r.info.id);

  it("round-trips filters through the URL query", () => {
    const filters = {
      ...DEFAULT_FILTERS,
      q: "sum",
      status: "solved" as const,
      difficulty: ["easy" as const],
      due: true,
      sort: "next" as const,
      dir: "desc" as const,
      group: true,
    };
    expect(parseFilters(new URLSearchParams(filtersToQuery(filters)))).toEqual(filters);
    expect(filtersToQuery(DEFAULT_FILTERS)).toEqual({});
  });
  it("combines filters", () => {
    expect(f({ q: "743" })).toEqual(["lc-743"]);
    expect(f({ q: "two sum" })).toContain("lc-1");
    expect(f({ due: true })).toEqual(["lc-1"]);
    expect(f({ starred: true })).toEqual(["lc-1"]);
    expect(f({ tags: ["google"] })).toEqual(["lc-1", "lc-743"]);
    expect(f({ tags: ["google", "nope"] })).toEqual([]);
    expect(f({ source: "custom" })).toEqual(["custom-abc"]);
    expect(f({ status: "solved", difficulty: ["medium"] })).toEqual(["lc-743"]);
    expect(f({ source: "sql" }).length).toBeGreaterThan(20);
    expect(f({ source: "sql" }).every((id) => problemInfo(id)?.language === "sql")).toBe(true);
    expect(f({ topic: "dsa.shortest-paths" })).toContain("lc-743");
    expect(f({ topic: "dsa" })).toContain("lc-743");
    expect(f({ pattern: "dsa.heaps.top-k-elements" })).toContain("custom-abc");
    expect(f({ premium: "hide" }).some((id) => problemInfo(id, states[id])?.premium)).toBe(false);
  });
  it("sorts with empty values last in both directions", () => {
    const next = sortRows(rows, "next", "asc").map((r) => r.info.id);
    expect(next.slice(0, 2)).toEqual(["lc-1", "lc-743"]);
    const nextDesc = sortRows(rows, "next", "desc").map((r) => r.info.id);
    expect(nextDesc.slice(0, 2)).toEqual(["lc-743", "lc-1"]);
    const byTitle = sortRows(rows, "difficulty", "desc");
    expect(byTitle[0]!.info.difficulty).toBe("hard");
  });
  it("groups by topic in syllabus order and counts header stats", () => {
    const groups = groupByTopic(rows);
    expect(groups[0]!.topicId.startsWith("dsa.")).toBe(true);
    const stats = libraryStats(rows, "2026-09-24");
    expect(stats.dueToday).toBe(1);
    expect(stats.solved.easy + stats.solved.medium + stats.solved.hard).toBe(2);
  });
  it("labels reviews", () => {
    expect(reviewLabel(reviewInfo(states["lc-1"], "easy", "normal", "2026-09-24"))).toBe(
      "Overdue 4 days",
    );
    expect(reviewLabel(reviewInfo(states["lc-1"], "easy", "normal", "2026-09-20"))).toBe(
      "Due today",
    );
    expect(reviewLabel(reviewInfo(states["lc-743"], "medium", "normal", "2026-09-30"))).toBe(
      "Tomorrow",
    );
    expect(reviewLabel(reviewInfo(undefined, "medium", "normal", "2026-09-30"))).toBe("");
  });
});

describe("offline hint ladder", () => {
  it("gives three non-empty levels for every seed problem with patterns", () => {
    for (const p of SEED_PROBLEMS) {
      if (p.source === "design-lld" || p.source === "design-hld") continue;
      const levels = buildOfflineHints(p);
      expect(levels.map((l) => l.level)).toEqual([1, 2, 3]);
      for (const l of levels)
        expect(l.markdown.trim().length, `${p.id} level ${l.level}`).toBeGreaterThan(40);
      const primary = conceptById.get(p.conceptIds[0]!)!;
      // Level 1 never names the pattern; level 2 does.
      expect(levels[0]!.markdown.includes(`**${primary.name}**`)).toBe(false);
      expect(levels[1]!.markdown).toContain(primary.name);
    }
  });
  it("falls back to a general ladder for problems without patterns", () => {
    const levels = buildOfflineHints({ conceptIds: [] });
    expect(levels[1]!.markdown).toContain("No pattern is linked");
    expect(levels[2]!.markdown).toMatch(/^1\. /);
  });
});

describe("mistake statistics", () => {
  const tags: MistakeTag[] = [
    {
      id: "mt-a",
      label: "Off-by-one",
      category: "logic",
      custom: false,
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "mt-b",
      label: "Empty input",
      category: "edge-case",
      custom: false,
      updatedAt: "2026-01-01T00:00:00Z",
    },
    {
      id: "mt-c",
      label: "Old",
      category: "other",
      custom: true,
      archived: true,
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ];
  const at = (day: string, ids: string[], n: number) =>
    makeAttempt("x", n, {
      id: `x${n}`,
      startedAt: `${day}T10:00:00`,
      finishedAt: `${day}T10:30:00`,
      mistakeTagIds: ids,
    });
  const states: Record<string, ProblemState> = {
    "lc-704": {
      ...makeProblem("lc-704", 0),
      attempts: [at("2026-09-20", ["mt-a"], 1), at("2026-09-01", ["mt-a", "mt-b"], 2)],
    },
    "lc-35": {
      ...makeProblem("lc-35", 0),
      attempts: [at("2026-08-10", ["mt-a", "mt-a"], 3), at("2026-05-01", ["mt-c"], 4)],
    },
  };
  const items = taggedAttempts(states);

  it("counts each tag once per attempt, in the window, newest first", () => {
    expect(items[0]!.date).toBe("2026-09-20");
    const c30 = tagCounts(items, tags, 30, "2026-09-24");
    expect(c30.map((c) => [c.tag.id, c.count])).toEqual([
      ["mt-a", 2],
      ["mt-b", 1],
    ]);
    const all = tagCounts(items, tags, "all", "2026-09-24");
    expect(all.map((c) => [c.tag.id, c.count])).toEqual([
      ["mt-a", 3],
      ["mt-b", 1],
      ["mt-c", 1],
    ]);
  });
  it("compares with the previous window for the trend", () => {
    const c30 = tagCounts(items, tags, 30, "2026-09-24");
    expect(c30[0]).toMatchObject({ previous: 1, trend: "up" });
  });
  it("breaks down by category and pattern", () => {
    const c = categoryCounts(tagCounts(items, tags, "all", "2026-09-24"));
    expect(c.get("logic")).toBe(3);
    const top = topPatternFor(items, "mt-a", "all", "2026-09-24");
    expect(top?.conceptId.startsWith("dsa.binary-search.")).toBe(true);
    expect(top?.total).toBe(3);
  });
  it("builds a checklist without archived tags", () => {
    expect(checklistTags(items, tags, "2026-09-24").map((c) => c.tag.id)).toEqual(["mt-a", "mt-b"]);
  });
  it("merges one tag into another without duplicates", () => {
    const r = mergeTagInStates(states, "mt-b", "mt-a", "2026-09-24T00:00:00Z");
    expect(r.attempts).toBe(1);
    expect(r.changed).toHaveLength(1);
    expect(r.changed[0]!.attempts[1]!.mistakeTagIds).toEqual(["mt-a"]);
  });
  it("creates readable unique ids", () => {
    expect(newTagId("Forgot the base case!", new Set())).toBe("mt-forgot-the-base-case");
    expect(newTagId("Off by one", new Set(["mt-off-by-one"]))).toBe("mt-off-by-one-2");
  });
});

describe("Markdown export of notes", () => {
  it("groups concept notes, saved answers and problem notes by subject and topic", () => {
    const { markdown, count } = buildNotesMarkdown(
      [
        {
          conceptId: "dsa.graph-basics.bfs",
          markdown: "# My BFS notes\nUse a queue.",
          savedAnswers: [
            {
              id: "s1",
              question: "Why a queue?",
              answer: "FIFO order.",
              createdAt: "2026-09-01T00:00:00Z",
              source: "copy",
            },
          ],
          updatedAt: "2026-09-01T00:00:00Z",
        },
        {
          conceptId: "os.processes.process-states",
          markdown: "  ",
          savedAnswers: [],
          updatedAt: "2026-09-01T00:00:00Z",
        },
      ],
      [makeProblem("lc-743", 1), makeProblem("lc-1", 0)],
      new Date("2026-09-24T10:00:00"),
    );
    expect(count).toBe(3);
    expect(markdown).toContain("## Data structures and algorithms");
    expect(markdown).toContain("### Graphs: basics and traversal");
    expect(markdown).toContain("#### BFS");
    expect(markdown).toContain("##### My BFS notes");
    expect(markdown).toContain("**Saved answer: Why a queue?**");
    expect(markdown).toContain("#### Problem: 743. Network Delay Time");
    expect(markdown).toContain("**Insight:** Store what you've seen in a hash map.");
    expect(markdown.indexOf("Graphs: basics")).toBeLessThan(markdown.indexOf("Shortest paths"));
  });
});
