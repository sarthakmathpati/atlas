// Living terrain (12.10.7): hills from the subjects' readiness, placed by a seed of the subject id,
// on a background seeded by the ISO week; the focus subjects or else the three that weigh most.
import { describe, expect, it } from "vitest";
import { hillHeight, terrainHills, terrainSeed, terrainSubjects } from "@/lib/art/terrain";
import { subjectWeight } from "@/lib/readiness/score";

const subjects = [
  { id: "dsa", shortName: "DSA", readiness: 57 },
  { id: "os", shortName: "OS", readiness: 44 },
  { id: "cn", shortName: "Networks", readiness: 59 },
];

describe("living terrain", () => {
  it("a hill's height is 0.35 + readiness / 100 × 1.3", () => {
    expect(hillHeight(0)).toBeCloseTo(0.35);
    expect(hillHeight(50)).toBeCloseTo(1);
    expect(hillHeight(100)).toBeCloseTo(1.65);
    expect(hillHeight(140)).toBeCloseTo(1.65);
  });

  it("the background changes with the ISO week, not the day", () => {
    expect(terrainSeed("2026-09-21")).toBe(terrainSeed("2026-09-27"));
    expect(terrainSeed("2026-09-28")).not.toBe(terrainSeed("2026-09-27"));
    expect(terrainSeed("2026-09-27")).toBe("terrain:2026-W39");
  });

  it("places hills the same way every time, apart, labelled with the readiness", () => {
    const a = terrainHills(subjects);
    expect(terrainHills([...subjects].reverse())).toEqual(a);
    expect(a.map((h) => h.label).sort()).toEqual(["DSA 57", "Networks 59", "OS 44"]);
    for (const h of a) {
      expect(h.x).toBeGreaterThanOrEqual(0.5);
      expect(h.x).toBeLessThanOrEqual(0.84);
    }
    for (let i = 0; i < a.length; i++)
      for (let j = i + 1; j < a.length; j++)
        expect(Math.hypot(a[i]!.x - a[j]!.x, (a[i]!.y - a[j]!.y) * 0.35)).toBeGreaterThan(0.1);
    // Only readiness changes a hill's height; its place stays.
    const higher = terrainHills(subjects.map((s) => (s.id === "os" ? { ...s, readiness: 90 } : s)));
    const os = (list: typeof a) => list.find((h) => h.label?.startsWith("OS"))!;
    expect(os(higher).x).toBe(os(a).x);
    expect(os(higher).height).toBeGreaterThan(os(a).height);
  });

  it("uses the focus subjects, or the three that weigh most in the track", () => {
    expect(terrainSubjects({ focusSubjects: ["os"], track: "sde" }, null)).toEqual([
      { id: "os", shortName: "OS", readiness: 0 },
    ]);
    const top = terrainSubjects({ focusSubjects: [], track: "quant" }, null);
    expect(top).toHaveLength(3);
    const weights = top.map((s) => subjectWeight(s.id, "quant"));
    expect(Math.min(...weights)).toBeGreaterThan(0);
  });
});
