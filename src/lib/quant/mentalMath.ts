// Mental math sprints (BUILD_SPEC.md F28): four modes, three difficulty tiers, every question
// generated locally from a seed, so a sprint works offline and tests can replay it exactly.
//
// Speed arithmetic mixes +, −, × and ÷ with whole numbers and one-decimal numbers; division is
// built backwards from a product, so every answer divides cleanly. Fractions and percentages,
// number sequences (only sequences whose next term is the same under every simple rule that fits
// them) and estimation (answers within 5% count). Pure functions; the page keeps the clock.
import { mulberry32 } from "@/lib/random";

export type SprintMode = "speed" | "fractions" | "sequences" | "estimation";
export type SprintTier = "easy" | "medium" | "hard";

export interface SprintModeInfo {
  label: string;
  /** One line on what the sprint asks. */
  description: string;
  /** Questions in a full sprint. */
  count: number;
  /** Time for the whole sprint. */
  seconds: number;
  /** Concepts a finished sprint records a check on (F28). */
  conceptIds: readonly string[];
  /** Keyboard hint for phones: fractions need "/". */
  inputMode: "decimal" | "text";
}

export const SPRINT_MODES: Record<SprintMode, SprintModeInfo> = {
  speed: {
    label: "Speed arithmetic",
    description: "80 questions in 8 minutes: +, −, × and ÷ with whole and one-decimal numbers.",
    count: 80,
    seconds: 480,
    conceptIds: ["math.mental.fast-arithmetic", "math.mental.speed-drills"],
    inputMode: "decimal",
  },
  fractions: {
    label: "Fractions and percentages",
    description: "30 questions in 5 minutes: percentages, fraction and decimal conversions.",
    count: 30,
    seconds: 300,
    conceptIds: ["math.mental.fractions-decimals-and-percentages"],
    inputMode: "text",
  },
  sequences: {
    label: "Number sequences",
    description: "20 sequences in 5 minutes: find the next term.",
    count: 20,
    seconds: 300,
    conceptIds: ["apt.quant.number-series-and-sequences"],
    inputMode: "decimal",
  },
  estimation: {
    label: "Estimation",
    description: "20 questions in 5 minutes: any answer within 5% counts.",
    count: 20,
    seconds: 300,
    conceptIds: ["math.mental.approximations"],
    inputMode: "decimal",
  },
};

export const SPRINT_MODE_ORDER: readonly SprintMode[] = [
  "speed",
  "fractions",
  "sequences",
  "estimation",
];

export const SPRINT_TIERS: Record<SprintTier, { label: string; description: string }> = {
  easy: { label: "Easy", description: "2-digit by 1-digit multiplication, small sums." },
  medium: { label: "Medium", description: "2-digit by 2-digit multiplication, 3-digit sums." },
  hard: { label: "Hard", description: "3-digit by 2-digit multiplication, 4-digit sums." },
};

/** Relative tolerance for estimation answers. */
export const ESTIMATION_TOLERANCE = 0.05;

/**
 * Easy sprints count at 80% toward a concept's knowledge, so an interview-level skill needs
 * medium or hard runs to turn green (an easy run can reach 0.8 only with every answer right).
 */
export const TIER_WEIGHT: Record<SprintTier, number> = { easy: 0.8, medium: 1, hard: 1 };

export interface SprintQuestion {
  /** Position in the sprint (0-based). */
  index: number;
  /** What to show: "47 × 6", "15% of 240", "2, 5, 10, 17, 26, …". */
  prompt: string;
  /** The exact answer. */
  answer: number;
  /** The answer as shown after answering: "282", "5/12", "14,123". */
  display: string;
  /** Relative tolerance: 0.05 for estimation; a rounding allowance for repeating decimals. */
  tolerance: number;
  /** A fraction answer may be typed as a fraction ("5/12") or a decimal. */
  fraction: boolean;
  /** The question family, for the results list ("mul", "percent-of", "geometric", …). */
  kind: string;
}

// ----- helpers ---------------------------------------------------------------------------------

type Rng = () => number;

