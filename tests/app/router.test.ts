import { describe, expect, it } from "vitest";
import { parseHash, routeHref } from "@/app/router";

describe("hash router (F1)", () => {
  it("defaults to Today", () => {
    expect(parseHash("").name).toBe("today");
    expect(parseHash("#/").name).toBe("today");
    expect(parseHash("#/today").path).toBe("/today");
  });

  it("parses every route in the spec", () => {
    const cases: [string, string, string?][] = [
      ["#/map", "map"],
      ["#/concept/dsa.graph-basics.bfs", "concept", "dsa.graph-basics.bfs"],
      ["#/problems", "problems"],
      ["#/problems/lc-1", "problem", "lc-1"],
      ["#/review", "review"],
      ["#/drill", "drill"],
      ["#/quiz", "quiz"],
      ["#/mental-math", "mental-math"],
      ["#/puzzles", "puzzles"],
      ["#/mock", "mock"],
      ["#/mock/abc", "mock-session", "abc"],
      ["#/designs", "designs"],
      ["#/designs/lld-parking-lot", "design", "lld-parking-lot"],
      ["#/stories", "stories"],
      ["#/mistakes", "mistakes"],
      ["#/dashboard", "dashboard"],
      ["#/weekly", "weekly"],
      ["#/revision", "revision"],
      ["#/settings", "settings"],
      ["#/practice", "practice"],
    ];
    for (const [hash, name, id] of cases) {
      const route = parseHash(hash);
      expect(route.name, hash).toBe(name);
      expect(route.id, hash).toBe(id);
    }
  });

  it("reads the query string", () => {
    const route = parseHash("#/map?focus=dsa.graph-basics.bfs");
    expect(route.name).toBe("map");
    expect(route.query.get("focus")).toBe("dsa.graph-basics.bfs");
  });

  it("ignores a trailing slash and decodes ids", () => {
    expect(parseHash("#/settings/").name).toBe("settings");
    expect(parseHash("#/concept/a%2Bb").id).toBe("a+b");
    expect(parseHash("#/concept/%E0%A4%A").id).toBe("%E0%A4%A");
  });

  it("marks unknown paths as not found", () => {
    expect(parseHash("#/nope").name).toBe("not-found");
    expect(parseHash("#/problems/lc-1/extra").name).toBe("not-found");
  });

  it("builds links that parse back", () => {
    const href = routeHref("/concept", "custom.x y", { a: "1" });
    expect(href).toBe("#/concept/custom.x%20y?a=1");
    const route = parseHash(href);
    expect(route.id).toBe("custom.x y");
    expect(route.query.get("a")).toBe("1");
  });
});
