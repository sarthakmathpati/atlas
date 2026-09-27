import { describe, expect, it } from "vitest";
import {
  inferKind,
  layoutSketch,
  MAX_NODES,
  parseSketch,
  routePath,
  SKETCH_EXAMPLE,
  type PlacedNode,
} from "@/lib/designs/sketch";

describe("parsing the sketch", () => {
  it("reads arrows, labels, chains and lone boxes", () => {
    const s = parseSketch(
      [
        "# URL shortener",
        "Client -> API Gateway : HTTPS",
        "API Gateway -> URL Service -> Links DB",
        "",
        "// a comment",
        "Cache",
      ].join("\n"),
    );
    expect(s.errors).toEqual([]);
    expect(s.nodes.map((n) => n.label)).toEqual([
      "Client",
      "API Gateway",
      "URL Service",
      "Links DB",
      "Cache",
    ]);
    expect(s.edges).toEqual([
      expect.objectContaining({ from: "client", to: "api gateway", label: "HTTPS", line: 2 }),
      expect.objectContaining({ from: "api gateway", to: "url service", line: 3 }),
      expect.objectContaining({ from: "url service", to: "links db", line: 3 }),
    ]);
    expect(s.edges[1]!.label).toBeUndefined();
  });

  it("treats names the same regardless of case and spaces, keeping the first spelling", () => {
    const s = parseSketch("API Gateway -> Auth\napi   gateway -> Users");
    expect(s.nodes.map((n) => n.label)).toEqual(["API Gateway", "Auth", "Users"]);
    expect(s.edges.every((e) => e.from === "api gateway")).toBe(true);
  });

  it("knows every arrow: reversed, both ways, dashed and plain", () => {
    const s = parseSketch("A <- B\nC <-> D\nE --> F : event\nG <-- H\nI -- J");
    expect(s.errors).toEqual([]);
    const by = (from: string) => s.edges.find((e) => e.from === from)!;
    expect(by("b")).toMatchObject({ to: "a", style: "solid", heads: "end" });
    expect(by("c")).toMatchObject({ to: "d", heads: "both" });
    expect(by("e")).toMatchObject({ to: "f", style: "dashed", heads: "end", label: "event" });
    expect(by("h")).toMatchObject({ to: "g", style: "dashed" });
    expect(by("i")).toMatchObject({ to: "j", heads: "none" });
  });

  it("drops repeated arrows but keeps different labels", () => {
    const s = parseSketch("A -> B\nA -> B\nA -> B : retry");
    expect(s.edges).toHaveLength(2);
  });

  it("reads kinds in brackets and guesses them from names", () => {
    const s = parseSketch("Orders [db]\nSession Store -> Redis\nWorker --> Kafka\nUser -> CDN");
    const kind = (label: string) => s.nodes.find((n) => n.label === label)!.kind;
    expect(kind("Orders")).toBe("db");
    expect(kind("Redis")).toBe("cache");
    expect(kind("Kafka")).toBe("queue");
    expect(kind("User")).toBe("client");
    expect(kind("CDN")).toBe("external");
    expect(kind("Worker")).toBe("service");
    expect(inferKind("Links DB")).toBe("db");
    expect(inferKind("Media bucket (S3)")).toBe("storage");
    // A later bracket sets the kind of a box named earlier.
    const t = parseSketch("App -> Store\nStore [cache]");
    expect(t.nodes.find((n) => n.label === "Store")!.kind).toBe("cache");
  });

  it("parses the example it offers", () => {
    const s = parseSketch(SKETCH_EXAMPLE);
    expect(s.errors).toEqual([]);
    expect(s.nodes).toHaveLength(6);
    expect(s.edges).toHaveLength(5);
  });
});