/** A whole number in [lo, hi]. */
function int(rng: Rng, lo: number, hi: number): number {
  return lo + Math.floor(rng() * (hi - lo + 1));
}

function pick<T>(rng: Rng, list: readonly T[]): T {
  return list[Math.floor(rng() * list.length)]!;
}

function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

const grouped = new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 });

/** Numbers of 5 digits or more get separators ("14,123"); smaller ones stay plain ("4180"). */
export function formatNumber(n: number): string {
  const rounded = Math.round(n * 1e6) / 1e6;
  if (Math.abs(rounded) >= 10_000) return grouped.format(rounded);
  return String(rounded);
}

/** One-decimal numbers are generated in tenths (integers), so no float error creeps in. */
const tenths = (t: number): string => formatNumber(t / 10);

/** A number of tenths in [lo, hi] that isn't whole (4.7, never 5). */
function tenthsInt(rng: Rng, lo: number, hi: number): number {
  let t = int(rng, lo, hi);
  while (t % 10 === 0) t = int(rng, lo, hi);
  return t;
}

function reduce(n: number, d: number): [number, number] {
  const g = gcd(n, d) || 1;
  return [n / g, d / g];
}

function fractionText(n: number, d: number): string {
  const [a, b] = reduce(n, d);
  return b === 1 ? String(a) : `${a}/${b}`;
}

/** True when n/d has a terminating decimal expansion (denominator of 2s and 5s only). */
function terminates(n: number, d: number): boolean {
  let [, b] = reduce(n, d);
  while (b % 2 === 0) b /= 2;
  while (b % 5 === 0) b /= 5;
  return b === 1;
}

function question(
  q: Omit<SprintQuestion, "index" | "tolerance" | "fraction" | "display"> &
    Partial<Pick<SprintQuestion, "tolerance" | "fraction" | "display">>,
): Omit<SprintQuestion, "index"> {
  return {
    prompt: q.prompt,
    answer: q.answer,
    display: q.display ?? formatNumber(q.answer),
    tolerance: q.tolerance ?? 0,
    fraction: q.fraction ?? false,
    kind: q.kind,
  };
}

// ----- speed arithmetic ------------------------------------------------------------------------

const SPEED_RANGES: Record<
  SprintTier,
  { add: [number, number]; mulA: [number, number]; mulB: [number, number] }
> = {
  easy: { add: [10, 99], mulA: [12, 99], mulB: [2, 9] },
  medium: { add: [100, 999], mulA: [12, 99], mulB: [12, 99] },
  hard: { add: [1000, 9999], mulA: [102, 999], mulB: [12, 99] },
};

function speedQuestion(rng: Rng, tier: SprintTier): Omit<SprintQuestion, "index"> {
  const r = SPEED_RANGES[tier];
  const op = pick(rng, ["add", "sub", "mul", "div"] as const);
  const decimal = rng() < 0.2;
  if (decimal) {
    // One-decimal numbers, in tenths. Answers stay exact (at most two decimals for ×).
    const big = tier === "easy" ? 99 : tier === "medium" ? 999 : 9999;
    switch (op) {
      case "add": {
        const a = tenthsInt(rng, 11, big);
        const b = tenthsInt(rng, 11, big);
        return question({
          prompt: `${tenths(a)} + ${tenths(b)}`,
          answer: (a + b) / 10,
          kind: "add",
        });
      }
      case "sub": {
        const a = tenthsInt(rng, 11, big);
        const b = tenthsInt(rng, 11, big);
        const [hi, lo] = a >= b ? [a, b] : [b, a];
        return question({
          prompt: `${tenths(hi)} − ${tenths(lo)}`,
          answer: (hi - lo) / 10,
          kind: "sub",
        });
      }
      case "mul": {
        const a = tenthsInt(rng, 11, tier === "hard" ? 999 : 99);
        const b = int(rng, 2, tier === "easy" ? 9 : 19);
        return question({ prompt: `${tenths(a)} × ${b}`, answer: (a * b) / 10, kind: "mul" });
      }
      case "div": {
        // (q × d) ÷ d with q a one-decimal number: the answer is q, exactly.
        const d = int(rng, 2, tier === "easy" ? 9 : 19);
        const q = tenthsInt(rng, 11, tier === "hard" ? 999 : 99);
        return question({ prompt: `${tenths(q * d)} ÷ ${d}`, answer: q / 10, kind: "div" });
      }
    }
  }
  switch (op) {
    case "add": {
      const a = int(rng, ...r.add);
      const b = int(rng, ...r.add);
      return question({ prompt: `${a} + ${b}`, answer: a + b, kind: "add" });
    }
    case "sub": {
      const a = int(rng, ...r.add);
      const b = int(rng, ...r.add);
      const [hi, lo] = a >= b ? [a, b] : [b, a];
      return question({ prompt: `${hi} − ${lo}`, answer: hi - lo, kind: "sub" });
    }
    case "mul": {
      const a = int(rng, ...r.mulA);
      const b = int(rng, ...r.mulB);
      return question({ prompt: `${a} × ${b}`, answer: a * b, kind: "mul" });
    }
    case "div": {
      // Built backwards from a product, so it divides cleanly.
      const divisor = int(rng, ...r.mulB);
      const quotient = int(rng, ...r.mulA);
      return question({
        prompt: `${formatNumber(divisor * quotient)} ÷ ${divisor}`,
        answer: quotient,
        kind: "div",
      });
    }
  }
}

