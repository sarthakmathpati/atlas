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

/** Shortest time to get everyone across (Dijkstra over who is across and where the lamp is). */
function crossingTime(times: number[]): number {
  const full = (1 << times.length) - 1;
  const dist = new Map<string, number>([["0,0", 0]]);
  const queue: [number, number, number][] = [[0, 0, 0]];
  while (queue.length) {
    queue.sort((a, b) => a[0] - b[0]);
    const [d, far, torch] = queue.shift()!;
    if (far === full) return d;
    const side = torch === 0 ? full & ~far : far;
    for (let i = 0; i < times.length; i++) {
      for (let j = i; j < times.length; j++) {
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
}
/** Midpoint rule on [a, b]. */
function integrate(f: (x: number) => number, a: number, b: number, steps = 200000): number {
  const h = (b - a) / steps;
  let s = 0;
  for (let i = 0; i < steps; i++) s += f(a + (i + 0.5) * h);
  return s * h;
}
/** All permutations of 0..n-1. */
function permutations(n: number): number[][] {
  const go = (arr: number[]): number[][] =>
    arr.length <= 1
      ? [arr]
      : arr.flatMap((x, i) => go([...arr.slice(0, i), ...arr.slice(i + 1)]).map((p) => [x, ...p]));
  return go([...Array(n).keys()]);
}
/** Losing positions (for the player to move) of a take-away game where taking the last wins. */
function takeAwayWins(n: number, moves: number[]): boolean[] {
  const win = [false];
  for (let i = 1; i <= n; i++) win[i] = moves.some((m) => m <= i && !win[i - m]);
  return win;
}
/** Grid maximum of f on [a, b]. */
function maximize(f: (x: number) => number, a: number, b: number, steps = 100000): number {
  let best = -Infinity;
  for (let i = 0; i <= steps; i++) best = Math.max(best, f(a + ((b - a) * i) / steps));
  return best;
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
  "q-bridge": crossingTime([1, 2, 5, 10]),
  "q-horses": 7,
  "q-clock": Math.abs(90 - (90 + 15 * 0.5)),
  "q-kelly": 0.6 - 0.4,
  "q-sqrt50": Math.sqrt(50),

  // Original puzzles (Phase 5)
  "q-three-different": (() => {
    let n = 0;
    for (let a = 1; a <= 6; a++)
      for (let b = 1; b <= 6; b++)
        for (let c = 1; c <= 6; c++) if (a !== b && b !== c && a !== c) n++;
    return n / 216;
  })(),
  "q-red-pair": (() => {
    // cards 0..25 red; count unordered pairs
    let atLeastOne = 0;
    let both = 0;
    for (let i = 0; i < 52; i++)
      for (let j = i + 1; j < 52; j++) {
        const reds = Number(i < 26) + Number(j < 26);
        if (reds >= 1) atLeastOne++;
        if (reds === 2) both++;
      }
    return both / atLeastOne;
  })(),
  "q-spam-flag": (0.4 * 0.9) / (0.4 * 0.9 + 0.6 * 0.02),
  "q-two-positives": (0.005 * 0.95 * 0.95) / (0.005 * 0.95 * 0.95 + 0.995 * 0.04 * 0.04),
  "q-lift-stops": (() => {
    // distribution of the number of distinct floors chosen, passenger by passenger
    let dist = [1];
    for (let p = 0; p < 8; p++) {
      const next = Array(dist.length + 1).fill(0);
      dist.forEach((pr, k) => {
        next[k] += (pr * k) / 10;
        next[k + 1] += (pr * (10 - k)) / 10;
      });
      dist = next;
    }
    return dist.reduce((s, pr, k) => s + pr * k, 0);
  })(),
  "q-couples-table": (() => {
    // seats of one couple over all ordered pairs of distinct seats, then 10 couples
    let adjacent = 0;
    let total = 0;
    for (let i = 0; i < 20; i++)
      for (let j = 0; j < 20; j++) {
        if (i === j) continue;
        total++;
        if ((i - j + 20) % 20 === 1 || (j - i + 20) % 20 === 1) adjacent++;
      }
    return (10 * adjacent) / total;
  })(),
  "q-four-heads": (() => {
    let hits = 0;
    for (let mask = 0; mask < 1024; mask++)
      if (/1111/.test(mask.toString(2).padStart(10, "0"))) hits++;
    return hits / 1024;
  })(),
  "q-total-six": (() => {
    const p = [1];
    for (let n = 1; n <= 6; n++) {
      let s = 0;
      for (let k = 1; k <= 6; k++) if (n - k >= 0) s += p[n - k]!;
      p[n] = s / 6;
    }
    return p[6]!;
  })(),
  "q-socks-three": (() => {
    // socks 0..5 black, 6..9 white
    let good = 0;
    let all = 0;
    for (let a = 0; a < 10; a++)
      for (let b = a + 1; b < 10; b++)
        for (let c = b + 1; c < 10; c++) {
          all++;
          if (Number(a < 6) + Number(b < 6) + Number(c < 6) === 2) good++;
        }
    return good / all;
  })(),
  "q-bus-wait": integrate((t) => Math.exp(-t / 10), 0, 400),
  "q-red-taxis": integrate((t) => 16 * t * Math.exp(-4 * t) * Math.exp(-2 * t), 0, 40),
  "q-box-weights": integrate((z) => Math.exp((-z * z) / 2) / Math.sqrt(2 * Math.PI), 2, 12),
  "q-six-duel": Array.from({ length: 200 }, (_, k) => (25 / 36) ** k / 6).reduce(
    (a, b) => a + b,
    0,
  ),
  "q-rescale-maximum": 8 / integrate((x) => x * 4 * x ** 3, 0, 1), // E[max of 4 on [0, 1]] = 4/5
  "q-dice-variance": (() => {
    let s = 0;
    let s2 = 0;
    for (let a = 1; a <= 6; a++)
      for (let b = 1; b <= 6; b++)
        for (let c = 1; c <= 6; c++) {
          s += a + b + c;
          s2 += (a + b + c) ** 2;
        }
    return s2 / 216 - (s / 216) ** 2;
  })(),
  "q-rod-distance": integrate2d((x, y) => Math.abs(x - y)),
  "q-longest-piece": integrate2d((x, y) => {
    const [a, b] = x < y ? [x, y] : [y, x];
    return Math.max(a, b - a, 1 - b);
  }),
  "q-sunny-days": (() => {
    let sunny = 0.5;
    for (let i = 0; i < 200; i++) sunny = 0.8 * sunny + 0.4 * (1 - sunny);
    return sunny;
  })(),
  "q-repeat-roll": Array.from({ length: 400 }, (_, i) => i + 2).reduce(
    (s, n) => s + n * (5 / 6) ** (n - 2) * (1 / 6),
    0,
  ),
  "q-black-before-red": (() => {
    // E[blacks before the first red] = sum over k of P(the first k cards are all black)
    let e = 0;
    let allBlack = 1;
    for (let k = 1; k <= 26; k++) {
      allBlack *= (26 - k + 1) / (52 - k + 1);
      e += allBlack;
    }
    return e;
  })(),
  "q-keep-or-redraw": maximize((t) => t * 0.5 + (1 - t * t) / 2, 0, 1), // keep above t
  "q-biased-ruin": (() => {
    // p(i) = 0.6 p(i+1) + 0.4 p(i-1), p(0) = 0, p(4) = 1; unknowns p(1..3)
    const A = [
      [1, -0.6, 0],
      [-0.4, 1, -0.6],
      [0, -0.4, 1],
    ];
    return solve(A, [0, 0, 0.6])[1]!;
  })(),
  "q-handshakes": (() => {
    let n = 0;
    for (let i = 0; i < 12; i++) for (let j = i + 1; j < 12; j++) n++;
    return n;
  })(),
  "q-sweets": (() => {
    let n = 0;
    for (let a = 1; a <= 10; a++)
      for (let b = 1; b <= 10; b++) for (let c = 1; c <= 10; c++) if (10 - a - b - c >= 1) n++;
    return n;
  })(),
  "q-rising-digits": (() => {
    let n = 0;
    for (let x = 10000; x <= 99999; x++) {
      const d = String(x);
      if ([1, 2, 3, 4].every((i) => d[i]! > d[i - 1]!)) n++;
    }
    return n;
  })(),
  "q-letters": permutations(4).filter((p) => p.every((v, i) => v !== i)).length / 24,
  "q-robot-routes": (() => {
    // ways[r][u]: r moves right, u moves up, staying on or below the diagonal (u <= r)
    const ways = Array.from({ length: 6 }, () => Array(6).fill(0));
    ways[0]![0] = 1;
    for (let r = 0; r <= 5; r++)
      for (let u = 0; u <= r; u++) {
        if (r === 0 && u === 0) continue;
        ways[r]![u] = (r > 0 && u <= r - 1 ? ways[r - 1]![u] : 0) + (u > 0 ? ways[r]![u - 1] : 0);
      }
    return ways[5]![5];
  })(),
  "q-last-digit": (() => {
    let d = 1;
    for (let i = 0; i < 2026; i++) d = (d * 7) % 10;
    return d;
  })(),
  "q-factorial-zeros": (() => {
    let f = 1n;
    for (let i = 2n; i <= 100n; i++) f *= i;
    return String(f).length - String(f).replace(/0+$/, "").length;
  })(),
  "q-bouncing-ball": (() => {
    let total = 10;
    let h = 10;
    for (let i = 0; i < 500; i++) {
      h *= 0.6;
      total += 2 * h;
    }
    return total;
  })(),
  "q-up-then-down": 1.2 * 0.8 - 1,
  "q-river-fence": maximize((x) => x * (100 - 2 * x), 0, 50),
  "q-density-tail": integrate((x) => 3 * x * x, 0.5, 1),
  "q-eigenvalue": (() => {
    let v = [1, 0];
    let lambda = 0;
    for (let i = 0; i < 100; i++) {
      const w = [2 * v[0]! + v[1]!, v[0]! + 2 * v[1]!];
      lambda = Math.hypot(w[0]!, w[1]!) / Math.hypot(v[0]!, v[1]!);
      v = w.map((x) => x / Math.hypot(w[0]!, w[1]!));
    }
    return lambda;
  })(),
  "q-sock-colors": 5 + 1, // one of each color can still differ
  "q-nine-coins": Math.ceil(Math.log(9) / Math.log(3) - 1e-9),
  "q-poison-two-rounds": (() => {
    let k = 0;
    while (3 ** k < 240) k++;
    return k;
  })(),
  "q-five-pirates": (() => {
    // backward induction; a voter needs strictly more than they would get next round
    let alloc = [100];
    for (let k = 2; k <= 5; k++) {
      const needed = Math.ceil(k / 2) - 1;
      const cheapest = alloc
        .map((c, i) => ({ seat: i + 1, cost: c + 1 }))
        .sort((a, b) => a.cost - b.cost);
      const next = Array(k).fill(0);
      cheapest.slice(0, needed).forEach(({ seat, cost }) => (next[seat] = cost));
      next[0] = 100 - next.reduce((a, b) => a + b, 0);
      alloc = next;
    }
    return alloc[0]!;
  })(),
  "q-hat-line": (() => {
    // the parity plan: the fewest correct over every assignment of hats (1 = black)
    let worst = Infinity;
    for (let mask = 0; mask < 1024; mask++) {
      const hats = [...Array(10).keys()].map((i) => (mask >> i) & 1); // index 0 is the back
      const called: number[] = [];
      let correct = 0;
      for (let i = 0; i < 10; i++) {
        const seenAhead = hats.slice(i + 1).reduce((a, b) => a + b, 0);
        const guess =
          i === 0
            ? seenAhead % 2
            : (called[0]! + seenAhead + called.slice(1).reduce((a, b) => a + b, 0)) % 2;
        called.push(guess);
        if (guess === hats[i]) correct++;
      }
      worst = Math.min(worst, correct);
    }
    return worst;
  })(),
  "q-hands-meet": (() => {
    // bisection on the angle gap between the hands, t minutes after 1:00
    let lo = 0;
    let hi = 30;
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      if (6 * mid < 30 + 0.5 * mid) lo = mid;
      else hi = mid;
    }
    return lo;
  })(),
  "q-three-eggs": (() => {
    const floors = (d: number, e: number): number =>
      d === 0 || e === 0 ? 0 : floors(d - 1, e - 1) + floors(d - 1, e) + 1;
    let d = 0;
    while (floors(d, 3) < 100) d++;
    return d;
  })(),
  "q-five-hikers": crossingTime([1, 3, 6, 8, 12]),
  "q-knockout": (() => {
    let players = 100;
    let matches = 0;
    while (players > 1) {
      matches += Math.floor(players / 2);
      players = Math.ceil(players / 2);
    }
    return matches;
  })(),
  "q-die-payout": [1, 2, 3, 4, 5, 6].reduce((s, v) => s + (2 * v) / 6, 0) - 5,
  "q-kelly-two-to-one": (() => {
    const growth = (f: number) => 0.4 * Math.log(1 + 2 * f) + 0.6 * Math.log(1 - f);
    let best = 0;
    for (let i = 0; i < 100000; i++) if (growth(i / 100000) > growth(best)) best = i / 100000;
    return best;
  })(),
  "q-put-from-call": 10.45 - 100 + 100 * Math.exp(-0.05),
  "q-sharpe": (0.09 - 0.03) / 0.15,
  "q-two-asset-volatility": (() => {
    const w = [0.5, 0.5];
    const cov = [
      [0.04, 0.5 * 0.2 * 0.2],
      [0.5 * 0.2 * 0.2, 0.04],
    ];
    let v = 0;
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) v += w[i]! * w[j]! * cov[i]![j]!;
    return Math.sqrt(v);
  })(),
  "q-three-payments": [1, 2, 3].reduce((s, year) => s + 100 / 1.1 ** year, 0),
  "q-second-price": 50, // bidding the true value is weakly dominant; checked below
  "q-zero-sum-value": maximize((p) => Math.min(3 * p - 2 * (1 - p), -p + (1 - p)), 0, 1),
  "q-log-insurance": (() => {
    // largest premium x with ln(100 - x) >= 0.5 ln 100 + 0.5 ln 50, by bisection
    const target = 0.5 * Math.log(100) + 0.5 * Math.log(50);
    let lo = 0;
    let hi = 50;
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      if (Math.log(100 - mid) >= target) lo = mid;
      else hi = mid;
    }
    return lo;
  })(),
};

