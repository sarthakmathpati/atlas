// Reads the stores and builds the context blocks Claude sees (BUILD_SPEC.md 10.3): the learner
// (track, language, interview countdown, strong concepts nearest the topic at hand, frequent
// mistakes), the concept (with its written text), the problem (with the owner's summary and
// notes, unless a re-solve hides them), and the owner's code. The pure formatting and the 48 KiB
// fitting live in lib/ai/context.ts.
import { CODE_LANGUAGE_LABEL, normalizeLanguage } from "@/components/ui/code/languages";
import { STATUS_LABEL } from "@/components/ui/labels";
import { loadConceptContent } from "@/data/content";
import { dependentsOf, subjectById, topicById } from "@/data/syllabus";
import type { ChatTurn } from "@/lib/ai/AIProvider";
import {
  byteLength,
  codeBlock,
  conceptBlock,
  fitToBudget,
  joinBlocks,
  learnerBlock,
  notesBlock,
  PROMPT_BUDGET_BYTES,
  problemBlock,
  type ContextBlock,
  MAX_CODE_CHARS,
  MAX_NOTES_CHARS,
} from "@/lib/ai/context";
import type { PromptEnv, PromptSpec } from "@/lib/ai/prompts";
import { isCustomConceptId } from "@/lib/concepts/custom";
import { checklistTags, taggedAttempts } from "@/lib/mistakes/stats";
import { problemInfo, type ProblemInfo } from "@/lib/problems/catalog";
import { daysBetween, localDate } from "@/lib/time";
import type { Concept, PrimaryLanguage } from "@/lib/types";
import { useConceptNoteStore } from "@/stores/conceptNoteStore";
import { useConceptStateStore } from "@/stores/conceptStateStore";
import { findConcept } from "@/stores/customConceptStore";
import { useMistakeTagStore } from "@/stores/mistakeTagStore";
import { useProblemStore } from "@/stores/problemStore";
import { useProfileStore } from "@/stores/profileStore";

const LANGUAGE: Record<PrimaryLanguage, { label: string; fence: string }> = {
  cpp: { label: "C++", fence: "cpp" },
  java: { label: "Java", fence: "java" },
  python: { label: "Python", fence: "python" },
};

/** The learner's main language for code Claude writes or reviews (C++ by default). */
export function promptEnv(): PromptEnv {
  const lang = useProfileStore.getState().profile?.primaryLanguage ?? "cpp";
  const { label, fence } = LANGUAGE[lang] ?? LANGUAGE.cpp;
  return { language: label, fence };
}

const FENCE: Record<string, string> = {
  cpp: "cpp",
  java: "java",
  python: "python",
  javascript: "javascript",
  typescript: "typescript",
  sql: "sql",
  text: "",
};

/** Strong concepts, most related to `near` first: its neighbors, its topic, its subject. */
function strongConceptNames(near?: Concept): string[] {
  const { states } = useConceptStateStore.getState();
  const neighbors = new Set<string>();
  if (near) {
    for (const id of near.prereqs) neighbors.add(id);
    for (const id of dependentsOf.get(near.id) ?? []) neighbors.add(id);
    for (const link of near.related) neighbors.add(link.to);
  }
  const scored: { name: string; score: number; importance: number }[] = [];
  for (const s of Object.values(states)) {
    if (s.status !== "strong" || s.hidden) continue;
    const c = findConcept(s.conceptId);
    if (!c) continue;
    const score = !near
      ? 0
      : neighbors.has(c.id)
        ? 3
        : c.topicId === near.topicId
          ? 2
          : c.subjectId === near.subjectId
            ? 1
            : 0;
    const importance = c.importance === "must" ? 2 : c.importance === "important" ? 1 : 0;
    scored.push({ name: c.name, score, importance });
  }
  scored.sort(
    (a, b) => b.score - a.score || b.importance - a.importance || a.name.localeCompare(b.name),
  );
  return scored.slice(0, 15).map((s) => s.name);
}

function frequentMistakes(): string[] {
  const states = useProblemStore.getState().states;
  const tags = Object.values(useMistakeTagStore.getState().tags);
  return checklistTags(taggedAttempts(states), tags, localDate())
    .filter((c) => c.count > 0)
    .map((c) => c.tag.label);
}

export function learnerContext(near?: Concept): ContextBlock {
  const profile = useProfileStore.getState().profile;
  const today = localDate();
  return {
    kind: "learner",
    text: learnerBlock({
      track: profile?.track ?? "both",
      language: promptEnv().language,
      daysToInterview: profile?.interviewDate ? daysBetween(today, profile.interviewDate) : null,
      strongConcepts: strongConceptNames(near),
      frequentMistakes: frequentMistakes(),
    }),
  };
}

