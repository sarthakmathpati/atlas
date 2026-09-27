// The contour engine (BUILD_SPEC.md 12.10.6): deterministic, local, fast, and the texture's
// extras never land on text.
import { describe, expect, it } from "vitest";
import {
  contours,
  segmentsToPath,
  soundings,
  visibleSpotHeights,
  type ContourHill,
  type ContourInput,
  type ContourResult,
} from "@/lib/art/contours";
import { emblemHills, emblemLines } from "@/lib/art/emblem";
import { syllabus } from "@/data/syllabus";

const HILLS: ContourHill[] = [
  { x: 0.6, y: 0.66, r: 0.17, height: 1.09, label: "DSA 57" },
  { x: 0.75, y: 0.3, r: 0.11, height: 1.12, label: "CN 59" },
  { x: 0.88, y: 0.78, r: 0.09, height: 0.92, label: "OS 44" },
];

const HEAD: ContourInput = {
  width: 1200,
  height: 240,
  seed: 20260927,
  levels: 12,
  cell: 6,
  hills: HILLS,
};

/** Every segment of a result as "level:x1,y1,x2,y2" (rounded to 1/1000 px). */
function segmentKeys(result: ContourResult): Map<string, [number, number, number, number]> {
  const keys = new Map<string, [number, number, number, number]>();
  for (const level of result.levels) {
    const s = level.segments;
    for (let i = 0; i < s.length; i += 4) {
      const seg: [number, number, number, number] = [s[i]!, s[i + 1]!, s[i + 2]!, s[i + 3]!];
      keys.set(`${level.index}:${seg.map((n) => n.toFixed(3)).join(",")}`, seg);
    }
  }
  return keys;
}

describe("contours", () => {
  it("draws the same lines for the same input, every time", () => {
    const a = contours(HEAD);
    const b = contours({ ...HEAD, hills: HILLS.map((h) => ({ ...h })) });
    expect(a.levels.length).toBeGreaterThan(5);
    expect(b.levels.map((l) => [l.index, l.value, l.major, Array.from(l.segments)])).toEqual(
      a.levels.map((l) => [l.index, l.value, l.major, Array.from(l.segments)]),
    );
    expect(b.labels).toEqual(a.labels);
    // A string seed is as good as a number.
    expect(segmentKeys(contours({ ...HEAD, seed: "dsa" }))).toEqual(
      segmentKeys(contours({ ...HEAD, seed: "dsa" })),
    );
  });

  it("draws a different picture for a different seed", () => {
    const a = segmentKeys(contours(HEAD));
    const b = segmentKeys(contours({ ...HEAD, seed: 20260928 }));
    const shared = [...a.keys()].filter((k) => b.has(k)).length;
    expect(shared / a.size).toBeLessThan(0.2);
  });

  it("changes lines only near a hill whose height changes", () => {
    const before = segmentKeys(contours(HEAD));
    const risen = HILLS.map((h, i) => (i === 1 ? { ...h, height: 1.6 } : h));
    const after = segmentKeys(contours({ ...HEAD, hills: risen }));
    const hill = HILLS[1]!;
    const cx = hill.x * HEAD.width;
    const cy = hill.y * HEAD.height;
    const reach = 3 * hill.r * Math.max(HEAD.width, 320) + 2 * HEAD.cell;
    const changed = [
      ...[...before].filter(([k]) => !after.has(k)),
      ...[...after].filter(([k]) => !before.has(k)),
    ];
    expect(changed.length).toBeGreaterThan(0);
    for (const [key, [x1, y1, x2, y2]] of changed) {
      for (const [x, y] of [
        [x1, y1],
        [x2, y2],
      ] as const) {
        expect(Math.hypot(x - cx, y - cy), key).toBeLessThanOrEqual(reach);
      }
    }
    // Every line beyond the hill's reach is untouched, and there are plenty of them.
    const far = [...before].filter(([, [x1, y1]]) => Math.hypot(x1 - cx, y1 - cy) > reach);
    expect(far.length).toBeGreaterThan(100);
    for (const [key] of far) expect(after.has(key), key).toBe(true);
  });

  it("gives a taller hill more rings", () => {
    const low = contours({ ...HEAD, hills: [{ x: 0.5, y: 0.5, r: 0.12, height: 0.4 }] });
    const high = contours({ ...HEAD, hills: [{ x: 0.5, y: 0.5, r: 0.12, height: 1.6 }] });
    expect(high.levels.length).toBeGreaterThan(low.levels.length);
  });

  it("marks every fourth line as an index contour and labels the peaks", () => {
    const result = contours(HEAD);
    for (const level of result.levels) expect(level.major).toBe(level.index % 4 === 0);
    expect(result.labels.map((l) => l.text)).toEqual(["DSA 57", "CN 59", "OS 44"]);
    expect(result.labels[0]).toEqual({ x: 720, y: 158.4, text: "DSA 57" });
  });

  it("keeps segments inside the picture", () => {
    const result = contours({
      width: 64,
      height: 64,
      seed: "os",
      levels: 7,
      cell: 2,
      hills: HILLS,
    });
    for (const level of result.levels) {
      for (const v of level.segments) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(64 + 2);
      }
    }
    expect(segmentsToPath(result.levels[0]!.segments)).toMatch(/^M[\d.]+ [\d.]+L/);
  });

  it("computes a 1200 × 240 page head at a 6 px cell in under 8 ms", () => {
    for (let i = 0; i < 3; i++) contours(HEAD); // warm up
    const times: number[] = [];
    for (let i = 0; i < 9; i++) {
      const t0 = performance.now();
      contours({ ...HEAD, seed: 1000 + i });
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    expect(times[4]).toBeLessThan(8);
  });
});

