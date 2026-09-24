// F25 "done when": paths are correct on hand-checked examples.
import { describe, expect, it } from "vitest";
import { conceptById } from "@/data/syllabus";
import { pathTo, type PathContext } from "@/lib/path/path";
import type { Status } from "@/lib/types";

const DIJKSTRA = "dsa.shortest-paths.dijkstras-algorithm";

function ctx(statuses: Record<string, Status> = {}, hidden: string[] = []): PathContext {
  return {
    getConcept: (id) => conceptById.get(id),
    statusOf: (id) => statuses[id] ?? "not_started",
    inScope: (c) => !hidden.includes(c.id),
  };
}

const ids = (ctxValue: PathContext, target = DIJKSTRA) =>
  pathTo(target, ctxValue)!.steps.map((s) => s.concept.id);

describe("path to a concept", () => {
  it("lists every unmet prerequisite for a beginner, target last", () => {
    const path = pathTo(DIJKSTRA, ctx())!;
    const list = path.steps.map((s) => s.concept.id);
    expect(list.at(-1)).toBe(DIJKSTRA);
    expect(path.steps.at(-1)!.target).toBe(true);
    // The concept's own prerequisite.
    expect(list).toContain("dsa.heaps.binary-heap");
    // Must-know concepts of the prerequisite topics (graphs basics, heaps).
    expect(list).toContain("dsa.graph-basics.bfs");
    expect(list).toContain("dsa.graph-basics.graph-representations");
    expect(list).toContain("dsa.heaps.top-k-elements");
    // BFS's own prerequisite from another topic, followed transitively.
    expect(list).toContain("dsa.stacks-queues.queue-and-deque-basics");
    // Important (not must-know) concepts of prerequisite topics are not required.
    expect(list).not.toContain("dsa.graph-basics.bipartite-check");
    expect(new Set(list).size).toBe(list.length);
    expect(path.before).toBe(list.length - 1);
    expect(path.totalMinutes).toBe(path.steps.reduce((n, s) => n + s.minutes, 0));
  });

  it("puts every prerequisite before the concepts that need it", () => {
    const list = ids(ctx());
    const at = new Map(list.map((id, i) => [id, i]));
    for (const id of list) {
      for (const p of conceptById.get(id)!.prereqs) {
        if (at.has(p)) expect(at.get(p)!, `${p} before ${id}`).toBeLessThan(at.get(id)!);
      }
    }
    expect(at.get("dsa.stacks-queues.queue-and-deque-basics")!).toBeLessThan(
      at.get("dsa.graph-basics.bfs")!,
    );
    expect(at.get("dsa.graph-basics.bfs")!).toBeLessThan(
      at.get("dsa.graph-basics.topological-sort")!,
    );
  });

  it("leaves out what is already learning or strong, and what those needed", () => {
    const list = ids(
      ctx({
        "dsa.graph-basics.bfs": "strong",
        "dsa.heaps.binary-heap": "learning",
      }),
    );
    expect(list).not.toContain("dsa.graph-basics.bfs");
    expect(list).not.toContain("dsa.heaps.binary-heap");
    // Only BFS needed the queue basics, and BFS is learned.
    expect(list).not.toContain("dsa.stacks-queues.queue-and-deque-basics");
    // Other unmet must-know concepts are still there.
    expect(list).toContain("dsa.graph-basics.dfs");
  });

  it("keeps fading prerequisites on the path (they need a review first)", () => {
    const list = ids(ctx({ "dsa.heaps.binary-heap": "fading" }));
    expect(list).toContain("dsa.heaps.binary-heap");
  });

  it("is just the concept when everything before it is learned", () => {
    const statuses: Record<string, Status> = {};
    for (const id of ids(ctx())) statuses[id] = "learning";
    delete statuses[DIJKSTRA];
    const path = pathTo(DIJKSTRA, ctx(statuses))!;
    expect(path.steps.map((s) => s.concept.id)).toEqual([DIJKSTRA]);
    expect(path.before).toBe(0);
  });

  it("skips prerequisites outside the owner's scope", () => {
    const list = ids(ctx({}, ["dsa.heaps.binary-heap"]));
    expect(list).not.toContain("dsa.heaps.binary-heap");
  });

  it("returns null for an unknown concept", () => {
    expect(pathTo("nope", ctx())).toBeNull();
  });
});
