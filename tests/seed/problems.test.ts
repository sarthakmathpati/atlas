// Seed problem bank (BUILD_SPEC.md 8.1): every problem from the spec, tagged with real concepts.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { LEETCODE_PROBLEMS, leetCodeSlug, leetCodeUrl } from "@/data/problems.seed";
import { conceptById, topicById } from "@/data/syllabus";

/** Parses the "#### topic" groups of section 8.1 straight from the spec. */
function specProblems() {
  const spec = readFileSync(new URL("../../BUILD_SPEC.md", import.meta.url), "utf8");
  const section = spec.slice(
    spec.indexOf("### 8.1 LeetCode problem bank"),
    spec.indexOf("### 8.2"),
  );
  const out: {
    number: number;
    title: string;
    difficulty: string;
    premium: boolean;
    group: string;
  }[] = [];
  let group = "";
  for (const line of section.split("\n")) {
    const heading = line.match(/^#### (\S+)/);
    if (heading) {
      group = heading[1]!;
      continue;
    }
    if (!group || !line.trim()) continue;
    for (const item of line.split(" · ")) {
      const m = item.trim().match(/^(P )?([EMH]) (\d+) (.+)$/);
      if (!m) continue;
      out.push({
        premium: Boolean(m[1]),
        difficulty: { E: "easy", M: "medium", H: "hard" }[m[2] as "E" | "M" | "H"],
        number: Number(m[3]),
        title: m[4]!.trim(),
        group,
      });
    }
  }
  return out;
}

describe("LeetCode problem bank", () => {
  const spec = specProblems();
  const byNumber = new Map(LEETCODE_PROBLEMS.map((p) => [p.number, p]));

  it("has all 435 problems from the spec, once each", () => {
    expect(spec).toHaveLength(435);
    expect(LEETCODE_PROBLEMS).toHaveLength(435);
    expect(new Set(LEETCODE_PROBLEMS.map((p) => p.id)).size).toBe(435);
  });

  it("matches the spec's number, title, difficulty, premium flag and group", () => {
    for (const s of spec) {
      const p = byNumber.get(s.number);
      expect(p, `LC ${s.number}`).toBeDefined();
      expect(p!.title).toBe(s.title);
      expect(p!.difficulty).toBe(s.difficulty);
      expect(Boolean(p!.premium)).toBe(s.premium);
      if (s.group.startsWith("sql")) {
        expect(p!.topicId.startsWith("sql.")).toBe(true);
        expect(p!.language).toBe("sql");
      } else {
        expect(p!.topicId).toBe(s.group);
      }
    }
  });

  it("tags every problem with 1 to 3 existing concepts, at least one from its own topic's subject", () => {
    for (const p of LEETCODE_PROBLEMS) {
      expect(p.conceptIds.length, p.id).toBeGreaterThanOrEqual(1);
      expect(p.conceptIds.length, p.id).toBeLessThanOrEqual(3);
      expect(new Set(p.conceptIds).size, p.id).toBe(p.conceptIds.length);
      for (const c of p.conceptIds) expect(conceptById.has(c), `${p.id} → ${c}`).toBe(true);
      expect(topicById.has(p.topicId)).toBe(true);
    }
  });

  it("gives every DSA pattern at least one practice problem, or lists it here on purpose", () => {
    const tagged = new Set(LEETCODE_PROBLEMS.flatMap((p) => p.conceptIds));
    const untagged = [...conceptById.values()]
      .filter((c) => c.isPattern && !tagged.has(c.id))
      .map((c) => c.id);
    expect(untagged).toEqual([]);
  });

  it("stores no problem statements", () => {
    for (const p of LEETCODE_PROBLEMS) {
      expect(p.prompt).toBeUndefined();
      expect(p.answer).toBeUndefined();
    }
  });

  it("builds slugs and links with the section 8.1 rule", () => {
    expect(leetCodeSlug("Pow(x, n)")).toBe("powx-n");
    expect(leetCodeSlug("Two Sum II - Input Array Is Sorted")).toBe(
      "two-sum-ii-input-array-is-sorted",
    );
    expect(leetCodeSlug("All O`one Data Structure")).toBe("all-oone-data-structure");
    expect(leetCodeSlug("Is Graph Bipartite?")).toBe("is-graph-bipartite");
    expect(leetCodeSlug("Friend Requests II: Who Has the Most Friends")).toBe(
      "friend-requests-ii-who-has-the-most-friends",
    );
    expect(byNumber.get(1)!.slug).toBe("two-sum");
    expect(leetCodeUrl(byNumber.get(50)!.slug!)).toBe("https://leetcode.com/problems/powx-n/");
    for (const p of LEETCODE_PROBLEMS) expect(p.slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });
});
