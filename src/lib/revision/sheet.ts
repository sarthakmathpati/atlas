// Revision sheets (F19), built fully offline from the owner's own data. A sheet is a list of
// Markdown sections (one source for the screen, printing, and the Markdown and HTML exports).
//
//   1-day sheet (about two printed pages): the pre-interview mistake checklist (F8), insights from
//     starred and tricky problems, interview bullets for fading and weak must-know concepts, and
//     key formulas for the Quant and Both tracks.
//   1-week sheet, grouped by subject with a page break before each: interview bullets for every
//     learning and fading must-know concept, every pattern with its signals and template, the
//     insights of all solved problems grouped by pattern, and the mistake checklist.
//   Custom: chosen subjects, topics or patterns.
import { patternConcepts, subjectById, topicById } from "@/data/syllabus";
import type { TagCount } from "@/lib/mistakes/stats";
import { problemInfo, problemLabel, type ProblemInfo } from "@/lib/problems/catalog";
import type { ConceptEval, ReadinessModel } from "@/lib/readiness/model";
import { isTricky } from "@/lib/srs/problem";
import { parseLocalDate } from "@/lib/time";
import type { Concept, ConceptContent, ProblemState, Track } from "@/lib/types";

export type SheetScope = "day" | "week" | "custom";

export interface SheetChoice {
  scope: SheetScope;
  /** Custom sheets: subject, topic and pattern ids. */
  subjects?: readonly string[];
  topics?: readonly string[];
  patterns?: readonly string[];
}

export interface SheetSection {
  id: string;
  /** Printing starts this section on a new page (a new subject in the 1-week sheet). */
  newPage: boolean;
  markdown: string;
}

export interface RevisionSheet {
  choice: SheetChoice;
  title: string;
  /** "Sunday 27 September 2026". */
  dateLabel: string;
  sections: SheetSection[];
  /** Words in the whole sheet, code included (for "Tighten with Claude"). */
  words: number;
  /** What the sheet holds, for the empty state and the header. */
  counts: {
    mistakes: number;
    insights: number;
    concepts: number;
    patterns: number;
    formulas: number;
  };
}

export interface SheetSources {
  today: string;
  track: Track;
  model: ReadinessModel;
  problemStates: Readonly<Record<string, ProblemState>>;
  /** The pre-interview checklist (checklistTags, F8). */
  checklist: readonly TagCount[];
  /** A concept's text once its subject is loaded (undefined until then). */
  contentOf: (concept: Concept) => ConceptContent | undefined;
}

export const DAY_LIMITS = { insights: 10, concepts: 6, bullets: 3, formulas: 10 } as const;
const QUANT_SUBJECTS = ["prob", "math", "markets"];

// ----- small helpers ---------------------------------------------------------------------------

/** Text for a Markdown list item or heading: no line breaks, no stray heading marks. */
function inline(text: string): string {
  return text.replace(/\s*\n\s*/g, " ").trim();
}

const STATUS_WORD = {
  not_started: "not started",
  learning: "learning",
  strong: "strong",
  fading: "fading",
};

function statusWord(e: ConceptEval): string {
  return STATUS_WORD[e.status];
}