// ----- fractions and percentages ---------------------------------------------------------------

const PERCENTS: Record<SprintTier, number[]> = {
  easy: [10, 20, 25, 50, 75],
  medium: [5, 12.5, 15, 30, 35, 40, 60, 75],
  hard: [2.5, 7.5, 12.5, 17.5, 37.5, 45, 62.5, 87.5],
};

const DENOMINATORS: Record<SprintTier, number[]> = {
  easy: [2, 4, 5, 10],
  medium: [4, 5, 8, 20, 25],
  hard: [8, 16, 40, 80, 125],
};

function fractionQuestion(rng: Rng, tier: SprintTier): Omit<SprintQuestion, "index"> {
  const kinds =
    tier === "easy"
      ? (["percent-of", "to-decimal", "to-percent", "part-of"] as const)
      : ([
          "percent-of",
          "to-decimal",
          "to-percent",
          "what-percent",
          "part-of",
          "add-fractions",
          "change",
        ] as const);
  const kind = pick(rng, kinds);
  switch (kind) {
    case "percent-of": {
      const p = pick(rng, PERCENTS[tier]);
      // A base that makes p% of it a whole number: a multiple of 100 / gcd(p·10, 1000)·10.
      const step = 1000 / gcd(Math.round(p * 10), 1000);
      const base = step * int(rng, 1, tier === "easy" ? 12 : tier === "medium" ? 30 : 60);
      return question({ prompt: `${p}% of ${formatNumber(base)}`, answer: (p * base) / 100, kind });
    }
    case "to-decimal": {
      const d = pick(rng, DENOMINATORS[tier]);
      let n = int(rng, 1, d - 1);
      while (gcd(n, d) !== 1) n = int(rng, 1, d - 1);
      return question({ prompt: `${n}/${d} as a decimal`, answer: n / d, kind });
    }
    case "to-percent": {
      const d = pick(rng, DENOMINATORS[tier]);
      let n = int(rng, 1, d - 1);
      while (gcd(n, d) !== 1) n = int(rng, 1, d - 1);
      return question({
        prompt: `${n}/${d} as a percentage`,
        answer: (100 * n) / d,
        display: `${formatNumber((100 * n) / d)}%`,
        kind,
      });
    }
    case "what-percent": {
      const p = pick(rng, PERCENTS[tier]);
      const step = 1000 / gcd(Math.round(p * 10), 1000);
      const whole = step * int(rng, 1, 20);
      const part = (p * whole) / 100;
      return question({
        prompt: `${formatNumber(part)} is what percent of ${formatNumber(whole)}?`,
        answer: p,
        display: `${formatNumber(p)}%`,
        kind,
      });
    }
    case "part-of": {
      const d = pick(rng, tier === "easy" ? [2, 3, 4, 5] : [3, 4, 5, 6, 7, 8, 9]);
      let n = int(rng, 1, d - 1);
      while (gcd(n, d) !== 1) n = int(rng, 1, d - 1);
      const whole = d * int(rng, 2, tier === "hard" ? 60 : 20);
      return question({
        prompt: `${n}/${d} of ${formatNumber(whole)}`,
        answer: (n * whole) / d,
        kind,
      });
    }
    case "add-fractions": {
      const dens = tier === "hard" ? [3, 4, 5, 6, 7, 8, 9, 12] : [2, 3, 4, 5, 6];
      const b = pick(rng, dens);
      let d = pick(rng, dens);
      while (d === b) d = pick(rng, dens);
      let a = int(rng, 1, b - 1);
      while (gcd(a, b) !== 1) a = int(rng, 1, b - 1);
      let c = int(rng, 1, d - 1);
      while (gcd(c, d) !== 1) c = int(rng, 1, d - 1);
      const minus = tier === "hard" && rng() < 0.5 && a * d > c * b;
      const num = minus ? a * d - c * b : a * d + c * b;
      const den = b * d;
      const exact = num / den;
      return question({
        prompt: `${a}/${b} ${minus ? "−" : "+"} ${c}/${d}`,
        answer: exact,
        display: fractionText(num, den),
        // "5/12" or a decimal to 3 significant places (0.417) both count.
        tolerance: terminates(num, den) ? 0 : 0.002,
        fraction: true,
        kind,
      });
    }
    case "change": {
      const p = pick(rng, tier === "hard" ? [4, 8, 12.5, 15, 35, 37.5] : [10, 20, 25, 40, 50]);
      const step = 1000 / gcd(Math.round(p * 10), 1000);
      const from = step * int(rng, 1, 12);
      const up = rng() < 0.6;
      const to = up ? from * (1 + p / 100) : from * (1 - p / 100);
      return question({
        prompt: `From ${formatNumber(from)} to ${formatNumber(to)}: percentage ${up ? "increase" : "decrease"}?`,
        answer: p,
        display: `${formatNumber(p)}%`,
        kind,
      });
    }
  }
}

