// Turns two versions of code into rows for a side-by-side diff (F7 attempt comparison), with
// word-level marks inside changed lines. Pure functions, unit-tested.
import { diffLines, diffWordsWithSpace } from "diff";
import type { Token } from "./highlight";

export interface DiffSide {
  /** 1-based line number in that version. */
  n: number;
  text: string;
  /** Character ranges [start, end) that changed within the line. */
  marks: [number, number][];
}

export type DiffRow =
  | { kind: "same"; left: DiffSide; right: DiffSide }
  | { kind: "change"; left: DiffSide; right: DiffSide }
  | { kind: "del"; left: DiffSide; right: null }
  | { kind: "add"; left: null; right: DiffSide }
  | { kind: "gap"; hidden: number; from: number };

function splitLines(value: string): string[] {
  const lines = value.split("\n");
  if (lines[lines.length - 1] === "") lines.pop();
  return lines;
}

function wordMarks(a: string, b: string): { left: [number, number][]; right: [number, number][] } {
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  let i = 0;
  let j = 0;
  for (const part of diffWordsWithSpace(a, b)) {
    const len = part.value.length;
    if (part.removed) {
      left.push([i, i + len]);
      i += len;
    } else if (part.added) {
      right.push([j, j + len]);
      j += len;
    } else {
      i += len;
      j += len;
    }
  }
  return { left, right };
}

/** All rows of a side-by-side diff, without folding. */
export function diffRows(before: string, after: string): DiffRow[] {
  const rows: DiffRow[] = [];
  let ln = 1;
  let rn = 1;
  const changes = diffLines(before.replace(/\r\n?/g, "\n"), after.replace(/\r\n?/g, "\n"));
  for (let k = 0; k < changes.length; k++) {
    const change = changes[k]!;
    const lines = splitLines(change.value);
    if (!change.added && !change.removed) {
      for (const text of lines) {
        rows.push({
          kind: "same",
          left: { n: ln++, text, marks: [] },
          right: { n: rn++, text, marks: [] },
        });
      }
      continue;
    }
    if (change.removed) {
      const next = changes[k + 1];
      const added = next?.added ? splitLines(next.value) : [];
      if (next?.added) k++;
      const paired = Math.min(lines.length, added.length);
      for (let i = 0; i < Math.max(lines.length, added.length); i++) {
        const l = lines[i];
        const r = added[i];
        if (i < paired && l !== undefined && r !== undefined) {
          const marks = wordMarks(l, r);
          rows.push({
            kind: "change",
            left: { n: ln++, text: l, marks: marks.left },
            right: { n: rn++, text: r, marks: marks.right },
          });
        } else if (l !== undefined) {
          rows.push({ kind: "del", left: { n: ln++, text: l, marks: [] }, right: null });
        } else if (r !== undefined) {
          rows.push({ kind: "add", left: null, right: { n: rn++, text: r, marks: [] } });
        }
      }
      continue;
    }
    for (const text of lines) {
      rows.push({ kind: "add", left: null, right: { n: rn++, text, marks: [] } });
    }
  }
  return rows;
}

/** Folds long runs of unchanged lines, keeping `context` lines around each change. */
export function foldRows(rows: DiffRow[], context = 3, minFold = 4): DiffRow[] {
  const out: DiffRow[] = [];
  let i = 0;
  while (i < rows.length) {
    if (rows[i]!.kind !== "same") {
      out.push(rows[i]!);
      i++;
      continue;
    }
    let j = i;
    while (j < rows.length && rows[j]!.kind === "same") j++;
    const run = rows.slice(i, j);
    const head = i === 0 ? 0 : context;
    const tail = j === rows.length ? 0 : context;
    if (run.length - head - tail >= minFold) {
      out.push(...run.slice(0, head));
      out.push({ kind: "gap", hidden: run.length - head - tail, from: i + head });
      out.push(...run.slice(run.length - tail));
    } else {
      out.push(...run);
    }
    i = j;
  }
  return out;
}

export interface MarkedToken extends Token {
  marked: boolean;
}

/** Splits highlighted tokens at mark boundaries so changed words can be emphasized. */
export function applyMarks(tokens: Token[], marks: [number, number][]): MarkedToken[] {
  if (marks.length === 0) return tokens.map((t) => ({ ...t, marked: false }));
  const out: MarkedToken[] = [];
  let pos = 0;
  for (const token of tokens) {
    const start = pos;
    const end = pos + token.text.length;
    const cuts = new Set<number>([start, end]);
    for (const [a, b] of marks) {
      if (a > start && a < end) cuts.add(a);
      if (b > start && b < end) cuts.add(b);
    }
    const points = [...cuts].sort((x, y) => x - y);
    for (let k = 0; k < points.length - 1; k++) {
      const a = points[k]!;
      const b = points[k + 1]!;
      if (b <= a) continue;
      const marked = marks.some(([ms, me]) => a >= ms && b <= me);
      out.push({
        text: token.text.slice(a - start, b - start),
        className: token.className,
        marked,
      });
    }
    pos = end;
  }
  return out;
}
