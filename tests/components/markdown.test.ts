import { describe, expect, it } from "vitest";
import { conceptLinkId, normalizeDisplayMath } from "@/components/ui/markdown";

describe("normalizeDisplayMath", () => {
  it("turns a one-line $$…$$ into a display block", () => {
    expect(normalizeDisplayMath("Sum:\n$$\\sum i$$\nDone")).toBe("Sum:\n$$\n\\sum i\n$$\nDone");
  });

  it("leaves inline math, fenced blocks and code alone", () => {
    const text = "Cost $O(n)$ and $$x$$ inline.\n$$\nx^2\n$$\n```\n$$not math$$\n```";
    expect(normalizeDisplayMath(text)).toBe(text);
  });
});

describe("conceptLinkId", () => {
  it("reads the concept id of an in-app concept link", () => {
    expect(conceptLinkId("#/concept/oop.patterns-behavioral.strategy")).toBe(
      "oop.patterns-behavioral.strategy",
    );
    expect(conceptLinkId("#/concept/a%2Eb")).toBe("a.b");
  });

  it("ignores other links", () => {
    expect(conceptLinkId(undefined)).toBeUndefined();
    expect(conceptLinkId("#/map?focus=x")).toBeUndefined();
    expect(conceptLinkId("https://example.com/#/concept/x")).toBeUndefined();
    expect(conceptLinkId("#/concept/x?tab=notes")).toBeUndefined();
  });
});
