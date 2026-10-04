// Reading support (F32, part 8): a concept level one part at a time ("Next part"), each part
// followed by one quick check from the concept's questions (self-rated like a flashcard and
// recorded as a check), and "Read aloud" with the browser's own voice.
//
// Parts: Simple is one part; Interview's points come in groups of up to three; a Deep article is
// split at its `####` sub-headings (decision 3), and a long stretch without a heading is split at
// paragraph breaks into parts of about 250 words. Code blocks and tables are never cut.
import type { QA } from "@/lib/types";

export type ReadingLevel = "simple" | "interview" | "deep";

export interface ReadingPart {
  /** A sub-heading the part starts with (Deep articles), without the #s. */
  title?: string;
  /** Markdown. */
  markdown: string;
}

/** About this many words to a part when there is no heading to split at. */
export const PART_WORDS = 250;
/** A part longer than this is split further at paragraph breaks. */
export const LONG_PART_WORDS = 450;
export const POINTS_PER_PART = 3;

export function wordCount(markdown: string): number {
  return markdown.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

/** Markdown blocks: paragraphs, lists, tables and whole fenced code blocks, in order. */
export function markdownBlocks(markdown: string): string[] {
  const lines = markdown.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];
  let fence: string | null = null;
  const flush = () => {
    if (current.some((l) => l.trim())) blocks.push(current.join("\n").trim());
    current = [];
  };
  for (const line of lines) {
    const opener = /^\s*(`{3,}|~{3,})/.exec(line);
    if (fence) {
      current.push(line);
      if (opener && opener[1]!.startsWith(fence[0]!) && opener[1]!.length >= fence.length) {
        fence = null;
        flush();
      }
      continue;
    }
    if (opener) {
      flush();
      fence = opener[1]!;
      current.push(line);
      continue;
    }
    if (line.trim() === "") {
      flush();
      continue;
    }
    if (/^#{1,6}\s/.test(line)) {
      flush();
      blocks.push(line.trim());
      continue;
    }
    current.push(line);
  }
  flush();
  return blocks;
}

function chunkBlocks(blocks: readonly string[]): string[][] {
  const chunks: string[][] = [];
  let chunk: string[] = [];
  let words = 0;
  for (const block of blocks) {
    const w = wordCount(block);
    if (chunk.length > 0 && words + w > PART_WORDS) {
      chunks.push(chunk);
      chunk = [];
      words = 0;
    }
    chunk.push(block);
    words += w;
  }
  if (chunk.length) chunks.push(chunk);
  return chunks;
}

/** A Deep article's parts: one per `####` section (long ones split), the intro first. */
export function deepParts(markdown: string): ReadingPart[] {
  const sections: { title?: string; blocks: string[] }[] = [{ blocks: [] }];
  for (const block of markdownBlocks(markdown)) {
    const heading = /^#{2,6}\s+(.+)$/.exec(block);
    if (heading) sections.push({ title: heading[1]!.trim(), blocks: [] });
    else sections[sections.length - 1]!.blocks.push(block);
  }
  const parts: ReadingPart[] = [];
  for (const section of sections) {
    if (section.blocks.length === 0 && !section.title) continue;
    const total = wordCount(section.blocks.join("\n\n"));
    const chunks =
      total > LONG_PART_WORDS || (!section.title && total > PART_WORDS)
        ? chunkBlocks(section.blocks)
        : [section.blocks];
    chunks.forEach((chunk, i) => {
      parts.push({
        title: i === 0 ? section.title : undefined,
        markdown: chunk.join("\n\n"),
      });
    });
  }
  return parts.length ? parts : [{ markdown: markdown.trim() }];
}

/** Interview points in groups of up to three, as even as possible (larger groups first). */
export function interviewParts(points: readonly string[]): ReadingPart[] {
  if (points.length === 0) return [];
  const count = Math.ceil(points.length / POINTS_PER_PART);
  const parts: ReadingPart[] = [];
  let at = 0;
  for (let i = 0; i < count; i++) {
    const size = Math.ceil((points.length - at) / (count - i));
    parts.push({
      markdown: points
        .slice(at, at + size)
        .map((p) => `- ${p}`)
        .join("\n"),
    });
    at += size;
  }
  return parts;
}

export function levelParts(
  level: ReadingLevel,
  content: { simple: string; interview: readonly string[]; deep?: string },
): ReadingPart[] {
  if (level === "simple") return content.simple.trim() ? [{ markdown: content.simple }] : [];
  if (level === "interview") return interviewParts(content.interview);
  return content.deep ? deepParts(content.deep) : [];
}

/** The question that follows part `index` of a level (a different one per level and part). */
export function partQuestion(
  questions: readonly QA[],
  level: ReadingLevel,
  index: number,
): QA | undefined {
  if (questions.length === 0) return undefined;
  const base = level === "simple" ? 0 : level === "interview" ? 1 : 2;
  return questions[(base + index) % questions.length];
}

/** Markdown as plain sentences for reading aloud: code and tables are named, not read out. */
export function speechText(markdown: string): string {
  const out: string[] = [];
  for (const block of markdownBlocks(markdown)) {
    if (/^\s*(`{3,}|~{3,})/.test(block)) {
      out.push("There is a code example here.");
      continue;
    }
    if (/^\s*\|.*\|\s*$/m.test(block) && /^\s*\|?\s*:?-{3,}/m.test(block)) {
      out.push("There is a table here.");
      continue;
    }
    // Each list item is a sentence of its own; other lines of a paragraph run on.
    const sentences: string[] = [];
    for (const line of block.split("\n")) {
      const item = /^\s*(?:[-*+]|\d+[.)])\s+/.test(line);
      const clean = plainLine(line);
      if (!clean) continue;
      if (item || sentences.length === 0) sentences.push(clean);
      else sentences[sentences.length - 1] += ` ${clean}`;
    }
    for (const s of sentences) out.push(/[.!?:]$/.test(s) ? s : `${s}.`);
  }
  return out.join(" ");
}

function plainLine(line: string): string {
  return line
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, "")
    .replace(/^>\s?/, "")
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\$\$?([^$]+)\$\$?/g, (_, math: string) =>
      math
        .replace(/\\(?:left|right|,|;|!|quad)/g, " ")
        .replace(/\\([a-zA-Z]+)/g, " $1 ")
        .replace(/[{}^_\\]/g, " "),
    )
    .replace(/`([^`]*)`/g, "$1")
    .replace(/(\*\*|__|\*|_|~~)(?=\S)([^*_~]*\S)\1/g, "$2")
    .replace(/\s+/g, " ")
    .trim();
}