export function countWords(markdown: string): number {
  return (markdown.match(/[\p{L}\p{N}][\p{L}\p{N}'’.+#-]*/gu) ?? []).length;
}

/** Subjects needed for a sheet's concept text (to load them first). */
export function subjectsNeeded(choice: SheetChoice, model: ReadinessModel): string[] {
  const ids = new Set<string>();
  for (const e of model.byId.values()) {
    if (choice.scope === "custom") {
      if (inCustom(e.concept, choice)) ids.add(e.concept.subjectId);
    } else if (e.status !== "not_started" || (choice.scope === "week" && e.concept.isPattern))
      ids.add(e.concept.subjectId);
  }
  return [...ids];
}

function inCustom(c: Concept, choice: SheetChoice): boolean {
  return Boolean(
    choice.subjects?.includes(c.subjectId) ||
    choice.topics?.includes(c.topicId) ||
    choice.patterns?.includes(c.id),
  );
}

function subjectOrder(id: string): number {
  return subjectById.get(id)?.order ?? 999;
}

function conceptOrder(a: Concept, b: Concept): number {
  return (
    subjectOrder(a.subjectId) - subjectOrder(b.subjectId) ||
    (topicById.get(a.topicId)?.order ?? 0) - (topicById.get(b.topicId)?.order ?? 0) ||
    a.order - b.order
  );
}

// ----- blocks ------------------------------------------------------------------------------------

function checklistMarkdown(list: readonly TagCount[], heading: string): string {
  if (list.length === 0)
    return `${heading}\n\nNo mistakes tagged yet. Tag them when you save an attempt, and your checklist builds itself.`;
  const lines = list.map((c) => {
    const avoid = c.tag.howToAvoid?.trim();
    const times = c.count ? ` (${c.count} ${c.count === 1 ? "time" : "times"})` : "";
    return `- [ ] **${inline(c.tag.label)}**${times}${avoid ? `: ${inline(avoid)}` : ""}`;
  });
  return `${heading}\n\n${lines.join("\n")}`;
}

function conceptBlock(e: ConceptEval, content: ConceptContent | undefined, limit?: number): string {
  const bullets = (content?.interview ?? []).slice(0, limit ?? Infinity);
  const head = `#### ${inline(e.concept.name)} (${statusWord(e)})`;
  if (bullets.length === 0) return `${head}\n\n${inline(e.concept.scope)}`;
  return `${head}\n\n${bullets.map((b) => `- ${inline(b)}`).join("\n")}`;
}

function patternBlock(c: Concept, content: ConceptContent | undefined): string {
  const parts = [`#### ${inline(c.name)}`];
  const signals = content?.signals ?? [];
  if (signals.length) parts.push(`Signals:\n\n${signals.map((s) => `- ${inline(s)}`).join("\n")}`);
  const template = content?.template?.trim();
  if (template) parts.push(template);
  if (!signals.length && !template) parts.push(inline(c.scope));
  return parts.join("\n\n");
}

interface Insight {
  info: ProblemInfo;
  state: ProblemState;
  text: string;
}

function insightLine(i: Insight, tags: string[] = []): string {
  const extra = [i.info.difficulty, ...tags].join(", ");
  return `- **${inline(problemLabel(i.info))}** (${extra}): ${inline(i.text)}`;
}

function solvedInsights(src: SheetSources): Insight[] {
  const out: Insight[] = [];
  for (const state of Object.values(src.problemStates)) {
    const text = state.insight?.trim();
    const info = problemInfo(state.problemId, state);
    if (!info || !text) continue;
    out.push({ info, state, text });
  }
  return out.sort((a, b) => a.info.order - b.info.order);
}

/** A formula line from a concept's interview points: the first bullet with math and "=". */
function formulaOf(content: ConceptContent | undefined): string | undefined {
  return content?.interview.find((b) => /\$[^$]*=/.test(b) || /\$\$/.test(b));
}

// ----- the sheets --------------------------------------------------------------------------------

function daySheet(src: SheetSources): {
  sections: SheetSection[];
  counts: RevisionSheet["counts"];
} {
  const sections: SheetSection[] = [];
  const counts = {
    mistakes: src.checklist.length,
    insights: 0,
    concepts: 0,
    patterns: 0,
    formulas: 0,
  };
  sections.push({
    id: "mistakes",
    newPage: false,
    markdown: checklistMarkdown(src.checklist, "## Before you walk in: your mistake checklist"),
  });

  const flagged = solvedInsights(src).filter((i) => i.state.starred || isTricky(i.state.srs));
  flagged.sort(
    (a, b) =>
      Number(isTricky(b.state.srs)) - Number(isTricky(a.state.srs)) ||
      b.state.srs.lapses - a.state.srs.lapses ||
      a.info.order - b.info.order,
  );
  const shown = flagged.slice(0, DAY_LIMITS.insights);
  counts.insights = shown.length;
  const withoutInsight = Object.values(src.problemStates).filter(
    (s) => (s.starred || isTricky(s.srs)) && !s.insight?.trim(),
  ).length;
  const insightLines = shown.map((i) =>
    insightLine(i, [
      ...(isTricky(i.state.srs) ? [`slipped ${i.state.srs.lapses} times`] : []),
      ...(i.state.starred ? ["starred"] : []),
    ]),
  );
  sections.push({
    id: "insights",
    newPage: false,
    markdown: [
      "## Insights from starred and tricky problems",
      insightLines.length
        ? insightLines.join("\n")
        : "No starred or tricky problems with an insight yet. Star the problems you want here, and write a one-line insight when you solve them.",
      withoutInsight
        ? `_${withoutInsight} more starred or tricky ${withoutInsight === 1 ? "problem has" : "problems have"} no insight written yet._`
        : "",
    ]
      .filter(Boolean)
      .join("\n\n"),
  });

  const weak = [...src.model.byId.values()]
    .filter(
      (e) => e.concept.importance === "must" && (e.status === "fading" || e.status === "learning"),
    )
    .sort(
      (a, b) =>
        Number(b.status === "fading") - Number(a.status === "fading") ||
        a.score - b.score ||
        conceptOrder(a.concept, b.concept),
    )
    .slice(0, DAY_LIMITS.concepts);
  counts.concepts = weak.length;
  sections.push({
    id: "weak",
    newPage: false,
    markdown: [
      "## Fading and weak must-know concepts",
      weak.length
        ? weak
            .map((e) => conceptBlock(e, src.contentOf(e.concept), DAY_LIMITS.bullets))
            .join("\n\n")
        : "Nothing is fading, and every must-know concept you've started is strong.",
    ].join("\n\n"),
  });

  if (src.track !== "sde") {
    const formulas: string[] = [];
    const quant = [...src.model.byId.values()]
      .filter(
        (e) =>
          QUANT_SUBJECTS.includes(e.concept.subjectId) &&
          e.concept.importance === "must" &&
          e.status !== "not_started",
      )
      .sort((a, b) => a.score - b.score || conceptOrder(a.concept, b.concept));
    for (const e of quant) {
      const f = formulaOf(src.contentOf(e.concept));
      if (!f) continue;
      formulas.push(
        `- **${inline(e.concept.name)}**: ${inline(f.replace(/^\*\*[^*]+\*\*:?\s*/, ""))}`,
      );
      if (formulas.length >= DAY_LIMITS.formulas) break;
    }
    counts.formulas = formulas.length;
    sections.push({
      id: "formulas",
      newPage: false,
      markdown: [
        "## Key formulas",
        formulas.length
          ? formulas.join("\n")
          : "Formulas from the probability, math and markets concepts you've started show up here.",
      ].join("\n\n"),
    });
  }
  return { sections, counts };
}

function subjectSections(
  src: SheetSources,
  pick: {
    concepts: (e: ConceptEval) => boolean;
    patterns: (c: Concept) => boolean;
    insights: (conceptIds: readonly string[]) => boolean;
    conceptHeading: string;
  },
): { sections: SheetSection[]; counts: Omit<RevisionSheet["counts"], "mistakes" | "formulas"> } {
  const counts = { insights: 0, concepts: 0, patterns: 0 };
  const insights = solvedInsights(src).filter(
    (i) => i.state.status === "solved" && pick.insights(i.info.conceptIds),
  );
  const bySubject = new Map<string, string[]>();
  const add = (subjectId: string, block: string) => {
    const list = bySubject.get(subjectId) ?? [];
    list.push(block);
    bySubject.set(subjectId, list);
  };

  const evals = [...src.model.byId.values()].sort((a, b) => conceptOrder(a.concept, b.concept));
  const conceptsBySubject = new Map<string, ConceptEval[]>();
  for (const e of evals) {
    if (!pick.concepts(e)) continue;
    const list = conceptsBySubject.get(e.concept.subjectId) ?? [];
    list.push(e);
    conceptsBySubject.set(e.concept.subjectId, list);
  }
  for (const [subjectId, list] of conceptsBySubject) {
    counts.concepts += list.length;
    add(
      subjectId,
      [
        `### ${pick.conceptHeading}`,
        ...list.map((e) => conceptBlock(e, src.contentOf(e.concept))),
      ].join("\n\n"),
    );
  }

  const patterns = patternConcepts.filter((c) => src.model.byId.has(c.id) && pick.patterns(c));
  if (patterns.length) {
    counts.patterns = patterns.length;
    add(
      "dsa",
      [
        "### Patterns: signals and templates",
        ...patterns.map((c) => patternBlock(c, src.contentOf(c))),
      ].join("\n\n"),
    );
  }

  // Insights grouped by pattern (a problem's first pattern), under that pattern's subject.
  const groups = new Map<string, Insight[]>();
  for (const i of insights) {
    const key = i.info.conceptIds[0] ?? "other";
    const list = groups.get(key) ?? [];
    list.push(i);
    groups.set(key, list);
  }
  const insightBlocks = new Map<string, string[]>();
  for (const [conceptId, list] of groups) {
    const c = src.model.byId.get(conceptId)?.concept;
    const subjectId = c?.subjectId ?? "dsa";
    counts.insights += list.length;
    const blocks = insightBlocks.get(subjectId) ?? [];
    blocks.push(
      `#### ${inline(c?.name ?? "Other problems")}\n\n${list.map((i) => insightLine(i)).join("\n")}`,
    );
    insightBlocks.set(subjectId, blocks);
  }
  for (const [subjectId, blocks] of insightBlocks)
    add(subjectId, ["### Insights from solved problems, by pattern", ...blocks].join("\n\n"));

  const ordered = [...bySubject.keys()].sort((a, b) => subjectOrder(a) - subjectOrder(b));
  return {
    sections: ordered.map((subjectId) => ({
      id: `subject-${subjectId}`,
      newPage: true,
      markdown: [
        `## ${subjectById.get(subjectId)?.name ?? subjectId}`,
        ...bySubject.get(subjectId)!,
      ].join("\n\n"),
    })),
    counts,
  };
}

export function buildSheet(choice: SheetChoice, src: SheetSources): RevisionSheet {
  const dateLabel = parseLocalDate(src.today).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  let sections: SheetSection[];
  let counts: RevisionSheet["counts"];
  let title: string;
  if (choice.scope === "day") {
    ({ sections, counts } = daySheet(src));
    title = "1-day revision sheet";
  } else {
    const week = choice.scope === "week";
    const conceptIds = new Set<string>();
    if (!week)
      for (const e of src.model.byId.values())
        if (inCustom(e.concept, choice)) conceptIds.add(e.concept.id);
    const built = subjectSections(src, {
      concepts: week
        ? (e) =>
            e.concept.importance === "must" &&
            (e.status === "learning" || e.status === "fading") &&
            !e.concept.isPattern
        : (e) =>
            conceptIds.has(e.concept.id) &&
            !e.concept.isPattern &&
            (e.concept.importance !== "advanced" || e.status !== "not_started"),
      patterns: week ? () => true : (c) => conceptIds.has(c.id),
      insights: week ? () => true : (ids) => ids.some((id) => conceptIds.has(id)),
      conceptHeading: week ? "Must-know concepts to revise" : "Concepts",
    });
    const checklist = {
      id: "mistakes",
      newPage: false,
      markdown: checklistMarkdown(src.checklist, "## Your mistake checklist"),
    };
    sections = week
      ? [checklist, ...built.sections]
      : [...built.sections, { ...checklist, newPage: built.sections.length > 0 }];
    if (sections[0]) sections[0] = { ...sections[0], newPage: false };
    counts = { ...built.counts, mistakes: src.checklist.length, formulas: 0 };
    title = week ? "1-week revision sheet" : "Custom revision sheet";
  }
  const markdown = sections.map((s) => s.markdown).join("\n\n");
  return { choice, title, dateLabel, sections, words: countWords(markdown), counts };
}

/** The whole sheet as one Markdown document, with a title line. */
export function sheetMarkdown(
  sheet: Pick<RevisionSheet, "title" | "dateLabel" | "sections">,
  note?: string,
): string {
  return [
    `# ${sheet.title}`,
    `_${sheet.dateLabel}${note ? `. ${note}` : ""}_`,
    ...sheet.sections.map((s) => s.markdown),
  ].join("\n\n");
}

/** About half the words, rounded to 50 (at least 150): the target for "Tighten with Claude". */
export function tightenTarget(words: number): number {
  return Math.max(150, Math.round(words / 2 / 50) * 50);
}

export function sheetFilename(
  sheet: RevisionSheet,
  today: string,
  ext: "md" | "html",
  tightened = false,
): string {
  const kind =
    sheet.choice.scope === "day" ? "1-day" : sheet.choice.scope === "week" ? "1-week" : "custom";
  return `atlas-revision-${kind}${tightened ? "-tightened" : ""}-${today}.${ext}`;
}

const encoder = new TextEncoder();

/**
 * What "Tighten with Claude" sends: the sheet's Markdown, whole sections in order until the byte
 * budget is reached (Claude reads at most about 48 KiB with its instructions). Sections left out
 * stay as they are in the original, and the page says so.
 */
export function tightenInput(
  sheet: Pick<RevisionSheet, "title" | "dateLabel" | "sections">,
  budgetBytes: number,
): { markdown: string; included: number; left: string[]; words: number } {
  const head = `# ${sheet.title}\n\n_${sheet.dateLabel}_`;
  let bytes = encoder.encode(head).length;
  const parts = [head];
  let included = 0;
  for (const s of sheet.sections) {
    const size = encoder.encode(s.markdown).length + 2;
    if (bytes + size > budgetBytes && included > 0) break;
    parts.push(s.markdown);
    bytes += size;
    included++;
  }
  const left = sheet.sections
    .slice(included)
    .map((s) => /^##\s+(.+)$/m.exec(s.markdown)?.[1] ?? s.id);
  const markdown = parts.join("\n\n");
  return { markdown, included, left, words: countWords(markdown) };
}

/** Claude's tightened sheet without its leading "# title" and date lines (the page shows them). */
export function withoutTitle(markdown: string): string {
  return markdown.replace(/^\s*# [^\n]*\n+(?:_[^\n]*_\s*\n+)?/, "");
}
