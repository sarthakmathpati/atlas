// F2 map logic: filters in the URL, label culling, status summaries.
import { describe, expect, it } from "vitest";
import { conceptById, concepts, subjects } from "@/data/syllabus";
import {
  activeFilterCount,
  conceptMatches,
  conceptOnMap,
  effectiveScope,
  EMPTY_MAP_FILTERS,
  parseMapFilters,
  writeMapFilters,
  type MapFilters,
} from "@/lib/map/filters";
import { labelThresholds, measureLabel, type LabelItem } from "@/lib/map/labels";
import { countStatuses, strongShare } from "@/lib/map/summary";
import { layout } from "@/data/layout";

const SUBJECT_IDS = subjects.map((s) => s.id);

describe("map filters", () => {
  it("round-trips through the URL and keeps other keys", () => {
    const f: MapFilters = {
      subjects: ["dsa", "os"],
      statuses: ["fading", "learning"],
      importance: ["must"],
      ready: true,
      due: false,
      advanced: "hide",
      track: "quant",
      showHidden: true,
    };
    const q = writeMapFilters(new URLSearchParams("focus=x"), f);
    expect(q.get("focus")).toBe("x");
    const back = parseMapFilters(q, SUBJECT_IDS);
    expect(back).toEqual({ ...f, statuses: ["learning", "fading"] });
    expect(activeFilterCount(back)).toBe(7);
    expect(writeMapFilters(q, EMPTY_MAP_FILTERS).toString()).toBe("focus=x");
  });

  it("ignores unknown values", () => {
    const f = parseMapFilters(
      new URLSearchParams("subjects=dsa,nope&status=odd&track=all&advanced=maybe"),
      SUBJECT_IDS,
    );
    expect(f).toEqual({ ...EMPTY_MAP_FILTERS, subjects: ["dsa"] });
  });

  it("removes bubbles for scope filters and dims for attribute filters", () => {
    const bfs = conceptById.get("dsa.graph-basics.bfs")!;
    const advanced = concepts.find((c) => c.importance === "advanced")!;
    const quantOnly = concepts.find((c) => c.tracks.length === 1 && c.tracks[0] === "quant")!;
    const scope = effectiveScope(EMPTY_MAP_FILTERS, { track: "sde", showAdvanced: false });
    expect(conceptOnMap(bfs, false, EMPTY_MAP_FILTERS, scope)).toBe(true);
    expect(conceptOnMap(bfs, true, EMPTY_MAP_FILTERS, scope)).toBe(false);
    expect(conceptOnMap(bfs, true, { ...EMPTY_MAP_FILTERS, showHidden: true }, scope)).toBe(true);
    expect(conceptOnMap(advanced, false, EMPTY_MAP_FILTERS, scope)).toBe(false);
    expect(conceptOnMap(quantOnly, false, EMPTY_MAP_FILTERS, scope)).toBe(false);
    const both = effectiveScope({ ...EMPTY_MAP_FILTERS, track: "both", advanced: "show" }, scope);
    expect(both).toEqual({ track: "both", showAdvanced: true });
    expect(conceptOnMap(quantOnly, false, EMPTY_MAP_FILTERS, both)).toBe(true);
    expect(conceptOnMap(bfs, false, { ...EMPTY_MAP_FILTERS, subjects: ["os"] }, both)).toBe(false);

    const facts = { status: "learning" as const, due: true, ready: false };
    expect(conceptMatches(bfs, facts, EMPTY_MAP_FILTERS)).toBe(true);
    expect(conceptMatches(bfs, facts, { ...EMPTY_MAP_FILTERS, statuses: ["fading"] })).toBe(false);
    expect(conceptMatches(bfs, facts, { ...EMPTY_MAP_FILTERS, due: true })).toBe(true);
    expect(conceptMatches(bfs, facts, { ...EMPTY_MAP_FILTERS, ready: true })).toBe(false);
    expect(conceptMatches(bfs, facts, { ...EMPTY_MAP_FILTERS, importance: ["must"] })).toBe(true);
  });
});

