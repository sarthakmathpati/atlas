// The pattern drill bank (BUILD_SPEC.md 8.3): at least 270 original prompts, at least three for
// each of the 90 DSA patterns, each 2 to 4 sentences with a one-line key insight.
import { describe, expect, it } from "vitest";
import { DRILL_PROMPTS } from "@/data/drills.seed";
import { conceptById, concepts } from "@/data/syllabus";

// Sentence ends: . ! or ? (optionally followed by a closing quote or bracket) before a space or
// the end. Decimals like 0.5 and paths like /home/./docs don't count.
const sentences = (text: string) => (text.match(/[.!?]["'”)\]]*(?=\s|$)/g) ?? []).length;

describe("pattern drill bank", () => {
  it("has at least 270 prompts with unique drill ids", () => {
    expect(DRILL_PROMPTS.length).toBeGreaterThanOrEqual(270);
    const ids = DRILL_PROMPTS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^drill-[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  it("makes every DSA pattern the main answer of at least three prompts", () => {
    const patterns = concepts.filter((c) => c.isPattern && c.subjectId === "dsa");
    expect(patterns).toHaveLength(90);
    const mainAnswers = new Map<string, number>();
    for (const d of DRILL_PROMPTS) {
      const main = d.answerConceptIds[0]!;
      mainAnswers.set(main, (mainAnswers.get(main) ?? 0) + 1);
    }
    const short = patterns
      .filter((p) => (mainAnswers.get(p.id) ?? 0) < 3)
      .map((p) => `${p.id} (${mainAnswers.get(p.id) ?? 0})`);
    expect(short).toEqual([]);
  });

  it("keeps each prompt to 2 to 4 sentences and plain copy", () => {
    for (const d of DRILL_PROMPTS) {
      const n = sentences(d.text);
      expect(n, `${d.id}: ${n} sentences`).toBeGreaterThanOrEqual(2);
      expect(n, `${d.id}: ${n} sentences`).toBeLessThanOrEqual(4);
      expect(d.text, d.id).not.toMatch(/!|\bleetcode\b|\bsuccessfully\b|\bplease\b|\bsimply\b/i);
    }
  });

  it("gives every prompt a one-line key insight, valid answers and a difficulty", () => {
    for (const d of DRILL_PROMPTS) {
      expect(d.keyInsight.trim().length, d.id).toBeGreaterThan(10);
      expect(d.keyInsight, d.id).not.toMatch(/\n|!/);
      expect(d.keyInsight.length, d.id).toBeLessThanOrEqual(180);
      expect(["easy", "medium", "hard"]).toContain(d.difficulty);
      expect(new Set(d.answerConceptIds).size, d.id).toBe(d.answerConceptIds.length);
      for (const c of d.answerConceptIds)
        expect(conceptById.get(c)?.isPattern, `${d.id} → ${c}`).toBe(true);
    }
  });

  it("mixes difficulties", () => {
    const count = (level: string) => DRILL_PROMPTS.filter((d) => d.difficulty === level).length;
    expect(count("easy")).toBeGreaterThan(40);
    expect(count("medium")).toBeGreaterThan(100);
    expect(count("hard")).toBeGreaterThan(30);
  });
});