// ----- number sequences ------------------------------------------------------------------------

/** A rule family that may fit shown terms; returns its next term, or null when it doesn't fit. */
type Family = (terms: readonly number[]) => number | null;

const near = (a: number, b: number) => Math.abs(a - b) < 1e-9 * Math.max(1, Math.abs(b));

const diffs = (t: readonly number[]) => t.slice(1).map((v, i) => v - t[i]!);

function constant(list: readonly number[]): boolean {
  return list.length > 0 && list.every((v) => near(v, list[0]!));
}

/** Constant k-th differences (k = 1 arithmetic, 2 quadratic, 3 cubic). */
function polynomial(k: number): Family {
  return (terms) => {
    const levels: number[][] = [[...terms]];
    for (let i = 0; i < k; i++) levels.push(diffs(levels[i]!));
    const last = levels[k]!;
    if (last.length < 2 || !constant(last)) return null;
    let next = last[0]!;
    for (let i = k - 1; i >= 0; i--) next += levels[i]![levels[i]!.length - 1]!;
    return next;
  };
}

const PRIMES = [2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73];

/** Every simple rule a person might see in a short sequence. */
export const SEQUENCE_FAMILIES: Record<string, Family> = {
  arithmetic: polynomial(1),
  quadratic: polynomial(2),
  cubic: polynomial(3),
  geometric: (t) => {
    if (t.some((v) => v === 0)) return null;
    const r = t[1]! / t[0]!;
    return t.every((v, i) => i === 0 || near(v / t[i - 1]!, r)) ? t[t.length - 1]! * r : null;
  },
  // Each term is the sum of the two before it.
  fibonacci: (t) =>
    t.length >= 4 && t.every((v, i) => i < 2 || near(v, t[i - 1]! + t[i - 2]!))
      ? t[t.length - 1]! + t[t.length - 2]!
      : null,
  // next = p × previous + q, fitted from the first three terms.
  "times-plus": (t) => {
    const d0 = t[1]! - t[0]!;
    if (d0 === 0) return null;
    const p = (t[2]! - t[1]!) / d0;
    const q = t[1]! - p * t[0]!;
    return t.every((v, i) => i === 0 || near(v, p * t[i - 1]! + q))
      ? p * t[t.length - 1]! + q
      : null;
  },
  // Differences alternate between two values (+2, +4, +2, +4, …).
  "alternating-steps": (t) => {
    const d = diffs(t);
    if (d.length < 4) return null;
    const even = d.filter((_, i) => i % 2 === 0);
    const odd = d.filter((_, i) => i % 2 === 1);
    if (!constant(even) || !constant(odd)) return null;
    return t[t.length - 1]! + (d.length % 2 === 0 ? even[0]! : odd[0]!);
  },
  // Two arithmetic sequences interleaved (terms in odd and even places).
  interleaved: (t) => {
    if (t.length < 5) return null;
    const next = t.length;
    const same = t.filter((_, i) => i % 2 === next % 2);
    const other = t.filter((_, i) => i % 2 !== next % 2);
    if (!constant(diffs(same)) || !constant(diffs(other))) return null;
    return same[same.length - 1]! + (same[1]! - same[0]!);
  },
  // Consecutive primes.
  primes: (t) => {
    const at = PRIMES.indexOf(t[0]!);
    if (at < 0 || at + t.length >= PRIMES.length) return null;
    return t.every((v, i) => v === PRIMES[at + i]) ? PRIMES[at + t.length]! : null;
  },
  // Each term is the product of the two before it.
  product: (t) =>
    t.length >= 4 && t.every((v, i) => i < 2 || near(v, t[i - 1]! * t[i - 2]!))
      ? t[t.length - 1]! * t[t.length - 2]!
      : null,
};