describe("texture extras", () => {
  const zones = [{ x: 0, y: 0, w: 0.52, h: 1 }];

  it("puts at most 16 soundings, never under text", () => {
    const marks = soundings(1200, 240, 42, zones);
    expect(marks.length).toBeGreaterThan(4);
    expect(marks.length).toBeLessThanOrEqual(16);
    for (const m of marks) {
      expect(m.x).toBeGreaterThan(0.52 * 1200);
      expect(Number(m.text)).toBeGreaterThanOrEqual(8);
      expect(Number(m.text)).toBeLessThanOrEqual(78);
    }
    expect(soundings(1200, 240, 42, zones)).toEqual(marks);
    expect(soundings(1200, 240, 42, zones, 40).length).toBeLessThanOrEqual(16);
  });

  it("shows spot heights only from 480 px wide and never in a quiet zone", () => {
    const wide = contours(HEAD);
    expect(visibleSpotHeights(wide, zones).map((l) => l.text)).toEqual([
      "DSA 57",
      "CN 59",
      "OS 44",
    ]);
    expect(visibleSpotHeights(wide, [{ x: 0.55, y: 0, w: 0.1, h: 1 }]).map((l) => l.text)).toEqual([
      "CN 59",
      "OS 44",
    ]);
    // A zone that misses the peak but covers its label hides the label too.
    expect(
      visibleSpotHeights(wide, [{ x: 0.62, y: 0.6, w: 0.02, h: 0.1 }]).map((l) => l.text),
    ).toEqual(["CN 59", "OS 44"]);
    const narrow = contours({ ...HEAD, width: 390 });
    expect(visibleSpotHeights(narrow)).toEqual([]);
  });
});

describe("subject emblems", () => {
  const ids = syllabus.subjects.map((s) => s.id);

  it("draw every subject the same way every time, and each one differently", () => {
    const paths = new Set<string>();
    for (const id of ids) {
      const lines = emblemLines(id);
      expect(lines.length, id).toBeGreaterThanOrEqual(3);
      expect(emblemLines(id)).toBe(lines); // memoized
      paths.add(lines.map((l) => l.d).join(""));
    }
    expect(paths.size).toBe(ids.length);
    expect(emblemHills("dsa")).toEqual(emblemHills("dsa"));
    for (const hill of emblemHills("career")) {
      expect(hill.x).toBeGreaterThanOrEqual(0.28);
      expect(hill.x).toBeLessThanOrEqual(0.72);
    }
  });

  it("chain segments into polylines, keeping every point", () => {
    const result = contours({ width: 64, height: 64, seed: 7, levels: 7, cell: 2, hills: HILLS });
    for (const level of result.levels) {
      const d = segmentsToPath(level.segments);
      const moves = (d.match(/M/g) ?? []).length;
      expect(moves).toBeLessThan(level.segments.length / 4 / 3);
      const points = new Set(d.match(/-?[\d.]+ -?[\d.]+/g));
      const s = level.segments;
      const r = (n: number) => Math.round(n * 10) / 10;
      for (let i = 0; i < s.length; i += 2)
        expect(points.has(`${r(s[i]!)} ${r(s[i + 1]!)}`)).toBe(true);
    }
  });
});
