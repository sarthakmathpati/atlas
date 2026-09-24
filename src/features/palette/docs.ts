// Search documents for the command palette, built from the bundled syllabus and seed banks.
import { problemHref, routeHref } from "@/app/router";
import { conceptContentNow } from "@/data/content";
import { SEED_PROBLEMS } from "@/data/seed";
import { conceptById, concepts, subjectById, subjects, topicById, topics } from "@/data/syllabus";
import { SearchIndex, type SearchDoc } from "@/lib/search/searchIndex";
import type { Concept, MistakeTag, ProblemState } from "@/lib/types";

const DIFFICULTY = { easy: "Easy", medium: "Medium", hard: "Hard" } as const;
const IMPORTANCE_BOOST = { must: 1.3, important: 1.1, advanced: 1 } as const;

/**
 * The document for a seed concept. Its simple level is added once the subject's text has loaded
 * (see conceptContentDocs); until then the concept is found by name and scope.
 */
function conceptDoc(c: Concept, simple = ""): SearchDoc {
  const topic = topicById.get(c.topicId);
  return {
    id: `concept:${c.id}`,
    kind: "concept",
    title: c.name,
    subtitle: `${topic?.name ?? ""}${c.isPattern ? ", pattern" : ""}`,
    text: [c.scope, simple].filter(Boolean).join(" "),
    keywords: `${subjectById.get(c.subjectId)?.shortName ?? ""} ${c.isPattern ? "pattern" : ""}`,
    // A search jump flies the map to the concept and opens it (F2).
    href: routeHref("/map", undefined, { focus: c.id }),
    boost: IMPORTANCE_BOOST[c.importance],
  };
}

/** Seed concepts with written text, with their simple level (call once the text is loaded). */
export function conceptContentDocs(): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const c of concepts) {
    if (!c.written.any) continue;
    const simple = conceptContentNow(c)?.simple;
    if (simple) docs.push(conceptDoc(c, simple));
  }
  return docs;
}

export function buildSeedDocs(): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const s of subjects) {
    docs.push({
      id: `subject:${s.id}`,
      kind: "subject",
      title: s.name,
      subtitle: `${topics.filter((t) => t.subjectId === s.id).length} topics`,
      text: s.description,
      keywords: `${s.id} ${s.shortName}`,
      href: routeHref("/map", undefined, { subject: s.id }),
      boost: 1.3,
    });
  }
  for (const t of topics) {
    docs.push({
      id: `topic:${t.id}`,
      kind: "topic",
      title: t.name,
      subtitle: subjectById.get(t.subjectId)?.shortName,
      keywords: t.id,
      href: routeHref("/map", undefined, { topic: t.id }),
      boost: 1.15,
    });
  }
  for (const c of concepts) docs.push(conceptDoc(c));
  for (const p of SEED_PROBLEMS) {
    const patterns = p.conceptIds
      .map((id) => conceptById.get(id)?.name)
      .filter(Boolean)
      .join(", ");
    if (p.source === "leetcode") {
      docs.push({
        id: `problem:${p.id}`,
        kind: "problem",
        title: p.number ? `${p.number}. ${p.title}` : p.title,
        subtitle: `${DIFFICULTY[p.difficulty]}${patterns ? `, ${patterns}` : ""}`,
        keywords: `lc leetcode ${p.slug ?? ""} ${p.language === "sql" ? "sql database" : ""}`,
        num: p.number ? String(p.number) : undefined,
        text: patterns,
        href: problemHref(p.id),
      });
    } else if (p.source === "quant") {
      docs.push({
        id: `puzzle:${p.id}`,
        kind: "puzzle",
        title: p.title,
        subtitle: `${DIFFICULTY[p.difficulty]} puzzle`,
        keywords: "quant puzzle brainteaser",
        text: patterns,
        href: problemHref(p.id),
      });
    } else {
      docs.push({
        id: `design:${p.id}`,
        kind: "design",
        title: p.title,
        subtitle: p.source === "design-lld" ? "Low-level design" : "System design",
        keywords: p.source === "design-lld" ? "lld machine coding" : "hld system design",
        href: routeHref("/designs", p.id),
      });
    }
  }
  return docs;
}

export function mistakeTagDocs(tags: MistakeTag[]): SearchDoc[] {
  return tags
    .filter((t) => !t.archived)
    .map((t) => ({
      id: `mistake:${t.id}`,
      kind: "mistake" as const,
      title: t.label,
      subtitle: "Mistake tag",
      text: t.description,
      href: routeHref("/mistakes", undefined, { tag: t.id }),
    }));
}

/** The owner's own problems (kept in ProblemState.custom). */
export function customProblemDocs(states: Readonly<Record<string, ProblemState>>): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const s of Object.values(states)) {
    if (!s.custom) continue;
    const patterns = s.custom.conceptIds
      .map((id) => conceptById.get(id)?.name)
      .filter(Boolean)
      .join(", ");
    docs.push({
      id: `problem:${s.problemId}`,
      kind: "problem",
      title: s.custom.title,
      subtitle: `${DIFFICULTY[s.custom.difficulty]}, added by you${patterns ? `, ${patterns}` : ""}`,
      keywords: "custom mine my own",
      text: patterns,
      href: problemHref(s.problemId),
    });
  }
  return docs;
}

/** The owner's own concepts (F2 "Add your own concept"). */
export function customConceptDocs(list: readonly Concept[]): SearchDoc[] {
  return list.map((c) => ({
    id: `concept:${c.id}`,
    kind: "concept" as const,
    title: c.name,
    subtitle: `${topicById.get(c.topicId)?.name ?? ""}, yours`,
    text: c.scope,
    keywords: "custom mine my own",
    href: routeHref("/map", undefined, { focus: c.id }),
    boost: IMPORTANCE_BOOST[c.importance],
  }));
}

let index: SearchIndex | null = null;

/** The palette's index, built on first use (and ahead of time when the browser is idle). */
export function getSearchIndex(): SearchIndex {
  index ??= new SearchIndex(buildSeedDocs());
  return index;
}
