// Small hooks shared by the component kit.
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";

/** Subscribes to a CSS media query. Returns false where matchMedia doesn't exist (tests). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => undefined;
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () =>
      typeof window !== "undefined" && window.matchMedia ? window.matchMedia(query).matches : false,
    () => false,
  );
}

/** Phones and small tablets (under 768 px): bottom tabs, bottom sheets, 44 px targets. */
export const MOBILE_QUERY = "(max-width: 767.98px)";

export function useIsMobile(): boolean {
  return useMediaQuery(MOBILE_QUERY);
}

/** True when motion should be reduced: the Settings override wins, then the system setting. */
export function prefersReducedMotion(): boolean {
  if (typeof document === "undefined") return true;
  const forced = document.documentElement.dataset.motion;
  if (forced === "reduce") return true;
  if (forced === "full") return false;
  return typeof window !== "undefined" && window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
    : false;
}

/**
 * Keeps content mounted for `exitMs` after `open` turns false, so a closing layer can animate out
 * with its content still visible. Returns whether the content should be rendered.
 */
export function usePresence(open: boolean, exitMs = 200): boolean {
  const [mounted, setMounted] = useState(open);
  // Mount immediately on open (during render, so there is no empty first frame).
  if (open && !mounted) setMounted(true);
  useEffect(() => {
    if (open || !mounted) return;
    const timer = setTimeout(() => setMounted(false), prefersReducedMotion() ? 0 : exitMs);
    return () => clearTimeout(timer);
  }, [open, mounted, exitMs]);
  return open || mounted;
}

/** A ref that always holds the latest value (for stable callbacks that read fresh props). */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

/** Text fields, the code editor and anything editable: single-key shortcuts must ignore them. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target.closest(".cm-editor")) return true;
  const tag = target.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const type = (target as HTMLInputElement).type;
    return !["checkbox", "radio", "button", "submit", "reset", "range", "color", "file"].includes(
      type,
    );
  }
  return false;
}
