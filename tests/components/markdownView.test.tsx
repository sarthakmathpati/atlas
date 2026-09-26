// @vitest-environment jsdom
// MarkdownView: links to concepts in content open in place when a handler is given (the map's
// panel), and stay ordinary links to the concept page otherwise.
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import MarkdownView from "@/components/ui/MarkdownView";

afterEach(cleanup);

const text =
  "Pricing is a [strategy](#/concept/oop.patterns-behavioral.strategy); see [docs](https://example.com).";

describe("MarkdownView concept links", () => {
  it("opens a concept link through the handler instead of navigating", () => {
    const open = vi.fn();
    render(<MarkdownView onConceptLink={open}>{text}</MarkdownView>);
    const link = screen.getByRole("link", { name: "strategy" });
    expect(link.getAttribute("href")).toBe("#/concept/oop.patterns-behavioral.strategy");
    const notPrevented = fireEvent.click(link);
    expect(notPrevented).toBe(false);
    expect(open).toHaveBeenCalledWith("oop.patterns-behavioral.strategy");
    // A modified click (new tab) is left to the browser.
    fireEvent.click(link, { ctrlKey: true });
    expect(open).toHaveBeenCalledTimes(1);
  });

  it("keeps plain links without a handler, and external links open in a new tab", () => {
    render(<MarkdownView>{text}</MarkdownView>);
    const link = screen.getByRole("link", { name: "strategy" });
    expect(fireEvent.click(link)).toBe(true);
    expect(screen.getByRole("link", { name: "docs" }).getAttribute("target")).toBe("_blank");
  });
});