/** The concept, its written text (loaded if needed) and the owner's notes on it. */
export async function conceptContext(conceptId: string): Promise<ContextBlock[]> {
  const concept = findConcept(conceptId);
  if (!concept) return [];
  const content = await loadConceptContent(concept).catch(() => undefined);
  const note = useConceptNoteStore.getState().notes[conceptId];
  const generated = note?.generated;
  const status = useConceptStateStore.getState().states[conceptId]?.status ?? "not_started";
  const blocks: ContextBlock[] = [
    {
      kind: "concept",
      text: conceptBlock({
        name: concept.name,
        subjectName: subjectById.get(concept.subjectId)?.name ?? concept.subjectId,
        topicName: topicById.get(concept.topicId)?.name ?? concept.topicId,
        importance: concept.importance,
        status: STATUS_LABEL[status],
        scope: concept.scope,
        simple: content?.simple || generated?.simple,
        interview: content?.interview.length ? content.interview : generated?.interview,
        signals: content?.signals,
        own: isCustomConceptId(concept.id),
      }),
    },
  ];
  const notes = note?.markdown.trim();
  if (notes) {
    blocks.push({
      kind: "notes",
      text: notesBlock("Learner's notes on this concept", notes),
      shrink: (max) => notesBlock("Learner's notes on this concept", notes, max),
    });
  }
  return blocks;
}

export function problemContextLabel(info: ProblemInfo): string {
  if (info.source === "leetcode" && info.number) return `LC ${info.number} ${info.title}`;
  return info.title;
}

/** The problem, and (unless a re-solve hides them) the owner's insight and notes. */
export function problemContext(
  problemId: string,
  opts: { hideOwnWork?: boolean } = {},
): ContextBlock[] {
  const state = useProblemStore.getState().states[problemId];
  const info = problemInfo(problemId, state);
  if (!info) return [];
  const patterns = info.conceptIds.map((id) => findConcept(id)?.name ?? id);
  const blocks: ContextBlock[] = [
    {
      kind: "problem",
      text: problemBlock({
        label: problemContextLabel(info),
        difficulty: info.difficulty,
        patterns,
        // Original prompts only: quant puzzles, design prompts and the owner's own text.
        prompt: info.prompt,
        summary: state?.summary,
        insight: opts.hideOwnWork ? undefined : state?.insight,
      }),
    },
  ];
  const notes = opts.hideOwnWork ? "" : (state?.myNotes?.trim() ?? "");
  if (notes) {
    blocks.push({
      kind: "notes",
      text: notesBlock("Learner's own notes", notes, MAX_NOTES_CHARS),
      shrink: (max) => notesBlock("Learner's own notes", notes, max),
    });
  }
  return blocks;
}

export function codeContext(language: string, code: string): ContextBlock | null {
  if (!code.trim()) return null;
  const lang = normalizeLanguage(language);
  const label = CODE_LANGUAGE_LABEL[lang] ?? language;
  const fence = FENCE[lang] ?? "";
  return {
    kind: "code",
    text: codeBlock(label, fence, code, MAX_CODE_CHARS),
    shrink: (max) => codeBlock(label, fence, code, max),
  };
}

export interface ContextRequest {
  conceptId?: string;
  problemId?: string;
  code?: { language: string; code: string };
  hideOwnWork?: boolean;
  /** Leave out the learner block (grading prompts that need no personal context). */
  noLearner?: boolean;
}

export async function gatherContext(request: ContextRequest): Promise<ContextBlock[]> {
  const concept = request.conceptId ? findConcept(request.conceptId) : undefined;
  const problem = request.problemId
    ? problemInfo(request.problemId, useProblemStore.getState().states[request.problemId])
    : undefined;
  const near = concept ?? (problem?.conceptIds[0] ? findConcept(problem.conceptIds[0]) : undefined);
  const blocks: ContextBlock[] = [];
  if (!request.noLearner) blocks.push(learnerContext(near));
  if (request.conceptId) blocks.push(...(await conceptContext(request.conceptId)));
  if (request.problemId)
    blocks.push(...problemContext(request.problemId, { hideOwnWork: request.hideOwnWork }));
  if (request.code) {
    const code = codeContext(request.code.language, request.code.code);
    if (code) blocks.push(code);
  }
  return blocks;
}

function inputBytes(input: string | ChatTurn[]): number {
  return typeof input === "string"
    ? byteLength(input)
    : input.reduce((n, t) => n + byteLength(t.content), 0);
}

/**
 * Builds a prompt from context blocks, trimming the context (never the instructions or the
 * request) when the whole would pass the 48 KiB budget. `trimmed` says something was left out.
 */
export function fitPrompt<T>(
  blocks: ContextBlock[],
  make: (context: string) => PromptSpec<T>,
  budget = PROMPT_BUDGET_BYTES,
): { spec: PromptSpec<T>; trimmed: boolean } {
  const full = make(joinBlocks(blocks));
  if (byteLength(full.instructions) + inputBytes(full.input) <= budget)
    return { spec: full, trimmed: false };
  const bare = make("");
  const fit = fitToBudget(
    {
      instructions: bare.instructions,
      ask: typeof bare.input === "string" ? bare.input : "",
      blocks,
      turns: typeof bare.input === "string" ? undefined : bare.input,
    },
    budget,
  );
  const spec = make(fit.context);
  if (fit.turns && typeof spec.input !== "string") spec.input = fit.turns;
  return { spec, trimmed: fit.trimmed };
}