describe("helpful errors that name the line", () => {
  const errorFor = (text: string) => parseSketch(text).errors;

  it("explains an arrow without a name on one side", () => {
    expect(errorFor("-> API")).toEqual([
      { line: 1, message: "An arrow needs a name before it, such as “Client -> API Gateway”." },
    ]);
    expect(errorFor("Client ->")[0]!.message).toMatch(/needs a name after it/);
    expect(errorFor("A -> -> B")[0]!.message).toMatch(/Two arrows in a row need a name between/);
  });

  it("suggests the right arrow for ones it doesn't draw", () => {
    expect(errorFor("Client => API")[0]).toMatchObject({ line: 1 });
    expect(errorFor("Client => API")[0]!.message).toMatch(/Write it as “->”/);
    expect(errorFor("Client → API")[0]!.message).toMatch(/“->”/);
    expect(errorFor("A ..> B")[0]!.message).toMatch(/“-->”/);
    expect(errorFor("A > B")[0]!.message).toMatch(/“->”/);
    expect(errorFor("A -> B => C")[0]!.message).toMatch(/looks like an arrow Atlas doesn't know/);
  });

  it("explains labels, kinds, long names and loops", () => {
    expect(errorFor("Just a note: hello")[0]!.message).toMatch(/A label needs an arrow before it/);
    expect(errorFor("A -> B :")[0]!.message).toMatch(/Nothing follows the colon/);
    expect(errorFor("Orders [database]")[0]!.message).toMatch(
      /isn't a kind Atlas knows\. Use one of: client, service, db, cache, queue, storage, external/,
    );
    expect(errorFor("[db]")[0]!.message).toMatch(/A kind needs a name before it/);
    expect(errorFor("A [db] thing -> B")[0]!.message).toMatch(/at the end of a name/);
    expect(errorFor(`${"x".repeat(45)} -> B`)[0]!.message).toMatch(/45 characters/);
    expect(errorFor("Worker -> worker")[0]!.message).toMatch(/to itself can't be drawn/);
  });

  it("reports the right line numbers and still draws the good lines", () => {
    const s = parseSketch("Client -> API\n\nAPI => DB\nAPI -> Cache\n-> Nothing");
    expect(s.errors.map((e) => e.line)).toEqual([3, 5]);
    expect(s.edges.map((e) => `${e.from}>${e.to}`)).toEqual(["client>api", "api>cache"]);
  });

  it("caps very large sketches", () => {
    const lines = Array.from({ length: MAX_NODES + 5 }, (_, i) => `Hub -> Box ${i}`);
    const s = parseSketch(lines.join("\n"));
    expect(s.nodes).toHaveLength(MAX_NODES);
    expect(s.errors.at(-1)!.message).toMatch(/Atlas draws the first 40/);
    expect(s.edges.every((e) => s.nodes.some((n) => n.id === e.to))).toBe(true);
  });
});

describe("the layered layout", () => {
  const overlap = (a: PlacedNode, b: PlacedNode) =>
    Math.abs(a.x - b.x) < (a.width + b.width) / 2 &&
    Math.abs(a.y - b.y) < (a.height + b.height) / 2;

  it("places every box without overlaps, flowing in the chosen direction", () => {
    const s = parseSketch(
      `${SKETCH_EXAMPLE}\nAPI Gateway -> Auth Service\nAuth Service -> Users DB\nURL Service -> Links DB`,
    );
    for (const dir of ["LR", "TB"] as const) {
      const l = layoutSketch(s, dir);
      expect(l.nodes).toHaveLength(s.nodes.length);
      for (let i = 0; i < l.nodes.length; i++)
        for (let j = i + 1; j < l.nodes.length; j++)
          expect(
            overlap(l.nodes[i]!, l.nodes[j]!),
            `${l.nodes[i]!.label}/${l.nodes[j]!.label}`,
          ).toBe(false);
      const at = (label: string) => l.nodes.find((n) => n.label === label)!;
      // Arrows point forward in the layout: Client before API Gateway before URL Service.
      const axis = dir === "LR" ? "x" : "y";
      expect(at("Client")[axis]).toBeLessThan(at("API Gateway")[axis]);
      expect(at("API Gateway")[axis]).toBeLessThan(at("URL Service")[axis]);
      expect(l.width).toBeGreaterThan(0);
      expect(l.height).toBeGreaterThan(0);
    }
  });

  it("lays out an empty sketch", () => {
    expect(layoutSketch({ nodes: [], edges: [] }).nodes).toEqual([]);
  });
});

describe("edge routes", () => {
  it("routes every arrow between its boxes and places labels", () => {
    const l = layoutSketch(parseSketch("Client -> API : HTTPS\nAPI -> DB\nAPI --> Queue"));
    for (const e of l.edges) {
      expect(e.points.length).toBeGreaterThanOrEqual(2);
      const from = l.nodes.find((n) => n.id === e.from)!;
      const to = l.nodes.find((n) => n.id === e.to)!;
      const start = e.points[0]!;
      const end = e.points.at(-1)!;
      // The route starts on the source box's border and ends on the target's.
      expect(Math.abs(start.x - from.x)).toBeLessThanOrEqual(from.width / 2 + 1);
      expect(Math.abs(end.x - to.x)).toBeLessThanOrEqual(to.width / 2 + 1);
    }
    expect(l.edges[0]!.labelAt).toBeDefined();
    expect(l.edges[1]!.labelAt).toBeUndefined();
  });

  it("draws a path through the points", () => {
    expect(routePath([])).toBe("");
    expect(
      routePath([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ]),
    ).toBe("M 0 0 L 10 0");
    expect(
      routePath([
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ]),
    ).toMatch(/^M 0 0 L .* Q 10 0 .* L 10 10$/);
  });
});
