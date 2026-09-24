// Search documents for the command palette, built from the bundled syllabus and seed banks.
import { conceptHref, problemHref, routeHref } from "@/app/router";
import { SEED_PROBLEMS } from "@/data/seed";
import { conceptById, concepts, subjectById, subjects, topicById, topics } from "@/data/syllabus";
import { SearchIndex, type SearchDoc } from "@/lib/search/searchIndex";
import type { MistakeTag } from "@/lib/types";

const DIFFICULTY = { easy: "Easy", medium: "Medium", hard: "Hard" } as const;

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
    });
  }
  for (const c of concepts) {
    const topic = topicById.get(c.topicId);
    docs.push({
      id: `concept:${c.id}`,
      kind: "concept",
      title: c.name,
      subtitle: `${topic?.name ?? ""}${c.isPattern ? ", pattern" : ""}`,
      text: [c.scope, c.content.simple].filter(Boolean).join(" "),
      keywords: `${subjectById.get(c.subjectId)?.shortName ?? ""} ${c.isPattern ? "pattern" : ""}`,
      href: conceptHref(c.id),
    });
  }
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

let index: SearchIndex | null = null;

/** The palette's index, built on first use (and ahead of time when the browser is idle). */
export function getSearchIndex(): SearchIndex {
  index ??= new SearchIndex(buildSeedDocs());
  return index;
}
