// Search documents for the command palette, built from the bundled syllabus and seed banks.
import { problemHref, routeHref } from "@/app/router";
import { conceptContentNow } from "@/data/content";
import { SEED_PROBLEMS } from "@/data/seed";
import { conceptById, concepts, subjectById, subjects, topicById, topics } from "@/data/syllabus";
import { SearchIndex, type SearchDoc } from "@/lib/search/searchIndex";
import { problemInfo, problemLabel } from "@/lib/problems/catalog";
import { isIntro, UNSORTED_STORY_ID } from "@/lib/stories/stories";
import type { Concept, ConceptNote, MistakeTag, ProblemState, Story } from "@/lib/types";

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

/** Plain words of a note: Markdown marks and code fences don't help a search. */
const plain = (text: string) =>
  text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#*_`>[\]()|-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** The first words of a note, for the second line of a result. */
const gist = (text: string) => {
  const p = plain(text);
  return p.length > 70 ? `${p.slice(0, 69)}…` : p;
};

/**
 * The owner's notes (F23): concept notes with their saved answers, and a problem's summary,
 * insight and notes. A concept note opens on the concept's Notes tab; a problem's on its page.
 */
export function noteDocs(
  notes: Readonly<Record<string, ConceptNote>>,
  states: Readonly<Record<string, ProblemState>>,
  findConcept: (id: string) => Pick<Concept, "name"> | undefined,
): SearchDoc[] {
  const docs: SearchDoc[] = [];
  for (const n of Object.values(notes)) {
    const answers = n.savedAnswers.map((a) => `${a.question} ${a.answer}`).join(" ");
    const text = plain(`${n.markdown} ${answers}`);
    if (!text) continue;
    const name = findConcept(n.conceptId)?.name ?? n.conceptId;
    docs.push({
      id: `note:concept:${n.conceptId}`,
      kind: "note",
      title: `Notes on ${name}`,
      subtitle: gist(n.markdown) || "Saved answers",
      text,
      keywords: "note notes mine",
      href: routeHref("/concept", n.conceptId, { tab: "notes" }),
    });
  }
  for (const s of Object.values(states)) {
    const text = plain([s.summary, s.insight, s.myNotes].filter(Boolean).join(" "));
    if (!text) continue;
    const info = problemInfo(s.problemId, s);
    if (!info) continue;
    docs.push({
      id: `note:problem:${s.problemId}`,
      kind: "note",
      title: `Notes on ${problemLabel(info)}`,
      subtitle: gist(s.insight ?? s.summary ?? s.myNotes ?? ""),
      text,
      keywords: "note notes insight summary mine",
      href: problemHref(s.problemId),
    });
  }
  return docs;
}

/** The owner's stories (F23, F27): title and STAR text; "Tell me about yourself" too. */
export function storyDocs(stories: Readonly<Record<string, Story>>): SearchDoc[] {
  return Object.values(stories)
    .filter((s) => s.id !== UNSORTED_STORY_ID)
    .map((s) => ({
      id: `story:${s.id}`,
      kind: "story" as const,
      title: s.title || (isIntro(s) ? "Tell me about yourself" : "Untitled story"),
      subtitle: isIntro(s) ? "Your intro" : s.tags.length ? s.tags.join(", ") : "Story",
      text: [s.situation, s.task, s.action, s.result].join(" "),
      keywords: `story behavioral star ${s.tags.join(" ")}`,
      href: isIntro(s)
        ? routeHref("/stories", undefined, { tab: "intro" })
        : routeHref("/stories", undefined, { story: s.id }),
    }));
}

let index: SearchIndex | null = null;

/** The palette's index, built on first use (and ahead of time when the browser is idle). */
export function getSearchIndex(): SearchIndex {
  index ??= new SearchIndex(buildSeedDocs());
  return index;
}
