// CSV import (F6): columns title, url, difficulty, date, result, minutes, notes (all optional
// except a title or a url). Rows are matched to the seed banks by LeetCode slug or number; the
// rest can become the owner's own problems. Each row becomes an attempt without code.
// Pure parsing and planning here; the problem store applies the plan.
import type { AttemptResult, Difficulty, ProblemState } from "@/lib/types";
import { leetCodeSlug, slugFromLeetCodeUrl, type ProblemInfo } from "./catalog";
import { findProblemMatches, parseProblemInput, titleFromSlug } from "./quickAdd";

/** RFC 4180 CSV: quoted fields, doubled quotes, commas and newlines inside quotes. The delimiter
 *  (comma, semicolon or tab) is taken from the header line. Blank lines are skipped. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const firstLine = src.split(/\r?\n/, 1)[0] ?? "";
  const counts = [",", ";", "\t"].map((d) => [d, firstLine.split(d).length - 1] as const);
  const delimiter = counts.reduce((best, c) => (c[1] > best[1] ? c : best))[0];
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const ch = src[i]!;
    if (quoted) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
      continue;
    }
    if (ch === '"' && field === "") quoted = true;
    else if (ch === delimiter) {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((f) => f.trim() !== "")) rows.push(row);
      row = [];
    } else field += ch;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== "")) rows.push(row);
  return rows.map((r) => r.map((f) => f.trim()));
}

export type CsvColumn = "title" | "url" | "difficulty" | "date" | "result" | "minutes" | "notes";

const HEADER_WORDS: Record<CsvColumn, string[]> = {
  title: ["title", "name", "problem", "problem name", "question"],
  url: ["url", "link", "leetcode", "leetcode url", "problem url"],
  difficulty: ["difficulty", "level", "diff"],
  date: ["date", "solved on", "attempted", "attempted on", "day", "when", "solved"],
  result: ["result", "status", "outcome", "verdict"],
  minutes: ["minutes", "time", "duration", "time taken", "mins", "min"],
  notes: ["notes", "note", "comments", "comment", "remarks"],
};

/** Which column holds what, from the header row (case and spacing don't matter). */
export function mapColumns(header: string[]): Partial<Record<CsvColumn, number>> {
  const out: Partial<Record<CsvColumn, number>> = {};
  const clean = header.map((h) =>
    h
      .toLowerCase()
      .replace(/[_\s]+/g, " ")
      .trim(),
  );
  for (const col of Object.keys(HEADER_WORDS) as CsvColumn[]) {
    const idx = clean.findIndex(
      (h, i) => HEADER_WORDS[col].includes(h) && !Object.values(out).includes(i),
    );
    if (idx >= 0) out[col] = idx;
  }
  return out;
}

const pad = (n: number) => String(n).padStart(2, "0");
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

