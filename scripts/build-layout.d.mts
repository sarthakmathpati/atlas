// Types for scripts/build-layout.mjs (used by tests).
import type { MapLayout, Syllabus } from "../src/lib/types";

export const LAYOUT_VERSION: number;
export const BUBBLE_RADIUS: { must: number; important: number; advanced: number };
export function structureHash(syllabus: Syllabus): string;
export function buildLayout(syllabus: Syllabus): MapLayout;