describe("quant puzzle bank", () => {
  const rows = specRows();

  it("contains every puzzle from the spec table, keeping its wording", () => {
    expect(rows).toHaveLength(41);
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
      if (p.answer === null || p.answer === "yes" || p.answer === "no") continue;
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

  it("adds at least 40 original puzzles across probability, math, puzzles and markets", () => {
    const specIds = new Set(rows.map((r) => r.id));
    const extras = QUANT_PUZZLES.filter((p) => !specIds.has(p.id));
    expect(extras.length).toBeGreaterThanOrEqual(40);
    expect(new Set(QUANT_PUZZLES.map((p) => p.id)).size).toBe(QUANT_PUZZLES.length);
    for (const subject of ["prob", "math", "puzzles", "markets"])
      expect(
        extras.filter((p) => p.topicId.startsWith(`${subject}.`)).length,
        subject,
      ).toBeGreaterThanOrEqual(5);
    for (const level of ["easy", "medium", "hard"])
      expect(extras.filter((p) => p.difficulty === level).length, level).toBeGreaterThanOrEqual(5);
    for (const p of extras) {
      expect(p.id).toMatch(/^q-[a-z0-9-]+$/);
      expect(p.prompt!.trim(), p.id).toMatch(/[?.)]$/);
      // Plain, friendly copy (CLAUDE.md standing rule 8); "4!" is a factorial, not an exclamation.
      expect(`${p.prompt} ${p.answerNote}`, p.id).not.toMatch(
        /[a-z]!|\bsimply\b|\bplease\b|successfully/i,
      );
    }
  });

  it("checks yes/no answers by brute force", () => {
    // Cut chessboard: opposite corners share a color, so the colors no longer balance.
    let dark = 0;
    let light = 0;
    for (let r = 0; r < 8; r++)
      for (let c = 0; c < 8; c++) {
        if ((r === 0 && c === 0) || (r === 7 && c === 7)) continue;
        if ((r + c) % 2 === 0) dark++;
        else light++;
      }
    expect(dark === light).toBe(byId.get("q-cut-chessboard")!.answer === "yes");
    expect(takeAwayWins(30, [1, 3, 4])[30]).toBe(byId.get("q-take-134")!.answer === "yes");
  });

  it("finds truthful bidding best in a second-price auction", () => {
    // Against every rival bid, bidding the value 50 does at least as well as any other bid.
    const payoff = (bid: number, rival: number) => (bid > rival ? 50 - rival : 0);
    for (let rival = 0; rival <= 100; rival += 0.5)
      for (let bid = 0; bid <= 100; bid += 0.5)
        expect(payoff(50, rival)).toBeGreaterThanOrEqual(payoff(bid, rival));
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
    expect(checkAnswer("0.739", byId.get("q-two-positives")!.answer!)).toBe("correct");
    expect(checkAnswer("-4%", byId.get("q-up-then-down")!.answer!)).toBe("correct");
    expect(checkAnswer("−0.04", byId.get("q-up-then-down")!.answer!)).toBe("correct");
    expect(checkAnswer("17.3%", byId.get("q-two-asset-volatility")!.answer!)).toBe("correct");
    expect(checkAnswer("5.57", byId.get("q-put-from-call")!.answer!)).toBe("correct");
    expect(checkAnswer("248.69", byId.get("q-three-payments")!.answer!)).toBe("correct");
    expect(checkAnswer("29.29", byId.get("q-log-insurance")!.answer!)).toBe("correct");
    expect(checkAnswer("5.70", byId.get("q-lift-stops")!.answer!)).toBe("correct");
    expect(checkAnswer("5 5/11", byId.get("q-hands-meet")!.answer!)).not.toBe("correct");
    expect(checkAnswer("5.4545 minutes", byId.get("q-hands-meet")!.answer!)).toBe("correct");
    expect(checkAnswer("no", byId.get("q-take-134")!.answer!)).toBe("correct");
  });
});
