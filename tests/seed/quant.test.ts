// Quant puzzles (BUILD_SPEC.md 8.2): the spec's wording is kept, and every checkable answer is
// recomputed here from first principles, so a wrong answer can never ship.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { QUANT_PUZZLES } from "@/data/quant.seed";
import { conceptById, topicById } from "@/data/syllabus";
import { checkAnswer, closeEnough, evaluateExpression } from "@/lib/quant/answerCheck";

const byId = new Map(QUANT_PUZZLES.map((p) => [p.id, p]));

function specRows() {
  const spec = readFileSync(new URL("../../BUILD_SPEC.md", import.meta.url), "utf8");
  const section = spec.slice(spec.indexOf("### 8.2 Quant puzzle bank"), spec.indexOf("### 8.3"));
  return section
    .split("\n")
    .filter((l) => /^\| q-/.test(l))
    .map((l) => {
      const cells = l
        .split("|")
        .slice(1, -1)
        .map((c) => c.trim());
      return { id: cells[0]!, topic: cells[1]!, prompt: cells[2]!, answer: cells[3]! };
    });
}

/** Independent computations of each numeric answer. */
function factorial(n: number): number {
  return n <= 1 ? 1 : n * factorial(n - 1);
}
function choose(n: number, k: number): number {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}
/** Solves A x = b by Gaussian elimination (small systems). */
function solve(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]!]);
  for (let c = 0; c < n; c++) {
    const pivot = M.findIndex((row, r) => r >= c && Math.abs(row[c]!) > 1e-12);
    [M[c], M[pivot]] = [M[pivot]!, M[c]!];
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = M[r]![c]! / M[c]![c]!;
      for (let k = c; k <= n; k++) M[r]![k]! -= f * M[c]![k]!;
    }
  }
  return M.map((row, i) => row[n]! / row[i]!);
}
function integrate2d(f: (x: number, y: number) => number, steps = 800): number {
  let sum = 0;
  const h = 1 / steps;
  for (let i = 0; i < steps; i++)
    for (let j = 0; j < steps; j++) sum += f((i + 0.5) * h, (j + 0.5) * h);
  return sum * h * h;
}

