// What the map's bubbles can ask the canvas to do (open a menu, select, fly somewhere). Passed
// down with a context so bubbles stay small and memoized.
import { createContext, useContext } from "react";

export type MenuTarget = { kind: "concept" | "topic"; id: string };

export interface MapActions {
  select: (conceptId: string) => void;
  openMenu: (target: MenuTarget, at: { x: number; y: number }, from: HTMLElement | null) => void;
  flyToTopic: (topicId: string) => void;
  flyToSubject: (subjectId: string) => void;
  /** Hover (desktop): highlight prerequisites and dependents, show the tooltip. */
  hover: (conceptId: string | null, el: HTMLElement | null) => void;
}

const noop = () => undefined;

export const MapActionsContext = createContext<MapActions>({
  select: noop,
  openMenu: noop,
  flyToTopic: noop,
  flyToSubject: noop,
  hover: noop,
});

export function useMapActions(): MapActions {
  return useContext(MapActionsContext);
}

const LONG_PRESS_MS = 520;
const MOVE_TOLERANCE = 10;

/**
 * Long-press on touch opens the bubble's menu (F2 "right-click or long-press"). Returns pointer
 * handlers for the element; a long press also swallows the click that follows it.
 */
export function longPressHandlers(
  onLongPress: (at: { x: number; y: number }, el: HTMLElement) => void,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let start: { x: number; y: number } | null = null;
  let fired = false;
  const cancel = () => {
    if (timer) clearTimeout(timer);
    timer = null;
    start = null;
  };
  return {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      fired = false;
      if (e.pointerType !== "touch") return;
      start = { x: e.clientX, y: e.clientY };
      const el = e.currentTarget;
      timer = setTimeout(() => {
        fired = true;
        if (start) onLongPress(start, el);
        cancel();
      }, LONG_PRESS_MS);
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > MOVE_TOLERANCE) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    /** True when the click that follows is the end of a long press (ignore it). */
    consumeLongPress: () => {
      const was = fired;
      fired = false;
      return was;
    },
  };
}