/** Next terms predicted by every family that fits (distinct values). */
export function sequencePredictions(terms: readonly number[]): number[] {
  const out: number[] = [];
  for (const family of Object.values(SEQUENCE_FAMILIES)) {
    const next = family(terms);
    if (next !== null && Number.isFinite(next) && !out.some((v) => near(v, next))) out.push(next);
  }
  return out;
}

/** A sequence is fair when every simple rule that fits agrees on the next term. */
export function isUnambiguous(terms: readonly number[], answer: number): boolean {
  const predictions = sequencePredictions(terms);
  return predictions.length > 0 && predictions.every((v) => near(v, answer));
}

type SequenceMaker = (rng: Rng) => { terms: number[]; next: number; kind: string };

const SEQUENCE_MAKERS: Record<SprintTier, SequenceMaker[]> = {
  easy: [
    (rng) => {
      const a = int(rng, 1, 30);
      const d = int(rng, 2, 12);
      const terms = [0, 1, 2, 3, 4].map((i) => a + i * d);
      return { terms, next: a + 5 * d, kind: "arithmetic" };
    },
    (rng) => {
      const a = int(rng, 1, 5);
      const r = pick(rng, [2, 3]);
      const terms = [0, 1, 2, 3, 4].map((i) => a * r ** i);
      return { terms, next: a * r ** 5, kind: "geometric" };
    },
    (rng) => {
      const c = int(rng, 0, 5);
      const s = int(rng, 1, 4);
      const terms = [0, 1, 2, 3, 4].map((i) => (s + i) ** 2 + c);
      return { terms, next: (s + 5) ** 2 + c, kind: "squares" };
    },
  ],
  medium: [
    (rng) => {
      // Differences grow by a fixed step: a quadratic.
      const a = int(rng, 1, 20);
      const d = int(rng, 1, 6);
      const k = int(rng, 1, 4);
      const terms = [a];
      for (let i = 0; i < 5; i++) terms.push(terms[i]! + d + i * k);
      return { terms: terms.slice(0, 5), next: terms[5]!, kind: "growing-steps" };
    },
    (rng) => {
      const a = int(rng, 1, 6);
      const b = int(rng, 1, 8);
      const terms = [a, b];
      while (terms.length < 6) terms.push(terms[terms.length - 1]! + terms[terms.length - 2]!);
      return { terms: terms.slice(0, 5), next: terms[5]!, kind: "fibonacci" };
    },
    (rng) => {
      const p = pick(rng, [2, 3]);
      const q = pick(rng, [-1, 1, 2]);
      const terms = [int(rng, 1, 4)];
      while (terms.length < 6) terms.push(p * terms[terms.length - 1]! + q);
      return { terms: terms.slice(0, 5), next: terms[5]!, kind: "times-plus" };
    },
    (rng) => {
      const d1 = int(rng, 1, 5);
      let d2 = int(rng, 2, 9);
      while (d2 === d1) d2 = int(rng, 2, 9);
      const terms = [int(rng, 1, 20)];
      while (terms.length < 7) terms.push(terms[terms.length - 1]! + (terms.length % 2 ? d1 : d2));
      return { terms: terms.slice(0, 6), next: terms[6]!, kind: "alternating-steps" };
    },
  ],
  hard: [
    (rng) => {
      const c = int(rng, -3, 3);
      const s = int(rng, 1, 3);
      const terms = [0, 1, 2, 3, 4].map((i) => (s + i) ** 3 + c);
      return { terms, next: (s + 5) ** 3 + c, kind: "cubes" };
    },
    (rng) => {
      // Two sequences interleaved.
      const a = int(rng, 1, 9);
      const d = int(rng, 2, 7);
      const b = int(rng, 10, 40);
      const e = int(rng, 3, 11);
      const terms = [a, b, a + d, b + e, a + 2 * d, b + 2 * e];
      return { terms, next: a + 3 * d, kind: "interleaved" };
    },
    (rng) => {
      const start = int(rng, 0, PRIMES.length - 7);
      const terms = PRIMES.slice(start, start + 5);
      return { terms, next: PRIMES[start + 5]!, kind: "primes" };
    },
    (rng) => {
      const a = int(rng, 1, 3);
      const b = int(rng, 2, 3);
      const terms = [a, b];
      while (terms.length < 6) terms.push(terms[terms.length - 1]! * terms[terms.length - 2]!);
      return { terms: terms.slice(0, 5), next: terms[5]!, kind: "product" };
    },
    (rng) => {
      // n × (n + 1): 2, 6, 12, 20, 30.
      const s = int(rng, 1, 5);
      const terms = [0, 1, 2, 3, 4].map((i) => (s + i) * (s + i + 1));
      return { terms, next: (s + 5) * (s + 6), kind: "pronic" };
    },
  ],
};

