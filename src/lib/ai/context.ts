// The context builder (BUILD_SPEC.md 10.3). Every block is plain text under a "## Heading", and a
// whole prompt stays under 48 KiB (headroom under the 64 KiB `sample` limit). When it's too long,
// trim in this order: older chat turns, then long notes, then code (keeping its start and end),
// then the concept text; never the instructions or the request itself.
//
// Pure functions over plain data: features/ai/gather.ts reads the stores and calls these.
import type { ChatTurn } from "./AIProvider";

export const PROMPT_BUDGET_BYTES = 48 * 1024;
export const MAX_STRONG_CONCEPTS = 15;
export const MAX_MISTAKES = 5;
export const MAX_NOTES_CHARS = 1500;
export const MAX_CODE_CHARS = 12_000;

const encoder = new TextEncoder();
export const byteLength = (text: string): number => encoder.encode(text).length;

/** Cuts text to `max` characters at a word boundary, marking the cut. */
export function clip(text: string, max: number): string {
  const t = text.trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()} …`;
}

/** Keeps the start and the end of long code, with a marker saying how much was left out. */
export function clipMiddle(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = Math.ceil(max * 0.6);
  const tail = Math.max(0, max - head);
  const start = text.slice(0, head);
  const end = tail ? text.slice(text.length - tail) : "";
  const removed = text.length - head - tail;
  return `${start}\n… (${removed} characters left out) …\n${end}`;
}

// ----- blocks ----------------------------------------------------------------------------------

export interface LearnerInfo {
  track: "sde" | "quant" | "both";
  /** "C++" */
  language: string;
  daysToInterview?: number | null;
  /** Names, most related first. */
  strongConcepts: string[];
  /** Labels, most frequent first. */
  frequentMistakes: string[];
}

const TRACK_LABEL = { sde: "SDE", quant: "Quant", both: "SDE and Quant" } as const;

export function learnerBlock(l: LearnerInfo): string {
  const first = [`Track: ${TRACK_LABEL[l.track]}`, `Primary language: ${l.language}`];
  if (l.daysToInterview !== undefined && l.daysToInterview !== null) {
    first.push(
      l.daysToInterview > 0
        ? `Interview in ${l.daysToInterview} ${l.daysToInterview === 1 ? "day" : "days"}`
        : "Interview is today or has passed",
    );
  }
  const strong = l.strongConcepts.slice(0, MAX_STRONG_CONCEPTS);
  const mistakes = l.frequentMistakes.slice(0, MAX_MISTAKES);
  return [
    "## Learner",
    first.join(" | "),
    `Strong concepts (use these for analogies): ${strong.length ? strong.join(", ") : "none yet"}`,
    `Frequent mistakes: ${mistakes.length ? mistakes.join(", ") : "none recorded yet"}`,
  ].join("\n");
}

export interface ConceptInfo {
  name: string;
  subjectName: string;
  topicName: string;
  importance: "must" | "important" | "advanced";
  status: string;
  scope: string;
  simple?: string;
  interview?: string[];
  signals?: string[];
  /** The owner's own concept (not in the syllabus). */
  own?: boolean;
}

const IMPORTANCE_WORD = { must: "must", important: "important", advanced: "advanced" } as const;

export function conceptBlock(c: ConceptInfo): string {
  const lines = [
    "## Concept",
    `Name: ${c.name} (${c.subjectName} › ${c.topicName}) | Importance: ${IMPORTANCE_WORD[c.importance]} | Status: ${c.status}${c.own ? " | Added by the learner" : ""}`,
  ];
  if (c.scope.trim()) lines.push(`Scope: ${clip(c.scope, 400)}`);
  if (c.simple?.trim()) lines.push(`Simple: ${clip(c.simple, 800)}`);
  if (c.interview?.length) {
    lines.push("Interview points:");
    for (const point of c.interview.slice(0, 8)) lines.push(`- ${clip(point, 300)}`);
  }
  if (c.signals?.length) lines.push(`Signals: ${c.signals.slice(0, 6).join("; ")}`);
  return lines.join("\n");
}

export interface ProblemContextInfo {
  /** "LC 743 Network Delay Time" or a puzzle title. */
  label: string;
  difficulty: string;
  patterns: string[];
  /** Original prompts only (quant puzzles, design prompts, the owner's own text). */
  prompt?: string;
  summary?: string;
  insight?: string;
}

export function problemBlock(p: ProblemContextInfo): string {
  const lines = [
    "## Problem",
    `${p.label} (${p.difficulty})${p.patterns.length ? ` | Patterns: ${p.patterns.join(", ")}` : ""}`,
  ];
  if (p.prompt?.trim()) lines.push(`Prompt: ${clip(p.prompt, 2500)}`);
  if (p.summary?.trim()) lines.push(`Learner's summary: ${clip(p.summary, 600)}`);
  if (p.insight?.trim()) lines.push(`Learner's insight: ${clip(p.insight, 200)}`);
  return lines.join("\n");
}

