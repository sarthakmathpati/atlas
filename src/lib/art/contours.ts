// The contour engine (BUILD_SPEC.md 12.10.6): a seeded terrain drawn as contour lines, the
// texture of the Survey look (page heads, empty states, breaks, subject emblems, the map's paper).
//
// The field is a sum of Gaussian hills plus a few low sine waves. Hills given by the caller (the
// owner's subjects, say) sit on seeded background hills. Lines come from marching squares with a
// fixed saddle rule. Pure and deterministic: the same input always gives the same lines.
//
// Changing one hill changes lines only near it: each hill is a Gaussian smoothly cut to exactly
// zero beyond 3 radii, and the spacing between levels comes from the seeded background alone (not
// from the given hills' heights), so the other lines stay where they were.
import { hashSeed, mulberry32 } from "@/lib/random";

export interface ContourHill {
  /** Center, as a fraction of the width (0 to 1). */
  x: number;
  /** Center, as a fraction of the height (0 to 1). */
  y: number;
  /** Radius, as a fraction of the longer side (the "span"). */
  r: number;
  /** Relative height: 1 is a full hill; background hills are 0.1 to 0.3. */
  height: number;
  /** A spot-height label for the peak, such as "DSA 57". */
  label?: string;
}

export interface ContourInput {
  width: number;
  height: number;
  /** Seeds the background hills and waves. */
  seed: number | string;
  /** Roughly how many lines span the background's range. */
  levels: number;
  /** Grid cell in px: 6 for page heads, 2 for emblems. */
  cell: number;
  hills?: ContourHill[];
  /** Seeded background hills (default 4 with hills given, 7 without). */
  backgroundHills?: number;
}

export interface ContourLevel {
  /** 1 for the lowest line. */
  index: number;
  value: number;
  /** Every fourth line is an index contour, drawn a little heavier. */
  major: boolean;
  /** Line segments as x1, y1, x2, y2, ... in px. */
  segments: Float32Array;
}

export interface ContourLabel {
  x: number;
  y: number;
  text: string;
}

export interface ContourResult {
  width: number;
  height: number;
  levels: ContourLevel[];
  /** Peaks of the labelled hills (spot heights), in px. */
  labels: ContourLabel[];
}

interface Bump {
  x: number;
  y: number;
  /** 1 / r² */
  inv: number;
  /** (3r)², where the bump reaches exactly zero */
  cut2: number;
  a: number;
}

interface Wave {
  fx: number;
  fy: number;
  phase: number;
  a: number;
}

/** A Gaussian bump times a smooth window that reaches exactly zero at 3 radii. */
function bumpAt(b: Bump, px: number, py: number): number {
  const dx = px - b.x;
  const dy = py - b.y;
  const d2 = dx * dx + dy * dy;
  if (d2 >= b.cut2) return 0;
  const w = 1 - d2 / b.cut2;
  return b.a * Math.exp(-d2 * b.inv) * w * w;
}

function toBump(x: number, y: number, r: number, a: number): Bump {
  const radius = Math.max(r, 1e-6);
  return { x, y, inv: 1 / (radius * radius), cut2: 9 * radius * radius, a };
}

/** Fills the grid for a set of bumps and waves. */
function sampleGrid(
  nx: number,
  ny: number,
  cell: number,
  bumps: Bump[],
  waves: Wave[],
): Float64Array {
  const grid = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    const py = j * cell;
    for (let i = 0; i < nx; i++) {
      const px = i * cell;
      let v = 0;
      for (const w of waves) v += w.a * Math.sin(px * w.fx + py * w.fy + w.phase);
      grid[j * nx + i] = v;
    }
  }
  for (const b of bumps) {
    // Only the cells a bump reaches.
    const reach = Math.sqrt(b.cut2);
    const i0 = Math.max(0, Math.floor((b.x - reach) / cell));
    const i1 = Math.min(nx - 1, Math.ceil((b.x + reach) / cell));
    const j0 = Math.max(0, Math.floor((b.y - reach) / cell));
    const j1 = Math.min(ny - 1, Math.ceil((b.y + reach) / cell));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) grid[j * nx + i]! += bumpAt(b, i * cell, j * cell);
    }
  }
  return grid;
}

// Marching squares. Corners: a (top left), b (top right), c (bottom right), d (bottom left); the
// case bit is set when a corner is above the level. Edges: 0 top, 1 right, 2 bottom, 3 left.
// Saddles (5 and 10) always pair the same edges: the fixed saddle rule, so output never depends
// on anything but the four corners.
const CASES: readonly (readonly [number, number][])[] = [
  [],
  [[2, 3]],
  [[1, 2]],
  [[1, 3]],
  [[0, 1]],
  [
    [0, 1],
    [2, 3],
  ],
  [[0, 2]],
  [[0, 3]],
  [[0, 3]],
  [[0, 2]],
  [
    [0, 3],
    [1, 2],
  ],
  [[0, 1]],
  [[1, 3]],
  [[1, 2]],
  [[2, 3]],
  [],
];

