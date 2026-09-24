// Export, import and merge (F22). Works with any Repository through its EntityStores.
//
// Export: everything except secrets, as { app, schemaVersion, exportedAt, data }, with records
// sorted by key so the same data always produces the same file.
// Import: parse → check it is an Atlas backup → run migrations → apply id aliases → validate
// with zod → then either
//   merge:   per record, the newer `updatedAt` wins; attempts, saved answers, story practice and
//            activity days are unioned so nothing recorded on either side is lost;
//   replace: clear everything, then write the backup exactly.
import { APP_NAME, ATTEMPT_CAP, SCHEMA_VERSION } from "@/lib/constants";
import { nowIso } from "@/lib/time";
import type {
  ActivityMonth,
  Attempt,
  ConceptNote,
  ProblemState,
  Profile,
  Story,
} from "@/lib/types";
import { applyIdAliases, MigrationError, migrateRawData } from "./migrations";
import type { ImportMode, ImportSummary, ImportTableSummary, Repository } from "./Repository";
import {
  exportDataSchema,
  exportEnvelopeSchema,
  type AtlasExport,
  type ExportData,
} from "./schemas";
import { keyOf, TABLE_NAMES, type TableName, type TableTypes } from "./tables";

/** Friendly import failure; `message` is written for the owner. */
export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportError";
  }
}

