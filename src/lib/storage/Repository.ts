// The Repository is the ONLY way feature code reads or writes user data (BUILD_SPEC.md 2.4).
// Implementations:
//   DexieRepository     IndexedDB, for the standalone web app
//   ClaudeDbRepository  the claude.ai artifact `db` capability (synced across the owner's devices)
//   MemoryRepository    last-resort fallback when browser storage is blocked, and for tests
import type { Profile } from "@/lib/types";
import type { AtlasExport } from "./schemas";
import type { TableName, TableTypes } from "./tables";

export type RepositoryKind = "dexie" | "claude-db" | "memory";

/** Typed async access to one table. Values are copies: mutating them never changes storage. */
export interface EntityStore<T> {
  get(key: string): Promise<T | undefined>;
  list(): Promise<T[]>;
  put(value: T): Promise<void>;
  bulkPut(values: T[]): Promise<void>;
  /** Merges `changes` into an existing record and stamps `updatedAt` (unless given). */
  patch(key: string, changes: Partial<T>): Promise<T | undefined>;
  delete(key: string): Promise<void>;
  clear(): Promise<void>;
}

export interface SingletonStore<T> {
  get(): Promise<T | undefined>;
  put(value: T): Promise<void>;
  patch(changes: Partial<T>): Promise<T | undefined>;
  clear(): Promise<void>;
}

export type StorageNoticeCode =
  | "quota" // the synced store is full
  | "slow-down" // too many writes; retrying later
  | "retrying" // a transient failure; retried once
  | "read-only" // access was withdrawn; changes are kept only until reload
  | "trimmed" // old attempt code was shortened to fit the 256 KiB document limit
  | "write-failed" // a write failed and could not be retried
  | "not-persistent"; // browser storage is blocked; data lives only in this tab

export type RepositoryEvent =
  /** Data changed on another device (artifact runtime). Stores should re-read these keys. */
  | { type: "remote-change"; table: TableName | "profile"; keys: string[] }
  /** Something the owner should know about. */
  | {
      type: "notice";
      level: "info" | "warning" | "error";
      code: StorageNoticeCode;
      message: string;
    };

export type ImportMode = "merge" | "replace";

export interface ImportTableSummary {
  added: number;
  updated: number;
  unchanged: number;
}

export interface ImportSummary {
  mode: ImportMode;
  tables: Record<TableName | "profile", ImportTableSummary>;
  attemptsAdded: number;
  /** Attempts dropped because a problem would exceed the 30-attempt cap after merging. */
  attemptsTrimmed: number;
}

export type Repositories = { [K in TableName]: EntityStore<TableTypes[K]> };

export interface Repository extends Repositories {
  readonly kind: RepositoryKind;
  readonly profile: SingletonStore<Profile>;
  /** Typed access by table name (used by generic code such as export and import). */
  table<K extends TableName>(name: K): EntityStore<TableTypes[K]>;
  /** Everything except secrets, ready to save as a backup file. */
  exportAll(): Promise<AtlasExport>;
  /** Validates, migrates and writes a backup. Throws ImportError with a friendly message. */
  importAll(file: unknown, mode: ImportMode): Promise<ImportSummary>;
  /** Deletes all user data (Settings → Reset). Secrets are cleared separately. */
  clearAll(): Promise<void>;
  /** Resolves when every pending write has been persisted. */
  flush(): Promise<void>;
  /** Live-update one record from other devices (artifact runtime; a no-op elsewhere). */
  watch(table: "profile" | "dayPlans", key: string): () => void;
  subscribe(listener: (event: RepositoryEvent) => void): () => void;
  close(): void;
}

export class StorageError extends Error {
  readonly causeError: unknown;
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "StorageError";
    this.causeError = cause;
  }
}
