// Concept text (the Learn tab's levels, interview questions, pattern signals and templates) is
// generated per subject into src/data/content/<subject>.generated.json by build-syllabus and
// loaded on demand, so the startup bundle carries only the syllabus structure. A concept's
// `written` flags say what exists without loading anything. Loaded subjects stay cached.
import type { Concept, ConceptContent, ConceptId, SubjectId } from "@/lib/types";

export type SubjectContent = Readonly<Record<ConceptId, ConceptContent>>;

const files = import.meta.glob<SubjectContent>("./content/*.generated.json", {
  import: "default",
});

export const EMPTY_CONTENT: ConceptContent = Object.freeze({
  simple: "",
  interview: [],
  questions: [],
}) as ConceptContent;

const loaded = new Map<SubjectId, SubjectContent>();
const pending = new Map<SubjectId, Promise<SubjectContent>>();

/** Loads one subject's text (once; a failed load can be tried again). */
export function loadSubjectContent(subjectId: SubjectId): Promise<SubjectContent> {
  const done = loaded.get(subjectId);
  if (done) return Promise.resolve(done);
  const running = pending.get(subjectId);
  if (running) return running;
  const load = files[`./content/${subjectId}.generated.json`];
  const promise = (load ? load() : Promise.resolve({}))
    .then((file) => {
      loaded.set(subjectId, file);
      return file;
    })
    .finally(() => pending.delete(subjectId));
  pending.set(subjectId, promise);
  return promise;
}

/** A subject's text if it is already loaded. */
export function loadedSubjectContent(subjectId: SubjectId): SubjectContent | undefined {
  return loaded.get(subjectId);
}

/**
 * A concept's text if it is available now: its entry once the subject is loaded, or the empty
 * content for a concept with nothing written (the owner's own concepts too). Undefined means
 * "load the subject first".
 */
export function conceptContentNow(concept: Concept): ConceptContent | undefined {
  if (!concept.written.any) return EMPTY_CONTENT;
  const file = loaded.get(concept.subjectId);
  return file ? (file[concept.id] ?? EMPTY_CONTENT) : undefined;
}

/** A concept's text, loading its subject if needed. */
export async function loadConceptContent(concept: Concept): Promise<ConceptContent> {
  const now = conceptContentNow(concept);
  if (now) return now;
  const file = await loadSubjectContent(concept.subjectId);
  return file[concept.id] ?? EMPTY_CONTENT;
}

/** Every subject's text (for search, which indexes each concept's simple level). */
export function loadAllContent(subjectIds: readonly SubjectId[]): Promise<SubjectContent[]> {
  return Promise.all(subjectIds.map(loadSubjectContent));
}