/** JSON.stringify with sorted object keys, for order-independent comparisons. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

export function emptyExportData(): ExportData {
  const data = { profile: null } as ExportData;
  for (const t of TABLE_NAMES) (data as Record<string, unknown>)[t] = [];
  return data;
}

function sortByKey<K extends TableName>(table: K, rows: TableTypes[K][]): TableTypes[K][] {
  return [...rows].sort((a, b) => {
    const ka = keyOf(table, a);
    const kb = keyOf(table, b);
    return ka < kb ? -1 : ka > kb ? 1 : 0;
  });
}

async function readAll(repo: Repository): Promise<ExportData> {
  const data = emptyExportData();
  data.profile = (await repo.profile.get()) ?? null;
  for (const t of TABLE_NAMES) {
    const rows = await repo.table(t).list();
    (data as Record<string, unknown>)[t] = sortByKey(t, rows);
  }
  return data;
}

export async function exportRepository(
  repo: Repository,
  now: Date = new Date(),
): Promise<AtlasExport> {
  return {
    app: APP_NAME,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: nowIso(now),
    data: await readAll(repo),
  };
}

/** Suggested backup filename: atlas-backup-YYYY-MM-DD.json (local date). */
export function backupFilename(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${APP_NAME.toLowerCase()}-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.json`;
}

function describeIssues(error: { issues: { path: PropertyKey[]; message: string }[] }): string {
  const lines = error.issues.slice(0, 4).map((issue) => {
    const path = issue.path
      .map((p) => (typeof p === "number" ? `[${p}]` : `.${String(p)}`))
      .join("");
    return `${path.replace(/^\./, "") || "file"}: ${issue.message}`;
  });
  const more = error.issues.length > 4 ? ` (and ${error.issues.length - 4} more problems)` : "";
  return `${lines.join("; ")}${more}`;
}

/**
 * Reads a backup (a JSON string or an already-parsed object), migrates and validates it.
 * Throws ImportError with a message the owner can act on.
 */
export function parseBackup(input: unknown): AtlasExport {
  let raw: unknown = input;
  if (typeof input === "string") {
    try {
      raw = JSON.parse(input);
    } catch {
      throw new ImportError(
        "This file isn't valid JSON. Choose a backup file exported from Atlas.",
      );
    }
  }
  const envelope = exportEnvelopeSchema.safeParse(raw);
  if (!envelope.success) {
    throw new ImportError(
      "This doesn't look like an Atlas backup. Choose a file exported from Settings → Data.",
    );
  }
  if (envelope.data.app !== APP_NAME && envelope.data.app.toLowerCase() !== "atlas") {
    throw new ImportError(`This backup was made by "${envelope.data.app}", not ${APP_NAME}.`);
  }
  let data: Record<string, unknown>;
  try {
    data = migrateRawData(envelope.data.data, envelope.data.schemaVersion);
  } catch (e) {
    throw new ImportError(
      e instanceof MigrationError ? e.message : "This backup could not be upgraded.",
    );
  }
  // Tables added in later versions may be missing from older files: treat them as empty.
  const filled: Record<string, unknown> = { profile: null, ...data };
  for (const t of TABLE_NAMES) if (filled[t] === undefined) filled[t] = [];
  const parsed = exportDataSchema.safeParse(filled);
  if (!parsed.success) {
    throw new ImportError(`The backup has invalid data: ${describeIssues(parsed.error)}.`);
  }
  const { data: aliased } = applyIdAliases(parsed.data);
  return {
    app: APP_NAME,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: envelope.data.exportedAt,
    data: aliased,
  };
}

export interface ImportPreview {
  exportedAt: string;
  conceptStates: number;
  problems: number;
  attempts: number;
  notes: number;
  totals: Record<TableName, number>;
}

export function previewBackup(file: AtlasExport): ImportPreview {
  const totals = {} as Record<TableName, number>;
  for (const t of TABLE_NAMES) totals[t] = file.data[t].length;
  return {
    exportedAt: file.exportedAt,
    conceptStates: file.data.conceptStates.length,
    problems: file.data.problemStates.length,
    attempts: file.data.problemStates.reduce((n, p) => n + p.attempts.length, 0),
    notes: file.data.conceptNotes.length,
    totals,
  };
}

// ----- merge ----------------------------------------------------------------------------------

type Merger<T> = (current: T, incoming: T) => T;

const newerWins = <T extends { updatedAt: string }>(current: T, incoming: T): T =>
  incoming.updatedAt > current.updatedAt ? incoming : current;

const STATUS_RANK: Record<ProblemState["status"], number> = { todo: 0, attempted: 1, solved: 2 };

/** Unions attempts by id (the newer state's copy wins on a clash), oldest first, capped at 30. */
export function mergeAttempts(
  newer: Attempt[],
  older: Attempt[],
): { attempts: Attempt[]; trimmed: number } {
  const byId = new Map<string, Attempt>();
  for (const a of older) byId.set(a.id, a);
  for (const a of newer) byId.set(a.id, a);
  const all = [...byId.values()].sort((a, b) =>
    a.startedAt < b.startedAt ? -1 : a.startedAt > b.startedAt ? 1 : 0,
  );
  const trimmed = Math.max(0, all.length - ATTEMPT_CAP);
  return { attempts: trimmed ? all.slice(trimmed) : all, trimmed };
}

function makeMergers(counter: { attemptsTrimmed: number }) {
  const mergeProblem: Merger<ProblemState> = (current, incoming) => {
    const newer = newerWins(current, incoming);
    const older = newer === current ? incoming : current;
    const { attempts, trimmed } = mergeAttempts(newer.attempts, older.attempts);
    counter.attemptsTrimmed += trimmed;
    const status =
      STATUS_RANK[older.status] > STATUS_RANK[newer.status] ? older.status : newer.status;
    return { ...newer, attempts, status };
  };
  const mergeNote: Merger<ConceptNote> = (current, incoming) => {
    const newer = newerWins(current, incoming);
    const older = newer === current ? incoming : current;
    const byId = new Map(older.savedAnswers.map((a) => [a.id, a]));
    for (const a of newer.savedAnswers) byId.set(a.id, a);
    const savedAnswers = [...byId.values()].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    return { ...newer, savedAnswers };
  };
  const mergeStory: Merger<Story> = (current, incoming) => {
    const newer = newerWins(current, incoming);
    const older = newer === current ? incoming : current;
    if (!newer.practice && !older.practice) return newer;
    const key = (p: NonNullable<Story["practice"]>[number]) => `${p.questionId}@${p.createdAt}`;
    const byKey = new Map((older.practice ?? []).map((p) => [key(p), p]));
    for (const p of newer.practice ?? []) byKey.set(key(p), p);
    const practice = [...byKey.values()].sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
    return { ...newer, practice };
  };
  const mergeActivity: Merger<ActivityMonth> = (current, incoming) => {
    const newer = newerWins(current, incoming);
    const older = newer === current ? incoming : current;
    const days = { ...older.days, ...newer.days };
    const sortedDays = Object.fromEntries(
      Object.entries(days).sort(([a], [b]) => (a < b ? -1 : 1)),
    );
    const freezes = [
      ...new Set([...(older.streakFreezeUsed ?? []), ...(newer.streakFreezeUsed ?? [])]),
    ].sort();
    const merged: ActivityMonth = { ...newer, days: sortedDays };
    if (freezes.length) merged.streakFreezeUsed = freezes;
    return merged;
  };
  return { mergeProblem, mergeNote, mergeStory, mergeActivity };
}

function mergeTable<K extends TableName>(
  table: K,
  current: TableTypes[K][],
  incoming: TableTypes[K][],
  merge: Merger<TableTypes[K]>,
): { rows: TableTypes[K][]; changed: TableTypes[K][]; summary: ImportTableSummary } {
  const byKey = new Map(current.map((r) => [keyOf(table, r), r]));
  const summary: ImportTableSummary = { added: 0, updated: 0, unchanged: 0 };
  const changed: TableTypes[K][] = [];
  for (const row of incoming) {
    const k = keyOf(table, row);
    const existing = byKey.get(k);
    if (!existing) {
      byKey.set(k, row);
      changed.push(row);
      summary.added++;
      continue;
    }
    const merged = merge(existing, row);
    if (stableStringify(merged) === stableStringify(existing)) {
      summary.unchanged++;
    } else {
      byKey.set(k, merged);
      changed.push(merged);
      summary.updated++;
    }
  }
  return { rows: sortByKey(table, [...byKey.values()]), changed, summary };
}

export interface MergeResult {
  merged: ExportData;
  changed: { [K in TableName]: TableTypes[K][] } & { profile: Profile | null };
  summary: ImportSummary;
}

/** Merges `incoming` into `current` without touching storage. */
export function mergeExportData(current: ExportData, incoming: ExportData): MergeResult {
  const counter = { attemptsTrimmed: 0 };
  const m = makeMergers(counter);
  const merged = emptyExportData();
  const changed = { ...emptyExportData() } as MergeResult["changed"];
  const tables = {} as ImportSummary["tables"];

  // Profile: newer wins.
  if (!incoming.profile) {
    merged.profile = current.profile;
    tables.profile = { added: 0, updated: 0, unchanged: current.profile ? 1 : 0 };
  } else if (!current.profile) {
    merged.profile = incoming.profile;
    changed.profile = incoming.profile;
    tables.profile = { added: 1, updated: 0, unchanged: 0 };
  } else {
    const winner = newerWins(current.profile, incoming.profile);
    merged.profile = winner;
    const same = stableStringify(winner) === stableStringify(current.profile);
    if (!same) changed.profile = winner;
    tables.profile = { added: 0, updated: same ? 0 : 1, unchanged: same ? 1 : 0 };
  }

  const attemptsBefore = current.problemStates.reduce((n, p) => n + p.attempts.length, 0);
  for (const t of TABLE_NAMES) {
    const merger = (
      t === "problemStates"
        ? m.mergeProblem
        : t === "conceptNotes"
          ? m.mergeNote
          : t === "stories"
            ? m.mergeStory
            : t === "activity"
              ? m.mergeActivity
              : newerWins
    ) as Merger<TableTypes[typeof t]>;
    const result = mergeTable(t, current[t], incoming[t], merger);
    (merged as Record<string, unknown>)[t] = result.rows;
    (changed as Record<string, unknown>)[t] = result.changed;
    tables[t] = result.summary;
  }
  const attemptsAfter = merged.problemStates.reduce((n, p) => n + p.attempts.length, 0);

  return {
    merged,
    changed,
    summary: {
      mode: "merge",
      tables,
      attemptsAdded: Math.max(0, attemptsAfter - attemptsBefore),
      attemptsTrimmed: counter.attemptsTrimmed,
    },
  };
}

/** Validates `file` and writes it into `repo` (Repository.importAll delegates here). */
export async function importIntoRepository(
  repo: Repository,
  file: unknown,
  mode: ImportMode,
): Promise<ImportSummary> {
  const backup = parseBackup(file);
  if (mode === "replace") {
    await repo.clearAll();
    const tables = {} as ImportSummary["tables"];
    if (backup.data.profile) await repo.profile.put(backup.data.profile);
    tables.profile = { added: backup.data.profile ? 1 : 0, updated: 0, unchanged: 0 };
    for (const t of TABLE_NAMES) {
      const rows = backup.data[t] as TableTypes[typeof t][];
      await repo.table(t).bulkPut(rows);
      tables[t] = { added: rows.length, updated: 0, unchanged: 0 };
    }
    await repo.flush();
    return {
      mode,
      tables,
      attemptsAdded: backup.data.problemStates.reduce((n, p) => n + p.attempts.length, 0),
      attemptsTrimmed: 0,
    };
  }
  const current = await readAll(repo);
  const result = mergeExportData(current, backup.data);
  if (result.changed.profile) await repo.profile.put(result.changed.profile);
  for (const t of TABLE_NAMES) {
    const rows = result.changed[t] as TableTypes[typeof t][];
    if (rows.length) await repo.table(t).bulkPut(rows);
  }
  await repo.flush();
  return result.summary;
}