function sequenceQuestion(rng: Rng, tier: SprintTier): Omit<SprintQuestion, "index"> {
  // Each tier also mixes in the easier tiers' rules now and then.
  const pool =
    tier === "easy"
      ? SEQUENCE_MAKERS.easy
      : tier === "medium"
        ? [...SEQUENCE_MAKERS.medium, ...SEQUENCE_MAKERS.medium, ...SEQUENCE_MAKERS.easy]
        : [...SEQUENCE_MAKERS.hard, ...SEQUENCE_MAKERS.hard, ...SEQUENCE_MAKERS.medium];
  for (let tries = 0; tries < 50; tries++) {
    const { terms, next, kind } = pick(rng, pool)(rng);
    if (next < 0 || terms.some((t) => t < 0) || new Set(terms).size < 4) continue;
    if (!isUnambiguous(terms, next)) continue;
    return question({ prompt: `${terms.map(formatNumber).join(", ")}, …`, answer: next, kind });
  }
  // Always fair: a plain arithmetic sequence.
  const a = int(rng, 1, 20);
  const d = int(rng, 2, 9);
  return question({
    prompt: `${[0, 1, 2, 3, 4].map((i) => a + i * d).join(", ")}, …`,
    answer: a + 5 * d,
    kind: "arithmetic",
  });
}

// ----- estimation ------------------------------------------------------------------------------

