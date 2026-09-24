// Explain it back without Claude (F13 offline self-check): the owner writes an explanation (at
// least 40 words), then ticks the points they covered. The points are the concept's interview
// bullets, or, until those are written, the parts of its scope. Score = ticked / total.

import type { Concept, ConceptContent } from "@/lib/types";

export const MIN_EXPLAIN_WORDS = 40;

export function wordCount(text: string): number {
  const words = text.trim().match(/[\p{L}\p{N}][\p{L}\p{N}'’_-]*/gu);
  return words ? words.length : 0;
}

/** Strips the Markdown that would look odd in a checklist (emphasis, code ticks, links). */
export function plainText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\$([^$]+)\$/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/** Splits a scope line at top-level commas and semicolons (not inside brackets or code). */
export function scopeParts(scope: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let inCode = false;
  let current = "";
  for (const ch of scope) {
    if (ch === "`") inCode = !inCode;
    else if (!inCode && (ch === "(" || ch === "[")) depth++;
    else if (!inCode && (ch === ")" || ch === "]")) depth = Math.max(0, depth - 1);
    if (!inCode && depth === 0 && (ch === "," || ch === ";")) {
      parts.push(current);
      current = "";
    } else current += ch;
  }
  parts.push(current);
  return parts.map((p) => plainText(p)).filter((p) => p.length > 0);
}

export interface SelfCheckItem {
  id: string;
  text: string;
}

export function selfCheckItems(concept: Concept, content: ConceptContent): SelfCheckItem[] {
  const bullets = content.interview;
  const texts = bullets.length > 0 ? bullets.map(plainText) : scopeParts(concept.scope);
  const list = texts.length > 0 ? texts : [concept.name];
  return list.slice(0, 10).map((text, i) => ({ id: String(i), text }));
}

export function selfCheckScore(ticked: number, total: number): number {
  return total > 0 ? Math.min(1, Math.max(0, ticked / total)) : 0;
}
