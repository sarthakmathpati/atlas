// Types for scripts/build-syllabus.mjs (used by tests).
import type { Concept, ConceptContent, Syllabus, WrittenContent } from "../src/lib/types";

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
/** A concept as the build produces it: with its text, before the text is split off. */
export type BuiltConcept = Omit<Concept, "written"> & { content: ConceptContent };
export type BuiltSyllabus = Omit<Syllabus, "concepts"> & { concepts: BuiltConcept[] };
export interface BuildResult {
  syllabus: BuiltSyllabus;
  warnings: string[];
  report: { perSubject: Map<string, SubjectContentReport>; problems: string[] };
}
export function buildSyllabus(options?: { strict?: boolean; contentDir?: string }): BuildResult;
/** Ids of the quant puzzles in src/data/quant.seed.ts, which content may link to. */
export function quantPuzzleIds(path?: string): Set<string>;
export function writtenFlags(content: ConceptContent): WrittenContent;
export function splitSyllabus(syllabus: BuiltSyllabus): {
  core: Syllabus;
  contentBySubject: Record<string, Record<string, ConceptContent>>;
};
export function findCycle(ids: string[], prereqsOf: (id: string) => string[]): string[] | null;