function estimationQuestion(rng: Rng, tier: SprintTier): Omit<SprintQuestion, "index"> {
  const est = (prompt: string, answer: number, kind: string) =>
    question({
      prompt,
      answer,
      display: formatNumber(
        Math.abs(answer) >= 100 ? Math.round(answer) : Number(answer.toPrecision(4)),
      ),
      tolerance: ESTIMATION_TOLERANCE,
      kind,
    });
  const kinds =
    tier === "easy"
      ? (["product", "quotient", "percent"] as const)
      : tier === "medium"
        ? (["product", "quotient", "percent", "sqrt", "reciprocal"] as const)
        : (["product", "quotient", "sqrt", "power", "exp", "compound"] as const);
  const kind = pick(rng, kinds);
  switch (kind) {
    case "product": {
      const a = tier === "hard" ? int(rng, 1001, 9999) : int(rng, 101, 999);
      const b = tier === "easy" ? int(rng, 11, 99) : int(rng, 101, 999);
      return est(`${formatNumber(a)} × ${formatNumber(b)}`, a * b, kind);
    }
    case "quotient": {
      const a = int(rng, tier === "easy" ? 1000 : 10_000, tier === "easy" ? 9999 : 99_999);
      const b = tier === "easy" ? int(rng, 7, 49) : int(rng, 13, 97) + int(rng, 1, 9) / 10;
      return est(`${formatNumber(a)} ÷ ${formatNumber(b)}`, a / b, kind);
    }
    case "percent": {
      const p = int(rng, 11, 89);
      const base = int(rng, 1000, tier === "easy" ? 9999 : 99_999);
      return est(`${p}% of ${formatNumber(base)}`, (p * base) / 100, kind);
    }
    case "sqrt": {
      let n = int(rng, 20, tier === "hard" ? 99_999 : 9999);
      while (Number.isInteger(Math.sqrt(n))) n++;
      return est(`√${formatNumber(n)}`, Math.sqrt(n), kind);
    }
    case "reciprocal": {
      const d = int(rng, 11, 99) / 100;
      return est(`1 ÷ ${d}`, 1 / d, kind);
    }
    case "power": {
      const base = pick(rng, [2, 3, 7, 11, 12, 13]);
      const exp = base === 2 ? int(rng, 12, 30) : base === 3 ? int(rng, 7, 14) : int(rng, 3, 6);
      return est(`${base}^${exp}`, base ** exp, kind);
    }
    case "exp": {
      const x = pick(rng, [1.5, 2, 2.5, 3, 4, 0.7]);
      return est(`e^${x}`, Math.E ** x, kind);
    }
    case "compound": {
      const r = pick(rng, [3, 4, 5, 6, 7, 8, 10]);
      const n = pick(rng, [5, 8, 10, 12, 15, 20]);
      return est(`1.${String(r).padStart(2, "0")}^${n}`, (1 + r / 100) ** n, kind);
    }
  }
}

// ----- a sprint ----------------------------------------------------------------------------------

const MAKERS: Record<SprintMode, (rng: Rng, tier: SprintTier) => Omit<SprintQuestion, "index">> = {
  speed: speedQuestion,
  fractions: fractionQuestion,
  sequences: sequenceQuestion,
  estimation: estimationQuestion,
};

/** A whole sprint, generated at once from a seed (no two questions in a row are the same). */
export function generateSprint(
  mode: SprintMode,
  tier: SprintTier,
  seed: number,
  count = SPRINT_MODES[mode].count,
): SprintQuestion[] {
  const rng = mulberry32(seed);
  const out: SprintQuestion[] = [];
  const seen = new Set<string>();
  while (out.length < count) {
    let q = MAKERS[mode](rng, tier);
    for (let tries = 0; tries < 20 && seen.has(q.prompt); tries++) q = MAKERS[mode](rng, tier);
    seen.add(q.prompt);
    out.push({ ...q, index: out.length });
  }
  return out;
}

// ----- answers -----------------------------------------------------------------------------------

export type SprintVerdict = "correct" | "incorrect" | "unreadable";