function validDate(y: number, m: number, d: number): string | null {
  if (y < 100) y += 2000;
  const date = new Date(y, m - 1, d);
  if (date.getFullYear() !== y || date.getMonth() !== m - 1 || date.getDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/**
 * A date as local yyyy-mm-dd. Accepts 2026-09-24, 2026/09/24, 24/09/2026 (day first, unless
 * `monthFirst` or the day can't be a month), 24-09-2026, 24 Sep 2026, Sep 24, 2026 and ISO times.
 */
export function parseCsvDate(value: string, monthFirst = false): string | null {
  const v = value.trim();
  if (!v) return null;
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ].*)?$/.exec(v);
  if (m) {
    if (/T.*(Z|[+-]\d\d:?\d\d)$/.test(v)) {
      const t = new Date(v);
      if (!Number.isNaN(t.getTime()))
        return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}`;
    }
    return validDate(Number(m[1]), Number(m[2]), Number(m[3]));
  }
  m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(v);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    const y = Number(m[3]);
    const dayFirst = a > 12 ? true : b > 12 ? false : !monthFirst;
    return dayFirst ? validDate(y, b, a) : validDate(y, a, b);
  }
  m = /^(\d{1,2})\s+([a-z]{3,})\.?,?\s+(\d{2,4})$/i.exec(v);
  if (m) {
    const month = MONTHS.indexOf(m[2]!.slice(0, 3).toLowerCase());
    return month >= 0 ? validDate(Number(m[3]), month + 1, Number(m[1])) : null;
  }
  m = /^([a-z]{3,})\.?\s+(\d{1,2}),?\s+(\d{2,4})$/i.exec(v);
  if (m) {
    const month = MONTHS.indexOf(m[1]!.slice(0, 3).toLowerCase());
    return month >= 0 ? validDate(Number(m[3]), month + 1, Number(m[2])) : null;
  }
  return null;
}

/** Free-text results from other trackers ("Solved", "with hints", "saw editorial", "TLE", "✓"). */
export function parseCsvResult(value: string): AttemptResult | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  if (
    /(not|un|n't)\s*-?\s*solved|fail|^no$|^n$|^x$|^✗$|^wa$|^tle$|^mle$|wrong|stuck|gave up|incomplete/.test(
      v,
    )
  )
    return "not_solved";
  if (/saw|solution|editorial|looked|watched|copied|video/.test(v)) return "saw_solution";
  if (/hint|help|partial|assisted/.test(v)) return "solved_with_hints";
  if (
    /solved|alone|^yes$|^y$|^ac$|accepted|^done$|^pass|^✓$|^✔$|own|myself|^ok$|^true$|^1$/.test(v)
  )
    return "solved_alone";
  return null;
}

export function parseCsvDifficulty(value: string): Difficulty | null {
  const v = value.trim().toLowerCase();
  if (/^(e|easy|1)$/.test(v)) return "easy";
  if (/^(m|med|medium|2)$/.test(v)) return "medium";
  if (/^(h|hard|3)$/.test(v)) return "hard";
  return null;
}

/** "45", "45 min", "1h 20m", "1:20" (hours:minutes), "1.5h" → minutes. */
export function parseCsvMinutes(value: string): number | null {
  const v = value.trim().toLowerCase();
  if (!v) return null;
  let m = /^(\d+):(\d{1,2})$/.exec(v);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  m = /^(?:(\d+(?:\.\d+)?)\s*h(?:ours?|rs?)?)?\s*(?:(\d+)\s*m(?:in(?:ute)?s?)?)?$/.exec(v);
  if (m && (m[1] || m[2])) return Math.round(Number(m[1] ?? 0) * 60 + Number(m[2] ?? 0));
  m = /^(\d+(?:\.\d+)?)$/.exec(v);
  if (m) return Math.round(Number(m[1]));
  return null;
}

export interface CsvImportOptions {
  /** Treat 03/04/2026 as March 4 instead of 3 April. */
  monthFirst: boolean;
  /** Result to record when a row doesn't say. */
  defaultResult: Extract<AttemptResult, "solved_alone" | "solved_with_hints">;
  /** Add rows that match nothing as the owner's own problems. */
  addUnmatched: boolean;
}

export interface CsvRowPlan {
  /** 1-based line number in the file (the header is line 1). */
  line: number;
  title: string;
  url?: string;
  status: "matched" | "new" | "skipped";
  /** Why a row is skipped, or a note about how it was read. */
  note?: string;
  match?: ProblemInfo;
  /** For new problems: the key that groups rows for the same problem. */
  newKey?: string;
  difficulty: Difficulty;
  date: string | null;
  result: AttemptResult;
  resultGiven: boolean;
  minutes: number | null;
  notes: string;
}

export interface CsvPlan {
  rows: CsvRowPlan[];
  missingColumns: boolean;
  matched: number;
  added: number;
  skipped: number;
}

export function planCsvImport(
  text: string,
  states: Readonly<Record<string, ProblemState>>,
  options: CsvImportOptions,
): CsvPlan {
  const table = parseCsv(text);
  const header = table[0] ?? [];
  const cols = mapColumns(header);
  const missingColumns = cols.title === undefined && cols.url === undefined;
  const get = (row: string[], c: CsvColumn) => (cols[c] !== undefined ? (row[cols[c]!] ?? "") : "");
  const rows: CsvRowPlan[] = [];
  if (!missingColumns) {
    table.slice(1).forEach((row, i) => {
      const line = i + 2;
      const rawTitle = get(row, "title");
      const rawUrl = get(row, "url");
      const url = rawUrl ? (/^https?:/i.test(rawUrl) ? rawUrl : `https://${rawUrl}`) : undefined;
      const slug = url ? slugFromLeetCodeUrl(url) : undefined;
      const title = rawTitle || (slug ? titleFromSlug(slug) : "");
      const resultRaw = get(row, "result");
      const parsedResult = parseCsvResult(resultRaw);
      const plan: CsvRowPlan = {
        line,
        title,
        url,
        status: "skipped",
        difficulty: parseCsvDifficulty(get(row, "difficulty")) ?? "medium",
        date: parseCsvDate(get(row, "date"), options.monthFirst),
        result: parsedResult ?? options.defaultResult,
        resultGiven: parsedResult !== null,
        minutes: parseCsvMinutes(get(row, "minutes")),
        notes: get(row, "notes"),
      };
      if (!title && !url) {
        plan.note = "No title or link";
        rows.push(plan);
        return;
      }
      let match: ProblemInfo | undefined;
      if (url) match = findProblemMatches(parseProblemInput(url), states).exact;
      if (!match && rawTitle) {
        const n = /^(?:lc\s*)?(\d{1,5})[.)\s]/i.exec(rawTitle);
        if (n) match = findProblemMatches({ kind: "number", number: Number(n[1]) }, states).exact;
        match ??= findProblemMatches(parseProblemInput(rawTitle), states).exact;
      }
      if (match) {
        plan.status = "matched";
        plan.match = match;
        plan.difficulty = match.difficulty;
      } else if (options.addUnmatched) {
        plan.status = "new";
        plan.newKey = slug ?? leetCodeSlug(title);
      } else {
        plan.note = "No match";
      }
      if (resultRaw && !parsedResult) plan.note = `Result "${resultRaw}" not recognised`;
      if (get(row, "date") && !plan.date) plan.note = `Date "${get(row, "date")}" not recognised`;
      rows.push(plan);
    });
  }
  return {
    rows,
    missingColumns,
    matched: rows.filter((r) => r.status === "matched").length,
    added: new Set(rows.filter((r) => r.status === "new").map((r) => r.newKey)).size,
    skipped: rows.filter((r) => r.status === "skipped").length,
  };
}

/** A stable id per imported row, so importing the same file twice doesn't duplicate attempts. */
export function csvAttemptId(problemId: string, row: CsvRowPlan): string {
  // Without a date, identical rows can't be told apart, so the line number keeps them separate.
  const key = `${problemId}|${row.date ?? `line ${row.line}`}|${row.result}|${row.minutes ?? ""}|${row.notes}`;
  let h = 5381;
  for (let i = 0; i < key.length; i++) h = ((h << 5) + h + key.charCodeAt(i)) >>> 0;
  return `csv-${h.toString(36)}`;
}
