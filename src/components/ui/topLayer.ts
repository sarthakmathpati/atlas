// The browser top layer (Popover API) and the stack of open floating layers.
type PopoverCapable = HTMLElement & { showPopover?: () => void; hidePopover?: () => void };

/** Shows an element in the top layer when the browser supports the Popover API. */
export function showInTopLayer(el: HTMLElement | null): void {
  const p = el as PopoverCapable | null;
  if (!p || typeof p.showPopover !== "function") return;
  try {
    if (p.matches(":popover-open")) p.hidePopover?.();
    p.showPopover();
  } catch {
    /* already shown, or not connected yet */
  }
}

export function hideFromTopLayer(el: HTMLElement | null): void {
  const p = el as PopoverCapable | null;
  if (!p || typeof p.hidePopover !== "function") return;
  try {
    if (p.matches(":popover-open")) p.hidePopover();
  } catch {
    /* ignore */
  }
}

// Only the most recently opened layer reacts to Escape and outside clicks.
export const layerStack: symbol[] = [];

export function isTopLayer(token: symbol): boolean {
  return layerStack[layerStack.length - 1] === token;
}

/** Browsers without the Popover API (and test DOMs) get plain fixed-position layers instead. */
export const SUPPORTS_POPOVER =
  typeof HTMLElement !== "undefined" && "showPopover" in HTMLElement.prototype;

/** The `popover` attribute value to use, or undefined where it isn't supported. */
export const POPOVER_MANUAL: "manual" | undefined = SUPPORTS_POPOVER ? "manual" : undefined;
