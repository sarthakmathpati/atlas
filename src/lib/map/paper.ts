// The map's paper at far zoom (12.10.6): contour lines in map coordinates, with each subject's
// region as a hill, so the islands sit on a surveyed landscape and the lines pan and zoom with
// the map. Seeded and pure: the same layout always gives the same paper.
import { contours, segmentsToPath, type ContourHill } from "@/lib/art/contours";

export interface PaperLine {
  d: string;
  major: boolean;
}

interface RegionShape {
  cx: number;
  cy: number;
  r: number;
}

/** Map units of paper beyond the layout on every side. */
export const PAPER_MARGIN = 1600;
/** Grid cell in map units (lines are smooth well past the far zoom's scale). */
const CELL = 48;

export function paperContours(
  bounds: { minX: number; minY: number; maxX: number; maxY: number },
  regions: readonly RegionShape[],
): PaperLine[] {
  const x0 = bounds.minX - PAPER_MARGIN;
  const y0 = bounds.minY - PAPER_MARGIN;
  const width = bounds.maxX - bounds.minX + 2 * PAPER_MARGIN;
  const height = bounds.maxY - bounds.minY + 2 * PAPER_MARGIN;
  const span = Math.max(width, height);
  const hills: ContourHill[] = regions.map((r) => ({
    x: (r.cx - x0) / width,
    y: (r.cy - y0) / height,
    r: (r.r * 0.75) / span,
    height: 0.9,
  }));
  const result = contours({ width, height, seed: "map-paper", levels: 14, cell: CELL, hills });
  return result.levels.map((level) => ({
    // Shift the lines from the picture's corner into map coordinates.
    d: segmentsToPath(shift(level.segments, x0, y0)),
    major: level.major,
  }));
}

function shift(segments: Float32Array, dx: number, dy: number): Float32Array {
  const out = new Float32Array(segments.length);
  for (let i = 0; i < segments.length; i += 2) {
    out[i] = segments[i]! + dx;
    out[i + 1] = segments[i + 1]! + dy;
  }
  return out;
}
