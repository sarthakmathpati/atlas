// Minimal typed view of the claude.ai artifact runtime capabilities Atlas uses (contract 0.2.54).
// The authoritative definitions are in docs/claude-runtime-0.2.54/*.d.ts; keep these consistent.
// Only lib/runtime, lib/storage, lib/ai and lib/files may touch these (ESLint enforces it).

export const RUNTIME_CONTRACT = "0.2.54";

// ----- db -----------------------------------------------------------------------------------

export type DbErrorCode =
  | "invalid_argument"
  | "resource_exhausted"
  | "quota_exceeded"
  | "unavailable"
  | "revoked"
  | "not_granted"
  | "capability_disabled"
  | "capability_removed"
  | "transform_error";

export interface DbError {
  code: DbErrorCode | (string & {});
  message: string;
}

export interface DbSnapshotMetadata {
  fromCache: boolean;
  hasPendingWrites: boolean;
}

export interface DbDocumentSnapshot {
  id: string;
  exists: boolean;
  data(): Record<string, unknown> | undefined;
  metadata: DbSnapshotMetadata;
}

export interface DbQuerySnapshot {
  docs: DbDocumentSnapshot[];
  size: number;
  empty: boolean;
  metadata: DbSnapshotMetadata;
}

export type Unsubscribe = () => void;

export interface DbQuery {
  where(field: string, op: string, value: unknown): DbQuery;
  orderBy(field: string, dir?: "asc" | "desc"): DbQuery;
  limit(n: number): DbQuery;
  get(): Promise<DbQuerySnapshot>;
  onSnapshot(next: (snap: DbQuerySnapshot) => void, error?: (e: DbError) => void): Unsubscribe;
}

export interface DbDocumentReference {
  id: string;
  path: string;
  get(): Promise<DbDocumentSnapshot>;
  set(data: Record<string, unknown>): Promise<void>;
  update(data: Record<string, unknown>): Promise<void>;
  delete(): Promise<void>;
  onSnapshot(next: (snap: DbDocumentSnapshot) => void, error?: (e: DbError) => void): Unsubscribe;
  collection(path: string): DbCollectionReference;
}

export interface DbCollectionReference extends DbQuery {
  path: string;
  doc(id?: string): DbDocumentReference;
  add(data: Record<string, unknown>): Promise<DbDocumentReference>;
}

export interface ClaudeDb {
  doc(path: string): DbDocumentReference;
  collection(path: string): DbCollectionReference;
}

// ----- user ---------------------------------------------------------------------------------

export interface ClaudeUser {
  id(): Promise<string | null>;
  isOwner(): Promise<boolean>;
  canEdit(): Promise<boolean>;
  can(capability: string): Promise<boolean | null>;
}

// ----- downloads ----------------------------------------------------------------------------

export interface ClaudeDownloads {
  save(request: {
    filename: string;
    data: string | Blob | ArrayBuffer | ArrayBufferView;
  }): Promise<{ status: "saved" | "delivered" }>;
}

// ----- sample -------------------------------------------------------------------------------

export type SampleModelTier = "quick" | "default" | "complex";
export type SampleInput = string | { role: "user" | "assistant"; content: string }[];

export interface SampleOptions {
  /** `text` is the WHOLE answer so far: assign it, never append. */
  onText?: (update: { text: string; delta: string }) => void;
  /** A NEW AbortController per call. */
  signal?: AbortSignal;
  modelTier?: SampleModelTier;
  /** Identical calls replay for 5 minutes by default; pass false for chat turns and "try again". */
  cache?: boolean;
}

export interface SampleResult {
  text: string;
  truncated: boolean;
  modelTierApplied: SampleModelTier;
}

export type SampleErrorCode =
  | "invalid_request"
  | "prompt_too_large"
  | "cancelled"
  | "not_granted"
  | "session_expired"
  | "sampling_disabled"
  | "not_declared"
  | "rate_limited"
  | "refused"
  | "empty_completion"
  | "invalid_json"
  | "upstream_error"
  | "capability_disabled"
  | "capability_removed"
  | "transform_error"
  | "queue_overflow";

export interface SampleError {
  code: SampleErrorCode | (string & {});
  message: string;
  text?: string;
}

export interface ClaudeSample {
  (input: SampleInput, options?: SampleOptions): Promise<SampleResult>;
  json<T = unknown>(input: SampleInput, options?: SampleOptions): Promise<T>;
}

// ----- entry point --------------------------------------------------------------------------

export interface ClaudeCapabilities {
  sample: ClaudeSample;
  db: ClaudeDb;
  user: ClaudeUser;
  downloads: ClaudeDownloads;
}

export interface ClaudeEntry {
  use<K extends keyof ClaudeCapabilities>(name: K): Promise<ClaudeCapabilities[K] | null>;
}

/** Reads `window.claude` once. The contract promises nothing on it except `use`. */
export function getClaudeEntry(): ClaudeEntry | null {
  try {
    const candidate = (globalThis as { claude?: unknown }).claude as { use?: unknown } | undefined;
    if (candidate && typeof candidate.use === "function") return candidate as ClaudeEntry;
  } catch {
    /* a hostile or frozen global: treat as standalone */
  }
  return null;
}

/** True for rejection objects shaped like the runtime's `{ code, message }`. */
export function isCodedError(e: unknown): e is { code: string; message: string; text?: string } {
  return typeof e === "object" && e !== null && typeof (e as { code?: unknown }).code === "string";
}