/**
 * Reads a typed answer as a number: "282", "14,123", "0.375", ".5", "37.5%", and a fraction
 * ("5/12") where the question allows one. Never an expression, so "47*6" isn't accepted.
 */
export function readSprintNumber(input: string, allowFraction: boolean): number | null {
  const s = input.trim().replace(/\s+/g, "").replace(/[−–]/g, "-");
  if (!s) return null;
  const frac = /^(-?\d+)\/(\d+)$/.exec(s);
  if (frac) {
    if (!allowFraction) return null;
    const d = Number(frac[2]);
    return d === 0 ? null : Number(frac[1]) / d;
  }
  const m = /^(-?)(\d{1,3}(?:,\d{3})+|\d*)(\.\d+)?(%?)$/.exec(s);
  if (!m || (!m[2] && !m[3])) return null;
  const value = Number(`${m[1]}${(m[2] ?? "").replace(/,/g, "")}${m[3] ?? ""}`);
  return Number.isFinite(value) ? value : null;
}

/** Checks one answer: exact for arithmetic (allowing float noise), within 5% for estimation. */
export function gradeSprintAnswer(q: SprintQuestion, input: string): SprintVerdict {
  const value = readSprintNumber(input, q.fraction);
  if (value === null) return "unreadable";
  const scale = Math.max(Math.abs(q.answer), 1e-9);
  const tolerance = q.tolerance > 0 ? q.tolerance * scale : 1e-9 * Math.max(1, scale);
  return Math.abs(value - q.answer) <= tolerance ? "correct" : "incorrect";
}

export interface SprintAnswer {
  index: number;
  /** What the owner typed; empty when skipped. */
  given: string;
  verdict: "correct" | "incorrect" | "skipped";
  /** Time on this question. */
  ms: number;
}

export interface SprintSummary {
  correct: number;
  incorrect: number;
  skipped: number;
  /** Answered right or wrong (skips not included). */
  answered: number;
  /** Questions in a full sprint of this mode. */
  total: number;
  /** correct / total. */
  score: number;
  /** correct / answered (1 when nothing was answered wrong). */
  accuracy: number;
  /** Seconds per answered question. */
  secondsPerAnswer: number | null;
}

export function summarizeSprint(
  answers: readonly SprintAnswer[],
  total: number,
  seconds: number,
): SprintSummary {
  const correct = answers.filter((a) => a.verdict === "correct").length;
  const incorrect = answers.filter((a) => a.verdict === "incorrect").length;
  const skipped = answers.filter((a) => a.verdict === "skipped").length;
  const answered = correct + incorrect;
  return {
    correct,
    incorrect,
    skipped,
    answered,
    total,
    score: total > 0 ? correct / total : 0,
    accuracy: answered > 0 ? correct / answered : 0,
    secondsPerAnswer: answered > 0 ? seconds / answered : null,
  };
}

/** The check a finished sprint records on each of its concepts (score 0 to 1). */
export function sprintCheckScore(correct: number, total: number, tier: SprintTier): number {
  if (total <= 0) return 0;
  return Math.min(1, (correct / total) * TIER_WEIGHT[tier]);
}

/** "speed" → the mode; anything unknown (an older or foreign run) → null. */
export function sprintModeOf(mode: string): SprintMode | null {
  return (SPRINT_MODE_ORDER as readonly string[]).includes(mode) ? (mode as SprintMode) : null;
}

/** The question with its answer, for feedback and the results list ("47 × 6 = 282"). */
export function answerLine(
  q: Pick<SprintQuestion, "prompt" | "display" | "kind" | "tolerance">,
): string {
  if (q.prompt.endsWith(", …")) return `${q.prompt.slice(0, -3)}, then ${q.display}`;
  if (q.prompt.endsWith("?")) return `${q.prompt} ${q.display}`;
  if (q.kind === "to-decimal" || q.kind === "to-percent") return `${q.prompt} is ${q.display}`;
  return `${q.prompt} ${q.tolerance >= ESTIMATION_TOLERANCE ? "≈" : "="} ${q.display}`;
}
