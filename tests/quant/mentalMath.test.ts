import { describe, expect, it } from "vitest";
import { hashSeed } from "@/lib/random";
import {
  ESTIMATION_TOLERANCE,
  SPRINT_MODE_ORDER,
  SPRINT_MODES,
  generateSprint,
  gradeSprintAnswer,
  isUnambiguous,
  readSprintNumber,
  sequencePredictions,
  sprintCheckScore,
  summarizeSprint,
  type SprintQuestion,
  type SprintTier,
} from "@/lib/quant/mentalMath";
import { syllabus } from "@/data/syllabus";

const TIERS: SprintTier[] = ["easy", "medium", "hard"];
const SEEDS = Array.from({ length: 25 }, (_, i) => hashSeed(`test-${i}`));

function decimals(n: number): number {
  const s = String(Math.round(n * 1e9) / 1e9);
  return s.includes(".") ? s.split(".")[1]!.length : 0;
}

/** Evaluates a speed arithmetic prompt ("47 × 6", "28.2 ÷ 6") exactly, in tenths. */
function evaluateSpeed(prompt: string): number {
  const m = /^([\d.,]+) ([+−×÷]) ([\d.,]+)$/.exec(prompt);
  if (!m) throw new Error(`unexpected prompt ${prompt}`);
  const a = Number(m[1]!.replace(/,/g, ""));
  const b = Number(m[3]!.replace(/,/g, ""));
  switch (m[2]) {
    case "+":
      return a + b;
    case "−":
      return a - b;
    case "×":
      return a * b;
    default:
      return a / b;
  }
}

describe("speed arithmetic", () => {
  it("has 80 questions in 8 minutes", () => {
    expect(SPRINT_MODES.speed.count).toBe(80);
    expect(SPRINT_MODES.speed.seconds).toBe(480);
    expect(generateSprint("speed", "medium", 1)).toHaveLength(80);
  });

  it("gives answers that divide cleanly and match the prompt, at every tier", () => {
    for (const tier of TIERS) {
      for (const seed of SEEDS) {
        for (const q of generateSprint("speed", tier, seed)) {
          const exact = evaluateSpeed(q.prompt);
          expect(Math.abs(exact - q.answer), q.prompt).toBeLessThan(1e-9);
          // Whole numbers or at most two decimals (one-decimal × one-digit); never repeating.
          expect(decimals(q.answer), q.prompt).toBeLessThanOrEqual(2);
          expect(q.answer, q.prompt).toBeGreaterThanOrEqual(0);
          if (q.kind === "div") expect(decimals(q.answer), q.prompt).toBeLessThanOrEqual(1);
          expect(gradeSprintAnswer(q, q.display)).toBe("correct");
          expect(gradeSprintAnswer(q, String(q.answer))).toBe("correct");
        }
      }
    }
  });

  it("uses the tier's multiplication sizes: 2 by 1 digits up to 3 by 2", () => {
    const sizes = (tier: SprintTier) =>
      SEEDS.flatMap((s) => generateSprint("speed", tier, s))
        .filter((q) => q.kind === "mul" && !q.prompt.includes("."))
        .map((q) => q.prompt.split(" × ").map((x) => x.length));
    expect(sizes("easy").every(([a, b]) => a === 2 && b === 1)).toBe(true);
    expect(sizes("medium").every(([a, b]) => a === 2 && b === 2)).toBe(true);
    expect(sizes("hard").every(([a, b]) => a === 3 && b === 2)).toBe(true);
  });

  it("mixes all four operations and some one-decimal numbers", () => {
    const qs = SEEDS.flatMap((s) => generateSprint("speed", "medium", s));
    for (const k of ["add", "sub", "mul", "div"]) {
      expect(qs.filter((q) => q.kind === k).length / qs.length).toBeGreaterThan(0.15);
    }
    const withDecimals = qs.filter((q) => q.prompt.includes(".")).length / qs.length;
    expect(withDecimals).toBeGreaterThan(0.1);
    expect(withDecimals).toBeLessThan(0.3);
  });

  it("is the same sprint for the same seed and never repeats a question back to back", () => {
    expect(generateSprint("speed", "hard", 42)).toEqual(generateSprint("speed", "hard", 42));
    expect(generateSprint("speed", "hard", 42)).not.toEqual(generateSprint("speed", "hard", 43));
    for (const seed of SEEDS) {
      const qs = generateSprint("speed", "easy", seed);
      qs.slice(1).forEach((q, i) => expect(q.prompt).not.toBe(qs[i]!.prompt));
    }
  });
});

