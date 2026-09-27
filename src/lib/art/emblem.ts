// Subject emblems (BUILD_SPEC.md 12.10.7): a small contour picture per subject, the same every
// time, so each subject has a face to recognize: three hills from a seed of the subject id,
// seven levels, a 2 px cell. Drawn once at 64 px and scaled, so the shape is the same at any size.
import { hashSeed, mulberry32 } from "@/lib/random";
import { contours, segmentsToPath, type ContourHill } from "./contours";

export const EMBLEM_SIZE = 64;

export function emblemHills(subjectId: string): ContourHill[] {
  const rand = mulberry32(hashSeed(`emblem:${subjectId}`));
  return [0, 1, 2].map(() => ({
    x: 0.28 + rand() * 0.44,
    y: 0.28 + rand() * 0.44,
    r: 0.035 + rand() * 0.05,
    height: 0.6 + rand() * 0.6,
  }));
}

export interface EmblemLine {
  d: string;
  major: boolean;
}

const cache = new Map<string, EmblemLine[]>();

/** The emblem's contour lines as SVG paths in a 64 by 64 box (memoized per subject). */
export function emblemLines(subjectId: string): EmblemLine[] {
  const hit = cache.get(subjectId);
  if (hit) return hit;
  const result = contours({
    width: EMBLEM_SIZE,
    height: EMBLEM_SIZE,
    seed: hashSeed(subjectId),
    levels: 7,
    cell: 2,
    hills: emblemHills(subjectId),
  });
  const lines = result.levels.map((l) => ({ d: segmentsToPath(l.segments), major: l.major }));
  cache.set(subjectId, lines);
  return lines;
}
