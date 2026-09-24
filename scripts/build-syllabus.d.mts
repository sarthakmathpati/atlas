// Types for scripts/build-syllabus.mjs (used by tests).
import type { Syllabus } from "../src/lib/types";

export class BuildError extends Error {}
export const SYLLABUS_FORMAT_VERSION: number;
export interface SubjectContentReport {
  concepts: number;
  core: number;
  must: number;
  mustDeep: number;
  patterns: number;
  patternExtras: number;
}
export interface BuildResult {
  syllabus: Syllabus;
  warnings: string[];
  report: { perSubject: Map<string, SubjectContentReport>; problems: string[] };
}
export function buildSyllabus(options?: { strict?: boolean; contentDir?: string }): BuildResult;
export function findCycle(ids: string[], prereqsOf: (id: string) => string[]): string[] | null;