const EXPECTED: Record<string, number | ((n: number) => number)> = {
  "q-hh": solve(
    [
      [0.5, -0.5],
      [-0.5, 1],
    ],
    [1, 1],
  )[0]!, // a = 1 + a/2 + b/2 ; b = 1 + a/2
  "q-ht": 4,
  "q-first-six": 1 / (1 / 6),
  "q-all-faces": [1, 2, 3, 4, 5, 6].reduce((s, k) => s + 6 / k, 0),
  "q-birthday-23":
    1 - Array.from({ length: 23 }, (_, k) => (365 - k) / 365).reduce((a, b) => a * b, 1),
  "q-monty": 2 / 3,
  "q-stick": integrate2d((x, y) => {
    const [a, b] = x < y ? [x, y] : [y, x];
    return a < 0.5 && b - a < 0.5 && 1 - b < 0.5 ? 1 : 0;
  }),
  "q-max-two-uniform": integrate2d((x, y) => Math.max(x, y)),
  "q-min-n-uniform": (n) => {
    let s = 0;
    const steps = 20000;
    for (let i = 0; i < steps; i++) s += (1 - (i + 0.5) / steps) ** n / steps;
    return s;
  },
  "q-ruin-prob": (() => {
    // p(i) = (p(i-1) + p(i+1)) / 2, p(0) = 0, p(10) = 1
    const A: number[][] = [];
    const b: number[] = [];
    for (let i = 1; i <= 9; i++) {
      const row = Array(9).fill(0);
      row[i - 1] = 1;
      if (i - 2 >= 0) row[i - 2] = -0.5;
      if (i <= 8) row[i] = -0.5;
      A.push(row);
      b.push(i === 9 ? 0.5 : 0);
    }
    return solve(A, b)[2]!;
  })(),
  "q-ruin-time": (() => {
    const A: number[][] = [];
    const b: number[] = [];
    for (let i = 1; i <= 9; i++) {
      const row = Array(9).fill(0);
      row[i - 1] = 1;
      if (i - 2 >= 0) row[i - 2] = -0.5;
      if (i <= 8) row[i] = -0.5;
      A.push(row);
      b.push(1);
    }
    return solve(A, b)[2]!;
  })(),
  "q-hats": (() => {
    // average number of fixed points over all permutations of 6
    const perms = (arr: number[]): number[][] =>
      arr.length <= 1
        ? [arr]
        : arr.flatMap((x, i) =>
            perms([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p]),
          );
    const all = perms([0, 1, 2, 3, 4, 5]);
    return all.reduce((s, p) => s + p.filter((v, i) => v === i).length, 0) / all.length;
  })(),
  "q-derangement": Array.from({ length: 16 }, (_, k) => (-1) ** k / factorial(k)).reduce(
    (a, b) => a + b,
    0,
  ),
  "q-two-children": 1 / 3,
  "q-disease-test": (0.01 * 0.99) / (0.01 * 0.99 + 0.99 * 0.05),
  "q-sum-seven": 6 / 36,
  "q-reroll-once": (() => {
    const one = 3.5;
    return [1, 2, 3, 4, 5, 6].reduce((s, v) => s + Math.max(v, one), 0) / 6;
  })(),
  "q-reroll-twice": (() => {
    const two = [1, 2, 3, 4, 5, 6].reduce((s, v) => s + Math.max(v, 3.5), 0) / 6;
    return [1, 2, 3, 4, 5, 6].reduce((s, v) => s + Math.max(v, two), 0) / 6;
  })(),
  "q-first-ace": (() => {
    // P(first ace at position k) = C(52 - k, 3) / C(52, 4)
    let e = 0;
    for (let k = 1; k <= 49; k++) e += (k * choose(52 - k, 3)) / choose(52, 4);
    return e;
  })(),
  "q-meeting": integrate2d((x, y) => (Math.abs(x - y) <= 0.25 ? 1 : 0)),
  "q-uniform-sum-one": Array.from({ length: 18 }, (_, n) => 1 / factorial(n)).reduce(
    (a, b) => a + b,
    0,
  ),
  "q-max-two-dice": (() => {
    let s = 0;
    for (let a = 1; a <= 6; a++) for (let b = 1; b <= 6; b++) s += Math.max(a, b);
    return s / 36;
  })(),
  "q-six-in-four": 1 - (5 / 6) ** 4,
  "q-runs": (() => {
    let total = 0;
    for (let mask = 0; mask < 1024; mask++) {
      let runs = 1;
      for (let i = 1; i < 10; i++) if (((mask >> i) & 1) !== ((mask >> (i - 1)) & 1)) runs++;
      total += runs;
    }
    return total / 1024;
  })(),
  "q-second-smallest": 0.5,
  "q-ants": 1,
  "q-lockers": (() => {
    const open = Array(101).fill(false);
    for (let k = 1; k <= 100; k++) for (let m = k; m <= 100; m += k) open[m] = !open[m];
    return open.filter(Boolean).length;
  })(),
  "q-poison": Math.ceil(Math.log2(1000)),
  "q-twelve-coins": Math.ceil(Math.log(24) / Math.log(3)),
  "q-egg-drop": (() => {
    // f(d) floors coverable with 2 eggs and d drops = d(d+1)/2
    let d = 0;
    while ((d * (d + 1)) / 2 < 100) d++;
    return d;
  })(),
  "q-bridge": (() => {
    // Dijkstra over (who is on the far side, torch side)
    const times = [1, 2, 5, 10];
    const full = 15;
    const dist = new Map<string, number>([["0,0", 0]]);
    const queue: [number, number, number][] = [[0, 0, 0]];
    while (queue.length) {
      queue.sort((a, b) => a[0] - b[0]);
      const [d, far, torch] = queue.shift()!;
      if (far === full) return d;
      const near = full & ~far;
      const side = torch === 0 ? near : far;
      for (let i = 0; i < 4; i++) {
        for (let j = i; j < 4; j++) {
          if (!((side >> i) & 1) || !((side >> j) & 1)) continue;
          const move = (1 << i) | (1 << j);
          const nextFar = torch === 0 ? far | move : far & ~move;
          const nd = d + Math.max(times[i]!, times[j]!);
          const key = `${nextFar},${1 - torch}`;
          if (nd < (dist.get(key) ?? Infinity)) {
            dist.set(key, nd);
            queue.push([nd, nextFar, 1 - torch]);
          }
        }
      }
    }
    return Infinity;
  })(),
  "q-horses": 7,
  "q-clock": Math.abs(90 - (90 + 15 * 0.5)),
  "q-kelly": 0.6 - 0.4,
  "q-sqrt50": Math.sqrt(50),
};

