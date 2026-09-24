// Types for scripts/lib/spec.mjs (used by tests).
export type SpecImportance = "must" | "important" | "advanced";
export interface SpecConcept {
  id: string;
  name: string;
  scope: string;
  importance: SpecImportance;
  tracks: ("sde" | "quant")[] | null;
  isPattern: boolean;
  order: number;
}
export interface SpecTopic {
  id: string;
  name: string;
  order: number;
  prereqs: string[];
  concepts: SpecConcept[];
}
export interface SpecSubject {
  id: string;
  name: string;
  order: number;
  tracks: ("sde" | "quant")[];
  icon: string;
  topics: SpecTopic[];
}
export interface ConceptRef {
  topicId: string;
  name: string;
}
export interface SpecConnection {
  from: ConceptRef;
  to: ConceptRef;
  reason: string;
}
export function slugify(text: string): string;
export function parseConceptBullet(line: string): Omit<SpecConcept, "id" | "order"> | null;
export function parseSpecSyllabus(spec: string): SpecSubject[];
export function parseConceptRef(ref: string): ConceptRef;
export function parseSpecConnections(spec: string): SpecConnection[];
export function parseConnectionTable(text: string): SpecConnection[];
