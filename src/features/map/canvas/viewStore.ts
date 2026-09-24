// The map's view state (F2): zoom level, which labels fit, what is hovered, selected or
// emphasised. Kept in a small store so each bubble subscribes to just the bit it needs (a
// status or emphasis change re-renders one bubble, not the map).
import { create } from "zustand";

export type ZoomLevel = "far" | "middle" | "near";

/** Semantic zoom thresholds (F2): subjects below 0.3, topics to 0.7, concepts above. */
export const MIDDLE_ZOOM = 0.3;
export const NEAR_ZOOM = 0.7;
export const MIN_ZOOM = 0.03;
export const MAX_ZOOM = 3;

/** Zoom steps at which labels are re-checked for room (lib/map/labels). */
export const CONCEPT_LABEL_ZOOMS = [0.7, 0.8, 0.9, 1, 1.15, 1.3, 1.5, 1.75, 2, 2.5, 3];
export const TOPIC_LABEL_ZOOMS = [0.3, 0.35, 0.4, 0.45, 0.5, 0.58, 0.66];
export const SUBJECT_LABEL_ZOOMS = [0.03, 0.045, 0.06, 0.08, 0.1, 0.13, 0.17, 0.22, 0.28];

export function levelFor(zoom: number): ZoomLevel {
  return zoom < MIDDLE_ZOOM ? "far" : zoom < NEAR_ZOOM ? "middle" : "near";
}

/** The largest step at or below the zoom (-1 below the first). */
export function stepFor(zooms: readonly number[], zoom: number): number {
  let step = -1;
  for (let i = 0; i < zooms.length; i++) if (zoom >= zooms[i]! - 1e-6) step = i;
  return step;
}

export interface MapViewState {
  zoom: number;
  level: ZoomLevel;
  conceptStep: number;
  topicStep: number;
  subjectStep: number;
  hovered: string | null;
  selected: string | null;
  /** Ids shown at full strength (neighborhood, path); everything else is dimmed. */
  emphasis: ReadonlySet<string> | null;
  /** A bubble that pulses once (after a search jump). */
  pulse: { id: string; key: number } | null;
  /** Lines from a concept that just turned strong to the concepts it made ready. */
  inkEdges: { from: string; to: string[]; key: number } | null;
}

export const useMapView = create<MapViewState>(() => ({
  zoom: 0.1,
  level: "far",
  conceptStep: -1,
  topicStep: -1,
  subjectStep: 0,
  hovered: null,
  selected: null,
  emphasis: null,
  pulse: null,
  inkEdges: null,
}));

/** Updates zoom-derived state only when something a bubble reads has changed. */
export function setViewZoom(zoom: number): void {
  const s = useMapView.getState();
  const next = {
    zoom,
    level: levelFor(zoom),
    conceptStep: stepFor(CONCEPT_LABEL_ZOOMS, zoom),
    topicStep: stepFor(TOPIC_LABEL_ZOOMS, zoom),
    subjectStep: stepFor(SUBJECT_LABEL_ZOOMS, zoom),
  };
  if (
    next.level !== s.level ||
    next.conceptStep !== s.conceptStep ||
    next.topicStep !== s.topicStep ||
    next.subjectStep !== s.subjectStep
  ) {
    useMapView.setState(next);
  } else if (Math.abs(zoom - s.zoom) > 1e-3) {
    // Keep the number fresh for readers that need it (the minimap), without re-rendering bubbles.
    useMapView.setState({ zoom });
  }
}

/** "on" (emphasised), "off" (dimmed) or "none" (no emphasis active). */
export function useEmphasis(id: string): "on" | "off" | "none" {
  return useMapView((s) => (s.emphasis ? (s.emphasis.has(id) ? "on" : "off") : "none"));
}