describe("fractions and percentages", () => {
  it("has exact answers that the display form checks as correct", () => {
    for (const tier of TIERS) {
      for (const seed of SEEDS) {
        for (const q of generateSprint("fractions", tier, seed)) {
          expect(gradeSprintAnswer(q, q.display), `${q.prompt} = ${q.display}`).toBe("correct");
          expect(Number.isFinite(q.answer)).toBe(true);
          expect(q.answer).toBeGreaterThanOrEqual(0);
          if (q.kind === "percent-of" || q.kind === "part-of") {
            expect(Number.isInteger(q.answer) || decimals(q.answer) <= 2, q.prompt).toBe(true);
          }
          if (q.kind === "to-decimal")
            expect(decimals(q.answer), q.prompt).toBeLessThanOrEqual(tier === "hard" ? 4 : 3);
        }
      }
    }
  });

  it("accepts a fraction or its decimal for fraction sums, and rejects a wrong one", () => {
    const q: SprintQuestion = {
      index: 0,
      prompt: "1/4 + 1/6",
      answer: 5 / 12,
      display: "5/12",
      tolerance: 0.002,
      fraction: true,
      kind: "add-fractions",
    };
    expect(gradeSprintAnswer(q, "5/12")).toBe("correct");
    expect(gradeSprintAnswer(q, "10/24")).toBe("correct");
    expect(gradeSprintAnswer(q, "0.417")).toBe("correct");
    expect(gradeSprintAnswer(q, "0.42")).toBe("incorrect");
    expect(gradeSprintAnswer(q, "1/3")).toBe("incorrect");
    expect(gradeSprintAnswer(q, "1/0")).toBe("unreadable");
  });

  it("reads percentages with or without the sign", () => {
    const q = generateSprint("fractions", "medium", 7).find((x) => x.display.endsWith("%"));
    expect(q).toBeDefined();
    expect(gradeSprintAnswer(q!, q!.display)).toBe("correct");
    expect(gradeSprintAnswer(q!, q!.display.replace("%", ""))).toBe("correct");
  });
});

describe("number sequences", () => {
  it("only asks sequences whose next term every simple rule agrees on", () => {
    for (const tier of TIERS) {
      for (const seed of SEEDS) {
        for (const q of generateSprint("sequences", tier, seed)) {
          const terms = q.prompt
            .replace(", …", "")
            .split(", ")
            .map((t) => Number(t.replace(/,/g, "")));
          expect(terms.length).toBeGreaterThanOrEqual(5);
          expect(isUnambiguous(terms, q.answer), q.prompt).toBe(true);
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(Number.isInteger(q.answer)).toBe(true);
        }
      }
    }
  });

  it("detects rules and ambiguity", () => {
    expect(sequencePredictions([2, 5, 8, 11, 14])).toEqual([17]);
    expect(isUnambiguous([1, 4, 9, 16, 25], 36)).toBe(true);
    expect(isUnambiguous([3, 7, 15, 31, 63], 127)).toBe(true);
    expect(isUnambiguous([1, 2, 3, 5, 8], 13)).toBe(true);
    expect(isUnambiguous([5, 7, 11, 13, 17], 19)).toBe(true);
    // Consecutive primes that also alternate +2, +4: 25 or 29, so never asked.
    expect(isUnambiguous([11, 13, 17, 19, 23], 29)).toBe(false);
    // No simple rule fits.
    expect(isUnambiguous([4, 1, 7, 3, 9], 2)).toBe(false);
  });

  it("gets harder by tier", () => {
    const kinds = (tier: SprintTier) =>
      new Set(SEEDS.flatMap((s) => generateSprint("sequences", tier, s)).map((q) => q.kind));
    expect([...kinds("easy")].sort()).toEqual(["arithmetic", "geometric", "squares"]);
    expect(kinds("hard").has("cubes") || kinds("hard").has("interleaved")).toBe(true);
  });
});