export function notesBlock(title: string, notes: string, max = MAX_NOTES_CHARS): string {
  return `## ${title}\n${clip(notes, max)}`;
}

export function codeBlock(
  languageLabel: string,
  fence: string,
  code: string,
  max = MAX_CODE_CHARS,
) {
  return `## Learner's code (${languageLabel})\n\`\`\`${fence}\n${clipMiddle(code.trimEnd(), max)}\n\`\`\``;
}

// ----- fitting a prompt into the budget --------------------------------------------------------

export type BlockKind = "learner" | "concept" | "problem" | "notes" | "code" | "other";

export interface ContextBlock {
  kind: BlockKind;
  text: string;
  /** How to rebuild the block smaller (for code and notes): given a character limit. */
  shrink?: (maxChars: number) => string;
}

export interface FitInput {
  instructions: string;
  blocks: ContextBlock[];
  /** The request itself (never trimmed). */
  ask?: string;
  /** Chat turns, oldest first, ending on the new user turn. */
  turns?: ChatTurn[];
}

export interface FitResult {
  context: string;
  turns?: ChatTurn[];
  /** Something was left out to fit. */
  trimmed: boolean;
  bytes: number;
}

/** The blocks as one text, in order, separated by blank lines. */
export function joinBlocks(blocks: readonly ContextBlock[]): string {
  return blocks
    .map((b) => b.text.trim())
    .filter(Boolean)
    .join("\n\n");
}

function measure(input: FitInput, blocks: ContextBlock[], turns?: ChatTurn[]): number {
  return (
    byteLength(input.instructions) +
    byteLength(joinBlocks(blocks)) +
    byteLength(input.ask ?? "") +
    (turns ?? []).reduce((n, t) => n + byteLength(t.content), 0) +
    16
  );
}

export function fitToBudget(input: FitInput, budget = PROMPT_BUDGET_BYTES): FitResult {
  let blocks = [...input.blocks];
  let turns = input.turns ? [...input.turns] : undefined;
  let trimmed = false;
  const over = () => measure(input, blocks, turns) > budget;

  // 1. Older chat turns (keep at least the newest exchange and the new message).
  while (over() && turns && turns.length > 1) {
    turns = turns.slice(turns.length > 3 ? 2 : 1);
    trimmed = true;
  }
  // 2. Long notes, 3. code (start and end kept), 4. other context, each in shrinking steps.
  for (const kinds of [["notes"], ["code"], ["concept", "problem", "other"]] as BlockKind[][]) {
    for (const limit of [4000, 2000, 800, 300]) {
      if (!over()) break;
      blocks = blocks.map((b) => {
        if (!kinds.includes(b.kind) || b.text.length <= limit) return b;
        trimmed = true;
        return { ...b, text: b.shrink ? b.shrink(limit) : clip(b.text, limit) };
      });
    }
  }
  return { context: joinBlocks(blocks), turns, trimmed, bytes: measure(input, blocks, turns) };
}

/** The one-shot input: the context blocks, then the request. */
export function composeInput(context: string, ask: string): string {
  return context.trim() ? `${context.trim()}\n\n${ask.trim()}` : ask.trim();
}