function trace(grid: Float64Array, nx: number, ny: number, cell: number, t: number): Float32Array {
  const out: number[] = [];
  const point = (
    edge: number,
    x0: number,
    y0: number,
    a: number,
    b: number,
    c: number,
    d: number,
  ) => {
    if (edge === 0) return [x0 + (cell * (t - a)) / (b - a), y0];
    if (edge === 1) return [x0 + cell, y0 + (cell * (t - b)) / (c - b)];
    if (edge === 2) return [x0 + (cell * (t - d)) / (c - d), y0 + cell];
    return [x0, y0 + (cell * (t - a)) / (d - a)];
  };
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = grid[j * nx + i]!;
      const b = grid[j * nx + i + 1]!;
      const c = grid[(j + 1) * nx + i + 1]!;
      const d = grid[(j + 1) * nx + i]!;
      const k = (a > t ? 8 : 0) | (b > t ? 4 : 0) | (c > t ? 2 : 0) | (d > t ? 1 : 0);
      if (k === 0 || k === 15) continue;
      const x0 = i * cell;
      const y0 = j * cell;
      for (const [e1, e2] of CASES[k]!) {
        const p = point(e1, x0, y0, a, b, c, d);
        const q = point(e2, x0, y0, a, b, c, d);
        out.push(p[0]!, p[1]!, q[0]!, q[1]!);
      }
    }
  }
  return Float32Array.from(out);
}

/** The most lines a picture draws, whatever the hills. */
const MAX_LINES = 64;

export function contours(input: ContourInput): ContourResult {
  const width = Math.max(1, input.width);
  const height = Math.max(1, input.height);
  const cell = Math.max(1, input.cell);
  const span = Math.max(width, 320);
  const rand = mulberry32(typeof input.seed === "string" ? hashSeed(input.seed) : input.seed >>> 0);
  const given = input.hills ?? [];

  // Background: seeded hills and waves, drawn in a fixed order so the sequence never shifts.
  const backgroundCount = input.backgroundHills ?? (given.length ? 4 : 7);
  const background: Bump[] = [];
  for (let k = 0; k < backgroundCount; k++) {
    const x = rand() * width;
    const y = given.length ? rand() * height : rand() * height * 1.4 - height * 0.2;
    const r = (given.length ? 0.08 + rand() * 0.14 : 0.14 + rand() * 0.3) * span;
    const a = given.length ? 0.12 + rand() * 0.18 : 0.5 + rand();
    background.push(toBump(x, y, r, a));
  }
  const waves: Wave[] = [];
  const waveScale = (0.028 * 3 * 320) / span;
  for (let k = 0; k < 4; k++) {
    waves.push({
      fx: (rand() - 0.5) * waveScale,
      fy: (rand() - 0.5) * waveScale,
      phase: rand() * Math.PI * 2,
      a: 0.05 + rand() * 0.06,
    });
  }

  const nx = Math.ceil(width / cell) + 1;
  const ny = Math.ceil(height / cell) + 1;

  // Level spacing from the background alone, so the given hills never move other lines.
  const base = sampleGrid(nx, ny, cell, background, waves);
  let min = Infinity;
  let max = -Infinity;
  for (const v of base) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  const levels = Math.max(1, Math.round(input.levels));
  const range = max - min || 1;
  const step = (range + (given.length ? 1 : 0)) / levels;

  const hillBumps = given.map((h) => toBump(h.x * width, h.y * height, h.r * span, h.height));
  let grid = base;
  let top = max;
  if (hillBumps.length) {
    grid = Float64Array.from(base);
    for (const b of hillBumps) {
      const reach = Math.sqrt(b.cut2);
      const i0 = Math.max(0, Math.floor((b.x - reach) / cell));
      const i1 = Math.min(nx - 1, Math.ceil((b.x + reach) / cell));
      const j0 = Math.max(0, Math.floor((b.y - reach) / cell));
      const j1 = Math.min(ny - 1, Math.ceil((b.y + reach) / cell));
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const v = (grid[j * nx + i]! += bumpAt(b, i * cell, j * cell));
          if (v > top) top = v;
        }
      }
    }
  }

  const out: ContourLevel[] = [];
  for (let index = 1; index <= MAX_LINES; index++) {
    const value = min + step * index;
    if (value >= top) break;
    const segments = trace(grid, nx, ny, cell, value);
    if (segments.length) out.push({ index, value, major: index % 4 === 0, segments });
  }

  const labels: ContourLabel[] = given
    .filter((h) => h.label)
    .map((h) => ({ x: h.x * width, y: h.y * height, text: h.label! }));

  return { width, height, levels: out, labels };
}

