// Typed access to the precomputed map layout (scripts/build-layout.mjs). Positions are in map
// pixels at zoom 1. The app never computes layout at runtime; dragged bubbles are stored as
// MapOverride records and applied on top of these positions.
import raw from "./layout.json";
import type { MapLayout } from "@/lib/types";

export const layout = raw as MapLayout;

export function positionOf(id: string): { x: number; y: number } | undefined {
  return layout.positions[id];
}
