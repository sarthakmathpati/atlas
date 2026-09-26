// Design prompts (8.4), behavioral questions (8.5), mistake tags (8.6) and the combined seed
// index. Drills (8.3) are checked in drills.test.ts.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BEHAVIORAL_QUESTIONS, STORY_TAGS } from "@/data/behavioral.seed";
import { DESIGN_PROBLEMS } from "@/data/designs.seed";
import { MISTAKE_TAG_SEED } from "@/data/mistakeTags.seed";
import { SEED_PROBLEMS, seedProblemById, seedProblemsByConcept } from "@/data/seed";
import { conceptById, concepts } from "@/data/syllabus";
import { slugifyConceptName } from "@/lib/slug";
import { slugify } from "../../scripts/lib/spec.mjs";

const spec = readFileSync(new URL("../../BUILD_SPEC.md", import.meta.url), "utf8");

describe("design prompts", () => {
  it("has one prompt for every concept in lld.classics and sysd.classics", () => {
    const targets = concepts.filter(
      (c) => c.topicId === "lld.classics" || c.topicId === "sysd.classics",
    );
    expect(targets).toHaveLength(46);
    expect(DESIGN_PROBLEMS).toHaveLength(46);
    const covered = new Set(DESIGN_PROBLEMS.flatMap((p) => p.conceptIds));
    for (const c of targets) expect(covered.has(c.id), c.id).toBe(true);
  });

  it("has a 3 to 6 sentence prompt and 3 to 5 rubric points", () => {
    for (const p of DESIGN_PROBLEMS) {
      const sentences = (p.prompt!.match(/[.?!](\s|$)/g) ?? []).length;
      // The spec's own URL shortener example is one sentence and is kept word for word.
      expect(sentences, p.id).toBeGreaterThanOrEqual(p.id === "hld-url-shortener" ? 1 : 3);
      expect(sentences, p.id).toBeLessThanOrEqual(6);
      expect(p.rubric!.length, p.id).toBeGreaterThanOrEqual(3);
      expect(p.rubric!.length, p.id).toBeLessThanOrEqual(5);
      expect(p.source).toBe(p.id.startsWith("lld-") ? "design-lld" : "design-hld");
      expect(p.title).toBe(conceptById.get(p.conceptIds[0]!)!.name);
    }
  });

  it("uses the spec's example prompts for the parking lot and URL shortener", () => {
    const parking = seedProblemById.get("lld-parking-lot")!;
    const url = seedProblemById.get("hld-url-shortener")!;
    expect(spec).toContain(parking.prompt!);
    expect(spec).toContain(url.prompt!);
  });
});

describe("behavioral questions", () => {
  it("has the 30 questions from the spec with unique ids and known tags", () => {
    const line = spec
      .slice(spec.indexOf("### 8.5"))
      .split("\n")
      .find((l) => l.startsWith("Tell me about yourself"))!;
    const specQuestions = line.split(" · ").map((s) => s.trim());
    expect(specQuestions).toHaveLength(30);
    expect(BEHAVIORAL_QUESTIONS.map((q) => q.text)).toEqual(specQuestions);
    expect(new Set(BEHAVIORAL_QUESTIONS.map((q) => q.id)).size).toBe(30);
    for (const q of BEHAVIORAL_QUESTIONS) {
      expect(q.id).toMatch(/^bq-[a-z0-9-]+$/);
      expect(q.suggestedTags.length).toBeGreaterThan(0);
      for (const t of q.suggestedTags) expect(STORY_TAGS).toContain(t);
    }
  });
});

describe("mistake tags", () => {
  it("has every default tag from the spec, in its category", () => {
    const section = spec.slice(spec.indexOf("### 8.6"), spec.indexOf("## 9. Features"));
    const rows = section
      .split("\n")
      .filter((l) => /^\| [a-z-]+ \|/.test(l) && !l.startsWith("| Category"));
    const expected = rows.flatMap((row) => {
      const [category, tags] = row
        .split("|")
        .slice(1, 3)
        .map((c) => c.trim());
      return tags!.split(" · ").map((label) => ({ category, label }));
    });
    expect(expected).toHaveLength(33);
    expect(MISTAKE_TAG_SEED.map((t) => ({ category: t.category, label: t.label }))).toEqual(
      expected,
    );
    expect(new Set(MISTAKE_TAG_SEED.map((t) => t.id)).size).toBe(33);
    for (const t of MISTAKE_TAG_SEED) expect(t.howToAvoid!.length).toBeGreaterThan(10);
  });
});

describe("combined seed index", () => {
  it("has unique ids across every bank", () => {
    // LeetCode problems, spec quant puzzles, original quant puzzles (Phase 5), design prompts
    expect(SEED_PROBLEMS).toHaveLength(435 + 41 + 57 + 46);
    expect(seedProblemById.size).toBe(SEED_PROBLEMS.length);
  });

  it("links problems back to concepts", () => {
    expect(seedProblemsByConcept.get("dsa.hashing.complement-lookup")!.map((p) => p.id)).toContain(
      "lc-1",
    );
    expect(seedProblemsByConcept.get("lld.classics.parking-lot")!.map((p) => p.id)).toEqual(
      expect.arrayContaining(["lld-parking-lot", "lc-1603"]),
    );
  });

  it("uses the same slug rule as the build scripts", () => {
    for (const c of concepts) expect(slugifyConceptName(c.name)).toBe(slugify(c.name));
  });
});