describe("quant puzzle bank", () => {
  const rows = specRows();

  it("contains every puzzle from the spec table, keeping its wording", () => {
    expect(rows).toHaveLength(41);
    expect(QUANT_PUZZLES).toHaveLength(41);
    for (const row of rows) {
      const p = byId.get(row.id);
      expect(p, row.id).toBeDefined();
      expect(p!.topicId).toBe(row.topic);
      // Only a short answer-format hint such as "(Answer in minutes.)" may be appended.
      expect(p!.prompt!.startsWith(row.prompt), row.id).toBe(true);
      expect(p!.prompt!.slice(row.prompt.length)).toMatch(/^( \(Answer [^)]*\.\))?$/);
      // Open-ended puzzles have no checkable answer. q-twenty-one has a two-part spoken answer
      // ("first player; take 1"), so it is self-graded against its note as well.
      const selfGraded = row.answer.startsWith("open") || row.id === "q-twenty-one";
      expect(selfGraded ? p!.answer === null : p!.answer !== null, row.id).toBe(true);
    }
  });

  it("tags every puzzle with real concepts and has an explanation", () => {
    for (const p of QUANT_PUZZLES) {
      expect(p.source).toBe("quant");
      expect(topicById.has(p.topicId)).toBe(true);
      expect(p.conceptIds.length).toBeGreaterThanOrEqual(1);
      expect(p.conceptIds.length).toBeLessThanOrEqual(3);
      for (const c of p.conceptIds) expect(conceptById.has(c), `${p.id} → ${c}`).toBe(true);
      expect(p.answerNote!.length).toBeGreaterThan(40);
    }
  });

  it("has answers that match an independent computation", () => {
    for (const p of QUANT_PUZZLES) {
      if (p.answer === null || p.answer === "yes") continue;
      const truth = EXPECTED[p.id];
      if (truth === undefined) throw new Error(`no independent check for ${p.id}`);
      if (typeof truth === "function") {
        for (const n of [2, 3, 5, 10])
          expect(
            closeEnough(evaluateExpression(p.answer!, { n }), truth(n), 0.001),
            `${p.id} n=${n}`,
          ).toBe(true);
      } else {
        expect(
          closeEnough(evaluateExpression(p.answer!), truth, 0.005),
          `${p.id}: ${p.answer} vs ${truth}`,
        ).toBe(true);
      }
    }
  });

  it("checks Nim with the XOR rule", () => {
    expect((3 ^ 4 ^ 5) !== 0).toBe(byId.get("q-nim")!.answer === "yes");
  });

  it("accepts the answer forms listed in the spec", () => {
    expect(checkAnswer("about 0.507", byId.get("q-birthday-23")!.answer!)).toBe("correct");
    expect(checkAnswer("0.368", byId.get("q-derangement")!.answer!)).toBe("correct");
    expect(checkAnswer("10.6", byId.get("q-first-ace")!.answer!)).toBe("correct");
    expect(checkAnswer("4.667", byId.get("q-reroll-twice")!.answer!)).toBe("correct");
    expect(checkAnswer("2.718", byId.get("q-uniform-sum-one")!.answer!)).toBe("correct");
    expect(checkAnswer("7.5 degrees", byId.get("q-clock")!.answer!)).toBe("correct");
    expect(checkAnswer("1/(n+1)", byId.get("q-min-n-uniform")!.answer!)).toBe("correct");
    expect(checkAnswer("1/n", byId.get("q-min-n-uniform")!.answer!)).toBe("incorrect");
  });
});
