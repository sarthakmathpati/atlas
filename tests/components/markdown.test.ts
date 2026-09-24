import { describe, expect, it } from "vitest";
import { normalizeDisplayMath } from "@/components/ui/markdown";

describe("normalizeDisplayMath", () => {
  it("turns a one-line $$…$$ into a display block", () => {
    expect(normalizeDisplayMath("Sum:\n$$\\sum i$$\nDone")).toBe("Sum:\n$$\n\\sum i\n$$\nDone");
  });

  it("leaves inline math, fenced blocks and code alone", () => {
    const text = "Cost $O(n)$ and $$x$$ inline.\n$$\nx^2\n$$\n```\n$$not math$$\n```";
    expect(normalizeDisplayMath(text)).toBe(text);
  });
});
