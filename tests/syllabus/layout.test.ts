// The precomputed map layout covers every node, is up to date, and keeps bubbles apart.
import { describe, expect, it } from "vitest";
import { BUBBLE_RADIUS, buildLayout, structureHash } from "../../scripts/build-layout.mjs";
import { layout } from "@/data/layout";
import { syllabus } from "@/data/syllabus";

describe("layout.json", () => {
  it("is up to date with the syllabus structure (run `npm run build:layout`)", () => {
    expect(layout.inputHash).toBe(structureHash(syllabus));
  });

  it("has a position for every subject, topic and concept, and a region per subject", () => {
    const ids = [
      ...syllabus.subjects.map((s) => s.id),
      ...syllabus.topics.map((t) => t.id),
      ...syllabus.concepts.map((c) => c.id),
    ];
    for (const id of ids) {
      const p = layout.positions[id];
      expect(p, id).toBeDefined();
      expect(Number.isFinite(p!.x) && Number.isFinite(p!.y)).toBe(true);
    }
    expect(Object.keys(layout.regions).sort()).toEqual(syllabus.subjects.map((s) => s.id).sort());
    for (const r of Object.values(layout.regions)) expect(r.path.startsWith("M")).toBe(true);
    for (const t of syllabus.topics) expect(layout.topics[t.id]!.r).toBeGreaterThan(0);
  });

  it("never lets two concept bubbles overlap", () => {
    const pts = syllabus.concepts.map((c) => ({
      ...layout.positions[c.id]!,
      r: BUBBLE_RADIUS[c.importance],
    }));
    let closest = Infinity;
    for (let i = 0; i < pts.length; i++) {
      for (let j = i + 1; j < pts.length; j++) {
        const a = pts[i]!;
        const b = pts[j]!;
        closest = Math.min(closest, Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r);
      }
    }
    expect(closest).toBeGreaterThan(8);
  });

  it("puts DSA, the largest region, near the middle of the map", () => {
    const dsa = layout.regions.dsa!;
    const areas = Object.values(layout.regions).map((r) => r.area);
    expect(dsa.area).toBe(Math.max(...areas));
    const { minX, maxX } = layout.bounds;
    expect(dsa.cx).toBeGreaterThan(minX + (maxX - minX) * 0.2);
    expect(dsa.cx).toBeLessThan(minX + (maxX - minX) * 0.6);
  });

  it("is deterministic", () => {
    const a = buildLayout(syllabus);
    const b = buildLayout(syllabus);
    expect(a).toEqual(b);
    expect(a.positions).toEqual(layout.positions);
  });
});