describe("estimation", () => {
  it("accepts anything within 5% and nothing beyond", () => {
    expect(ESTIMATION_TOLERANCE).toBe(0.05);
    for (const tier of TIERS) {
      for (const q of generateSprint("estimation", tier, SEEDS[3]!)) {
        expect(q.tolerance).toBe(0.05);
        const inside = q.answer * 1.045;
        const outside = q.answer * 1.06;
        const low = q.answer * 0.955;
        expect(gradeSprintAnswer(q, String(inside)), q.prompt).toBe("correct");
        expect(gradeSprintAnswer(q, String(low)), q.prompt).toBe("correct");
        expect(gradeSprintAnswer(q, String(outside)), q.prompt).toBe("incorrect");
        expect(gradeSprintAnswer(q, String(q.answer * 0.94)), q.prompt).toBe("incorrect");
        expect(gradeSprintAnswer(q, q.display), q.prompt).toBe("correct");
      }
    }
  });

  it("states the exact answer behind each prompt", () => {
    const qs = SEEDS.flatMap((s) => generateSprint("estimation", "hard", s));
    const sqrt = qs.find((q) => q.kind === "sqrt");
    expect(sqrt).toBeDefined();
    const n = Number(sqrt!.prompt.slice(1).replace(/,/g, ""));
    expect(sqrt!.answer).toBeCloseTo(Math.sqrt(n), 9);
  });
});

describe("answers and scoring", () => {
  it("reads numbers strictly, never expressions", () => {
    expect(readSprintNumber("14,123", false)).toBe(14123);
    expect(readSprintNumber(" 282 ", false)).toBe(282);
    expect(readSprintNumber(".5", false)).toBe(0.5);
    expect(readSprintNumber("37.5%", false)).toBe(37.5);
    expect(readSprintNumber("−4", false)).toBe(-4);
    expect(readSprintNumber("5/12", false)).toBeNull();
    expect(readSprintNumber("5/12", true)).toBeCloseTo(5 / 12, 12);
    expect(readSprintNumber("47*6", false)).toBeNull();
    expect(readSprintNumber("", false)).toBeNull();
    expect(readSprintNumber("1,23", false)).toBeNull();
  });

  it("summarizes a sprint and turns it into a check score", () => {
    const answers = [
      { index: 0, given: "1", verdict: "correct" as const, ms: 3000 },
      { index: 1, given: "2", verdict: "incorrect" as const, ms: 4000 },
      { index: 2, given: "", verdict: "skipped" as const, ms: 1000 },
      { index: 3, given: "4", verdict: "correct" as const, ms: 2000 },
    ];
    const s = summarizeSprint(answers, 80, 30);
    expect(s).toMatchObject({ correct: 2, incorrect: 1, skipped: 1, answered: 3, total: 80 });
    expect(s.score).toBeCloseTo(2 / 80);
    expect(s.accuracy).toBeCloseTo(2 / 3);
    expect(s.secondsPerAnswer).toBeCloseTo(10);
    expect(sprintCheckScore(64, 80, "medium")).toBeCloseTo(0.8);
    expect(sprintCheckScore(80, 80, "easy")).toBeCloseTo(0.8);
    expect(sprintCheckScore(64, 80, "easy")).toBeCloseTo(0.64);
    expect(sprintCheckScore(90, 80, "hard")).toBe(1);
  });

  it("records checks on concepts that exist", () => {
    const ids = new Set(syllabus.concepts.map((c) => c.id));
    for (const mode of SPRINT_MODE_ORDER) {
      for (const id of SPRINT_MODES[mode].conceptIds) expect(ids.has(id), id).toBe(true);
    }
  });
});