/**
 * Joins a level's segments into polylines and returns them as one SVG path, rounded to 0.1 px.
 * Segments meet end to end (marching squares shares edge points between cells), so chaining them
 * keeps paths short.
 */
export function segmentsToPath(segments: Float32Array): string {
  const r = (n: number) => Math.round(n * 10) / 10;
  const key = (x: number, y: number) => `${r(x)},${r(y)}`;
  const count = segments.length / 4;
  const used = new Uint8Array(count);
  const byPoint = new Map<string, number[]>();
  for (let i = 0; i < count; i++) {
    for (const k of [
      key(segments[i * 4]!, segments[i * 4 + 1]!),
      key(segments[i * 4 + 2]!, segments[i * 4 + 3]!),
    ]) {
      const list = byPoint.get(k);
      if (list) list.push(i);
      else byPoint.set(k, [i]);
    }
  }
  const nextFrom = (point: string): [number, boolean] | null => {
    for (const i of byPoint.get(point) ?? []) {
      if (used[i]) continue;
      const start = key(segments[i * 4]!, segments[i * 4 + 1]!);
      return [i, start === point];
    }
    return null;
  };
  let d = "";
  for (let first = 0; first < count; first++) {
    if (used[first]) continue;
    used[first] = 1;
    const line: [number, number][] = [
      [segments[first * 4]!, segments[first * 4 + 1]!],
      [segments[first * 4 + 2]!, segments[first * 4 + 3]!],
    ];
    // Extend forward from the end, then backward from the start.
    for (const forward of [true, false]) {
      for (;;) {
        const end = forward ? line[line.length - 1]! : line[0]!;
        const found = nextFrom(key(end[0], end[1]));
        if (!found) break;
        const [i, fromStart] = found;
        used[i] = 1;
        const far: [number, number] = fromStart
          ? [segments[i * 4 + 2]!, segments[i * 4 + 3]!]
          : [segments[i * 4]!, segments[i * 4 + 1]!];
        if (forward) line.push(far);
        else line.unshift(far);
      }
    }
    d += line.map(([x, y], j) => `${j ? "L" : "M"}${r(x)} ${r(y)}`).join("");
  }
  return d;
}

export interface QuietZone {
  /** Left edge, as a fraction of the width. */
  x: number;
  /** Top edge, as a fraction of the height. */
  y: number;
  w: number;
  h: number;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Whether a box in px overlaps any quiet zone (zones are fractions of the picture). */
function overlapsZones(box: Box, width: number, height: number, zones: QuietZone[]): boolean {
  return zones.some((z) => {
    const zx = z.x * width;
    const zy = z.y * height;
    return (
      box.x < zx + z.w * width &&
      box.x + box.w > zx &&
      box.y < zy + z.h * height &&
      box.y + box.h > zy
    );
  });
}

/** About how wide a spot height's label is ("▲ DSA 57" at 11 px semibold). */
export function spotLabelBox(label: ContourLabel): Box {
  return { x: label.x - 6, y: label.y - 6, w: 12 + label.text.length * 6.6, h: 13 };
}

/**
 * Night's soundings (12.10.2): at most `count` faint depth numbers at seeded places, never on a
 * quiet zone (where text sits). Each number's box (about 18 by 12 px above its baseline start)
 * stays clear of the zones, the edges and the other numbers.
 */
export function soundings(
  width: number,
  height: number,
  seed: number | string,
  zones: QuietZone[] = [],
  count = 16,
): ContourLabel[] {
  const rand = mulberry32((typeof seed === "string" ? hashSeed(seed) : seed >>> 0) ^ 0x9e3779b9);
  const out: ContourLabel[] = [];
  const boxW = 18;
  const boxH = 12;
  for (let tries = 0; tries < count * 6 && out.length < Math.min(count, 16); tries++) {
    const x = 4 + rand() * Math.max(0, width - boxW - 8);
    const y = boxH + 4 + rand() * Math.max(0, height - boxH - 8);
    const depth = String(Math.round(8 + rand() * 70));
    if (overlapsZones({ x, y: y - boxH, w: boxW, h: boxH }, width, height, zones)) continue;
    if (out.some((o) => Math.abs(o.x - x) < boxW + 6 && Math.abs(o.y - y) < boxH + 6)) continue;
    out.push({ x, y, text: depth });
  }
  return out;
}

/**
 * Spot heights that may show: labelled peaks whose label clears the quiet zones and the edges,
 * on pictures 480 px or wider.
 */
export function visibleSpotHeights(result: ContourResult, zones: QuietZone[] = []): ContourLabel[] {
  if (result.width < 480) return [];
  return result.labels.filter((l) => {
    const box = spotLabelBox(l);
    const inside =
      box.x >= 0 && box.y >= 0 && box.x + box.w <= result.width && box.y + box.h <= result.height;
    return inside && !overlapsZones(box, result.width, result.height, zones);
  });
}
