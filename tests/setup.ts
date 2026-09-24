// Shared test setup. jest-dom matchers are only meaningful in jsdom tests but are harmless in Node.
import "@testing-library/jest-dom/vitest";

// jsdom lacks a few browser APIs the shell uses; give component tests small stand-ins.
if (typeof window !== "undefined" && typeof document !== "undefined") {
  const proto = window.HTMLDialogElement?.prototype;
  if (proto && typeof proto.showModal !== "function") {
    proto.show = function show(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
    proto.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    };
    proto.close = function close(this: HTMLDialogElement) {
      if (!this.hasAttribute("open")) return;
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close"));
    };
  }
  if (!window.matchMedia) {
    window.matchMedia = (query: string) =>
      ({
        matches: false,
        media: query,
        onchange: null,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
        addListener: () => undefined,
        removeListener: () => undefined,
        dispatchEvent: () => false,
      }) as MediaQueryList;
  }
  if (!("ResizeObserver" in window)) {
    (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
  // CodeMirror measures text ranges; jsdom doesn't lay out, so report empty boxes.
  const emptyRects = () => Object.assign([], { item: () => null }) as unknown as DOMRectList;
  const emptyRect = () => new DOMRect(0, 0, 0, 0);
  if (typeof Range !== "undefined") {
    if (!Range.prototype.getClientRects) Range.prototype.getClientRects = emptyRects;
    if (!Range.prototype.getBoundingClientRect) Range.prototype.getBoundingClientRect = emptyRect;
  }
  if (!Element.prototype.scrollIntoView) Element.prototype.scrollIntoView = () => undefined;
  if (!Element.prototype.scrollTo) Element.prototype.scrollTo = () => undefined;
}