describe("map labels", () => {
  const ZOOMS = [0.7, 0.85, 1, 1.25, 1.5, 2, 3];
  const items: LabelItem[] = concepts.map((c) => {
    const p = layout.positions[c.id]!;
    const { w, h } = measureLabel(c.name);
    return {
      id: c.id,
      x: p.x,
      y: p.y,
      r: layout.sizes.bubbleRadius[c.importance],
      w,
      h,
      priority: c.importance === "must" ? 3 : c.importance === "important" ? 2 : 1,
    };
  });
  const started = performance.now();
  const thresholds = labelThresholds(items, ZOOMS, { anchor: "below" });
  const elapsed = performance.now() - started;

  it("is fast enough to run when bubbles move", () => {
    expect(elapsed).toBeLessThan(250);
  });

  it("never lets two shown labels overlap, at any zoom step", () => {
    for (const [k, z] of ZOOMS.entries()) {
      const shown = items.filter((it) => thresholds.get(it.id)! <= k);
      const boxes = shown.map((it) => {
        const top = it.y + it.r + 3 / z;
        return [it.x - it.w / 2 / z, top, it.x + it.w / 2 / z, top + it.h / z] as const;
      });
      const overlaps: string[] = [];
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const a = boxes[i]!;
          const b = boxes[j]!;
          if (a[0] < b[2] && a[2] > b[0] && a[1] < b[3] && a[3] > b[1])
            overlaps.push(`${shown[i]!.id} / ${shown[j]!.id} at ${z}`);
        }
      }
      expect(overlaps).toEqual([]);
    }
  });

  it("shows more labels as you zoom in, must-know ones first", () => {
    const counts = ZOOMS.map((_, k) => items.filter((it) => thresholds.get(it.id)! <= k).length);
    for (let k = 1; k < counts.length; k++)
      expect(counts[k]!).toBeGreaterThanOrEqual(counts[k - 1]!);
    expect(counts.at(-1)!).toBeGreaterThan(items.length * 0.9);
    const shareAt = (priority: number, k: number) => {
      const group = items.filter((it) => it.priority === priority);
      return group.filter((it) => thresholds.get(it.id)! <= k).length / group.length;
    };
    expect(shareAt(3, 2)).toBeGreaterThan(shareAt(1, 2));
  });

  it("is deterministic", () => {
    expect(labelThresholds(items, ZOOMS, { anchor: "below" })).toEqual(thresholds);
  });

  it("measures labels up to two lines", () => {
    expect(measureLabel("BFS")).toEqual({ w: 3 * 5.9, h: 14 });
    expect(measureLabel("A rather long concept name that wraps twice over").h).toBe(28);
  });
});

describe("status summaries", () => {
  it("counts statuses and the strong share", () => {
    const statuses: Record<string, "strong" | "learning"> = { a: "strong", b: "learning" };
    const counts = countStatuses(["a", "b", "c", "d"], (id) => statuses[id] ?? "not_started");
    expect(counts).toEqual({ not_started: 2, learning: 1, strong: 1, fading: 0 });
    expect(strongShare(counts)).toBe(0.25);
    expect(strongShare(countStatuses([], () => "strong"))).toBe(0);
  });
});

describe("placing the owner's own concept", () => {
  it("puts it near its topic without overlapping anything, deterministically", async () => {
    const { placeNearTopic } = await import("@/lib/map/place");
    const topic = { x: 0, y: 0, r: 100 };
    const occupied = [
      { x: 0, y: 55, r: 18 },
      { x: 40, y: 40, r: 18 },
    ];
    const p = placeNearTopic(topic, occupied, 14);
    for (const o of occupied)
      expect(Math.hypot(o.x - p.x, o.y - p.y)).toBeGreaterThanOrEqual(o.r + 14 + 26);
    expect(Math.hypot(p.x, p.y)).toBeLessThan(topic.r + 200);
    expect(placeNearTopic(topic, occupied, 14)).toEqual(p);
    const second = placeNearTopic(topic, [...occupied, { ...p, r: 14 }], 14);
    expect(second).not.toEqual(p);
  });
});
