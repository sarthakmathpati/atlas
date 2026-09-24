// Repository on the claude.ai artifact `db` capability (BUILD_SPEC.md 4.3 and 10.2).
//
// Layout: every document lives in the owner's private collection `data/users/<uid>`, so each
// path is `data/users/<uid>/<docId>` (four segments). Records are aggregated to respect the
// 5,000-document and 256 KiB-per-document limits:
//
//   profile                 Profile (never secrets)
//   concepts-<subjectId>    { [conceptId]: ConceptState } for one subject
//   note-<conceptId>        ConceptNote
//   problem-<problemId>     ProblemState including attempts and code
//   mistakeTags             { [id]: MistakeTag }
//   checks-<subjectId>      { [id]: Check }, latest 400 per subject
//   plan-<yyyy-mm-dd>       DayPlan, pruned after 60 days
//   activity-<yyyy-mm>      ActivityMonth
//   mock-<id> design-<id> story-<id>
//   mentalMath              { [id]: MentalMathRun }, latest 300
//   mapOverrides            { [nodeId]: MapOverride }
//   customConcepts          { [id]: CustomConcept }
//   generatedDrills         { [id]: GeneratedDrill }
//
// Every body is an envelope { kind, key, v, updatedAt, data } where `key` is the document id, so
// startup can load kind by kind, paging on the key. Reads are served from an in-memory cache.
// Writes update the cache immediately, then persist after an 800 ms pause, one write at a time
// per document, only when the document really changed.
import { DB_LIMITS } from "@/lib/constants";
import {
  isCodedError,
  type ClaudeDb,
  type DbDocumentReference,
  type Unsubscribe,
} from "@/lib/runtime/claude";
import { addDaysToDate, localDate, nowIso } from "@/lib/time";
import type { Check, MentalMathRun, ProblemState, Profile } from "@/lib/types";
import { BaseRepository, clone, patchRecord } from "./base";
import { stableStringify } from "./exportImport";
import {
  StorageError,
  type EntityStore,
  type SingletonStore,
  type StorageNoticeCode,
} from "./Repository";
import { profileSchema, TABLE_SCHEMAS } from "./schemas";
import { keyOf, TABLE_NAMES, type TableName, type TableTypes } from "./tables";

const ENVELOPE_VERSION = 1;
const PROFILE_DOC = "profile";
const DOC_ID = /^[A-Za-z0-9_\-.~:@+]{1,200}$/;

interface Envelope {
  kind: string;
  key: string;
  v: number;
  updatedAt: string;
  data: unknown;
}

type DocLayout =
  | { mode: "single"; kind: string; prefix: string }
  | {
      mode: "grouped";
      kind: string;
      docFor: (row: unknown) => string;
      /** Keep only the newest `max` records (by createdAt) in each document. */
      cap?: number;
    };

const subjectOf = (conceptId: string) => conceptId.split(".")[0] || "custom";

const LAYOUT: Record<TableName, DocLayout> = {
  conceptStates: {
    mode: "grouped",
    kind: "concepts",
    docFor: (r) => `concepts-${encodeKey(subjectOf((r as { conceptId: string }).conceptId))}`,
  },
  conceptNotes: { mode: "single", kind: "note", prefix: "note-" },
  problemStates: { mode: "single", kind: "problem", prefix: "problem-" },
  mistakeTags: { mode: "grouped", kind: "mistakeTags", docFor: () => "mistakeTags" },
  checks: {
    mode: "grouped",
    kind: "checks",
    docFor: (r) => `checks-${encodeKey(subjectOf((r as Check).conceptId))}`,
    cap: DB_LIMITS.checksPerSubject,
  },
  dayPlans: { mode: "single", kind: "plan", prefix: "plan-" },
  activity: { mode: "single", kind: "activity", prefix: "activity-" },
  mocks: { mode: "single", kind: "mock", prefix: "mock-" },
  designs: { mode: "single", kind: "design", prefix: "design-" },
  stories: { mode: "single", kind: "story", prefix: "story-" },
  mentalMath: {
    mode: "grouped",
    kind: "mentalMath",
    docFor: () => "mentalMath",
    cap: DB_LIMITS.mentalMathRuns,
  },
  mapOverrides: { mode: "grouped", kind: "mapOverrides", docFor: () => "mapOverrides" },
  customConcepts: { mode: "grouped", kind: "customConcepts", docFor: () => "customConcepts" },
  generatedDrills: { mode: "grouped", kind: "generatedDrills", docFor: () => "generatedDrills" },
};

const KIND_TO_TABLE = new Map<string, TableName>(TABLE_NAMES.map((t) => [LAYOUT[t].kind, t]));

/** Document ids allow letters, digits and _ - . ~ : @ + only. Anything else is hex-encoded. */
export function encodeKey(key: string): string {
  if (DOC_ID.test(key) && key !== "." && key !== ".." && key.length <= 150) return key;
  const hex = [...new TextEncoder().encode(key)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `x~${hex}`.slice(0, 190);
}

export function decodeKey(encoded: string): string {
  if (!encoded.startsWith("x~")) return encoded;
  const hex = encoded.slice(2);
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return new TextDecoder().decode(bytes);
}

/** Which table a document id belongs to (document ids are prefixed by kind). */
function tableForDocId(docId: string): TableName | undefined {
  for (const t of TABLE_NAMES) {
    const layout = LAYOUT[t];
    if (layout.mode === "single") {
      if (docId.startsWith(layout.prefix)) return t;
    } else if (docId === layout.kind || docId.startsWith(`${layout.kind}-`)) {
      return t;
    }
  }
  return undefined;
}

function byteSize(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).length;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Shrinks a problem so its document fits: newest 20 attempts in full, older code shortened. */
export function trimProblemForDoc(problem: ProblemState): {
  problem: ProblemState;
  trimmed: boolean;
} {
  const keep = DB_LIMITS.keepFullAttempts;
  if (problem.attempts.length <= keep) return { problem, trimmed: false };
  let trimmed = false;
  const cut = problem.attempts.length - keep;
  const attempts = problem.attempts.map((a, i) => {
    if (i >= cut || a.code.length <= DB_LIMITS.trimmedCodeChars) return a;
    trimmed = true;
    return { ...a, code: a.code.slice(0, DB_LIMITS.trimmedCodeChars) };
  });
  return { problem: { ...problem, attempts }, trimmed };
}

export interface ClaudeDbRepositoryOptions {
  debounceMs?: number;
  /** Today, for pruning old plans (tests pass a fixed date). */
  today?: string;
  /** Random retry delay in ms (tests pass 0). */
  retryDelayMs?: () => number;
}

export class ClaudeDbRepository extends BaseRepository {
  readonly kind = "claude-db" as const;
  readonly profile: SingletonStore<Profile>;

  private readonly rows = new Map<TableName, Map<string, unknown>>(
    TABLE_NAMES.map((t) => [t, new Map()]),
  );
  private profileValue: Profile | undefined;
  /** stableStringify of each document as the store has it (after load or our last write). */
  private readonly remote = new Map<string, string>();
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly chains = new Map<string, Promise<void>>();
  private readonly retries = new Map<string, number>();
  private readonly watchers = new Map<string, { unsubscribe: Unsubscribe; count: number }>();
  private readonly lastNotice = new Map<StorageNoticeCode, number>();
  private readOnly = false;
  private readonly debounceMs: number;
  private readonly retryDelay: () => number;

  private constructor(
    private readonly db: ClaudeDb,
    private readonly uid: string,
    options: ClaudeDbRepositoryOptions,
  ) {
    super();
    this.debounceMs = options.debounceMs ?? DB_LIMITS.writeDebounceMs;
    this.retryDelay = options.retryDelayMs ?? (() => 300 + Math.random() * 1000);
    this.profile = {
      get: async () => (this.profileValue ? clone(this.profileValue) : undefined),
      put: async (value) => {
        this.profileValue = clone(value);
        this.markDirty(PROFILE_DOC);
      },
      patch: (changes) =>
        patchRecord(
          () => this.profile.get(),
          (v) => this.profile.put(v),
          changes,
        ),
      clear: async () => {
        this.profileValue = undefined;
        this.markDirty(PROFILE_DOC);
      },
    };
  }

  /** Loads everything for this user. Throws StorageError if the store can't be read. */
  static async open(
    db: ClaudeDb,
    uid: string,
    options: ClaudeDbRepositoryOptions = {},
  ): Promise<ClaudeDbRepository> {
    if (!uid) throw new StorageError("No user id: synced storage is unavailable.");
    const repo = new ClaudeDbRepository(db, uid, options);
    await repo.load(options.today ?? localDate());
    return repo;
  }

  // ----- addressing ---------------------------------------------------------------------------

  private ref(docId: string): DbDocumentReference {
    return this.db.doc(`data/users/${this.uid}/${docId}`);
  }

  private docIdFor(table: TableName, row: unknown): string {
    const layout = LAYOUT[table];
    if (layout.mode === "grouped") return layout.docFor(row);
    return `${layout.prefix}${encodeKey(keyOf(table, row as TableTypes[typeof table]))}`;
  }

  private tableRows<K extends TableName>(table: K): Map<string, TableTypes[K]> {
    return this.rows.get(table) as Map<string, TableTypes[K]>;
  }

  // ----- loading ------------------------------------------------------------------------------

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (isCodedError(e) && e.code === "unavailable") {
        await delay(this.retryDelay());
        return fn();
      }
      throw e;
    }
  }

  private async load(today: string): Promise<void> {
    const collection = this.db.collection(`data/users/${this.uid}`);
    const kinds = ["profile", ...TABLE_NAMES.map((t) => LAYOUT[t].kind)];
    try {
      for (const kind of kinds) {
        let lastKey = "";
        for (;;) {
          const snap = await this.withRetry(() =>
            collection
              .where("kind", "==", kind)
              .where("key", ">", lastKey)
              .orderBy("key")
              .limit(DB_LIMITS.pageSize)
              .get(),
          );
          for (const doc of snap.docs) {
            const body = doc.data() as Envelope | undefined;
            if (!body || typeof body.key !== "string") continue;
            lastKey = body.key;
            this.remote.set(doc.id, stableStringify(body));
            this.ingest(doc.id, body);
          }
          if (snap.size < DB_LIMITS.pageSize) break;
        }
      }
    } catch (e) {
      throw new StorageError(
        "Couldn't load your synced data from Claude. Check your connection and try again.",
        e,
      );
    }
    this.pruneOldPlans(today);
  }

  /** Puts one document's records into the cache, skipping any record that fails validation. */
  private ingest(docId: string, body: Envelope): void {
    if (body.kind === "profile") {
      const parsed = profileSchema.safeParse(body.data);
      if (parsed.success) this.profileValue = parsed.data;
      else console.warn("Ignoring an invalid synced profile", parsed.error.issues.slice(0, 3));
      return;
    }
    const table = KIND_TO_TABLE.get(body.kind);
    if (!table) return;
    const schema = TABLE_SCHEMAS[table];
    const target = this.rows.get(table)!;
    const layout = LAYOUT[table];
    if (layout.mode === "grouped") {
      // Records that moved to another document elsewhere are replaced, not duplicated.
      for (const [k, row] of target) if (this.docIdFor(table, row) === docId) target.delete(k);
    }
    const candidates =
      layout.mode === "single"
        ? [body.data]
        : Object.values((body.data as Record<string, unknown> | null) ?? {});
    for (const candidate of candidates) {
      const parsed = schema.safeParse(candidate);
      if (!parsed.success) {
        console.warn(`Ignoring an invalid synced ${table} record`, parsed.error.issues.slice(0, 3));
        continue;
      }
      target.set(keyOf(table, parsed.data as never), parsed.data);
    }
  }

  private pruneOldPlans(today: string): void {
    const cutoff = addDaysToDate(today, -DB_LIMITS.planDays);
    const plans = this.tableRows("dayPlans");
    for (const [date, plan] of plans) {
      if (date < cutoff) {
        plans.delete(date);
        this.markDirty(this.docIdFor("dayPlans", plan));
      }
    }
  }

  // ----- building documents -------------------------------------------------------------------

  /** The envelope a document should contain right now, or null when it should not exist. */
  private buildBody(docId: string): Envelope | null {
    if (docId === PROFILE_DOC) {
      if (!this.profileValue) return null;
      return {
        kind: "profile",
        key: docId,
        v: ENVELOPE_VERSION,
        updatedAt: this.profileValue.updatedAt,
        data: this.profileValue,
      };
    }
    const table = tableForDocId(docId);
    if (!table) return null;
    const layout = LAYOUT[table];
    const rows = this.tableRows(table);
    if (layout.mode === "single") {
      const row = rows.get(decodeKey(docId.slice(layout.prefix.length)));
      if (!row) return null;
      return {
        kind: layout.kind,
        key: docId,
        v: ENVELOPE_VERSION,
        updatedAt: row.updatedAt,
        data: row,
      };
    }
    let members = [...rows.values()].filter((row) => layout.docFor(row) === docId);
    if (members.length === 0) return null;
    if (layout.cap && members.length > layout.cap) {
      const newestFirst = [...members].sort((a, b) =>
        (a as Check | MentalMathRun).createdAt < (b as Check | MentalMathRun).createdAt ? 1 : -1,
      );
      for (const row of newestFirst.slice(layout.cap)) rows.delete(keyOf(table, row));
      members = newestFirst.slice(0, layout.cap);
    }
    const data: Record<string, unknown> = {};
    let updatedAt = "";
    for (const row of members.sort((a, b) => (keyOf(table, a) < keyOf(table, b) ? -1 : 1))) {
      data[keyOf(table, row)] = row;
      if (row.updatedAt > updatedAt) updatedAt = row.updatedAt;
    }
    return {
      kind: layout.kind,
      key: docId,
      v: ENVELOPE_VERSION,
      updatedAt: updatedAt || nowIso(),
      data,
    };
  }

  /** Makes a problem document fit under the size limits, trimming old attempt code if needed. */
  private fitProblem(body: Envelope): Envelope | null {
    if (body.kind !== "problem" || byteSize(body) <= DB_LIMITS.problemDocSoftBytes) return body;
    const problem = body.data as ProblemState;
    const { problem: slim, trimmed } = trimProblemForDoc(problem);
    if (trimmed) {
      this.tableRows("problemStates").set(problem.problemId, slim);
      this.notice(
        "warning",
        "trimmed",
        "A problem had so many attempts that its oldest code was shortened to 2,000 characters to fit synced storage. Your latest 20 attempts are kept in full.",
      );
    }
    return { ...body, data: slim };
  }

  // ----- writing ------------------------------------------------------------------------------

  private markDirty(docId: string): void {
    if (this.readOnly) return;
    const existing = this.timers.get(docId);
    if (existing) clearTimeout(existing);
    this.timers.set(
      docId,
      setTimeout(() => {
        void this.enqueue(docId);
      }, this.debounceMs),
    );
  }

  private enqueue(docId: string): Promise<void> {
    const timer = this.timers.get(docId);
    if (timer) clearTimeout(timer);
    this.timers.delete(docId);
    const previous = this.chains.get(docId) ?? Promise.resolve();
    const next = previous.then(() => this.persist(docId)).catch(() => undefined);
    this.chains.set(docId, next);
    void next.finally(() => {
      if (this.chains.get(docId) === next) this.chains.delete(docId);
    });
    return next;
  }

  private async persist(docId: string): Promise<void> {
    if (this.readOnly) return;
    let body = this.buildBody(docId);
    if (body) body = this.fitProblem(body);
    const serialized = body ? stableStringify(body) : null;
    if (serialized === (this.remote.get(docId) ?? null)) return; // nothing changed
    if (body && byteSize(body) > DB_LIMITS.maxDocBytes) {
      this.notice(
        "error",
        "write-failed",
        "One of your records is too large to sync (over 256 KiB), so its latest change wasn't saved. Export a backup to keep it safe.",
      );
      return;
    }
    const ref = this.ref(docId);
    try {
      await this.withRetry(() =>
        body ? ref.set(body as unknown as Record<string, unknown>) : ref.delete(),
      );
      if (serialized === null) this.remote.delete(docId);
      else this.remote.set(docId, serialized);
      this.retries.delete(docId);
    } catch (e) {
      this.handleWriteError(docId, e);
    }
  }

  private handleWriteError(docId: string, e: unknown): void {
    const code = isCodedError(e) ? e.code : "unknown";
    switch (code) {
      case "quota_exceeded":
        this.notice(
          "error",
          "quota",
          "Synced storage is full, so new items can't be saved. Export a backup, then delete old plans or practice history in Settings → Data.",
        );
        return;
      case "resource_exhausted": {
        const tries = (this.retries.get(docId) ?? 0) + 1;
        this.retries.set(docId, tries);
        if (tries <= 3) {
          this.notice(
            "info",
            "slow-down",
            "Saving is being slowed down for a moment. Your changes are kept and will be saved shortly.",
          );
          const existing = this.timers.get(docId);
          if (existing) clearTimeout(existing);
          this.timers.set(
            docId,
            setTimeout(() => void this.enqueue(docId), 5000 * tries),
          );
        } else {
          this.notice(
            "error",
            "write-failed",
            "Some changes couldn't be saved after several tries. Export a backup to keep them safe.",
          );
        }
        return;
      }
      case "revoked":
      case "not_granted":
      case "capability_disabled":
      case "capability_removed":
        this.readOnly = true;
        for (const t of this.timers.values()) clearTimeout(t);
        this.timers.clear();
        this.notice(
          "error",
          "read-only",
          "Synced storage is no longer available in this view. Changes you make now are kept only until you reload. Export a backup to keep them.",
        );
        return;
      default:
        this.notice(
          "error",
          "write-failed",
          "A change couldn't be saved to synced storage. Export a backup to keep your data safe.",
        );
    }
  }

  private notice(
    level: "info" | "warning" | "error",
    code: StorageNoticeCode,
    message: string,
  ): void {
    const now = Date.now();
    const last = this.lastNotice.get(code) ?? 0;
    if (now - last < 60_000) return; // at most one notice per kind per minute
    this.lastNotice.set(code, now);
    this.emit({ type: "notice", level, code, message });
  }

  override async flush(): Promise<void> {
    for (let round = 0; round < 5 && (this.timers.size > 0 || this.chains.size > 0); round++) {
      for (const docId of [...this.timers.keys()]) void this.enqueue(docId);
      await Promise.all([...this.chains.values()]);
    }
  }

  // ----- live updates -------------------------------------------------------------------------

  override watch(table: "profile" | "dayPlans", key: string): () => void {
    const docId = table === "profile" ? PROFILE_DOC : `plan-${encodeKey(key)}`;
    const existing = this.watchers.get(docId);
    if (existing) {
      existing.count++;
      return () => this.unwatch(docId);
    }
    const unsubscribe = this.ref(docId).onSnapshot(
      (snap) => {
        // A local change is waiting to be written: ours is newer, so ignore the echo.
        if (this.timers.has(docId) || this.chains.has(docId)) return;
        const body = snap.exists ? (snap.data() as Envelope | undefined) : undefined;
        const serialized = body ? stableStringify(body) : null;
        if (serialized === (this.remote.get(docId) ?? null)) return;
        if (serialized === null) {
          this.remote.delete(docId);
          if (docId === PROFILE_DOC) this.profileValue = undefined;
          else this.tableRows("dayPlans").delete(key);
        } else if (body) {
          this.remote.set(docId, serialized);
          this.ingest(docId, body);
        }
        this.emit({ type: "remote-change", table, keys: [key] });
      },
      (error) => {
        if (error.code === "revoked") {
          this.readOnly = true;
          this.notice(
            "error",
            "read-only",
            "Synced storage is no longer available in this view. Export a backup to keep recent changes.",
          );
        }
        this.watchers.delete(docId);
      },
    );
    this.watchers.set(docId, { unsubscribe, count: 1 });
    return () => this.unwatch(docId);
  }

  private unwatch(docId: string): void {
    const w = this.watchers.get(docId);
    if (!w) return;
    w.count--;
    if (w.count <= 0) {
      w.unsubscribe();
      this.watchers.delete(docId);
    }
  }

  // ----- stores -------------------------------------------------------------------------------

  table<K extends TableName>(name: K): EntityStore<TableTypes[K]> {
    const rows = this.tableRows(name);
    const store: EntityStore<TableTypes[K]> = {
      get: async (key) => {
        const row = rows.get(key);
        return row ? clone(row) : undefined;
      },
      list: async () => [...rows.values()].map(clone),
      put: async (value) => {
        const key = keyOf(name, value);
        const previous = rows.get(key);
        rows.set(key, clone(value));
        const docId = this.docIdFor(name, value);
        this.markDirty(docId);
        if (previous) {
          const before = this.docIdFor(name, previous);
          if (before !== docId) this.markDirty(before);
        }
      },
      bulkPut: async (values) => {
        for (const v of values) await store.put(v);
      },
      patch: (key, changes) =>
        patchRecord(
          () => store.get(key),
          (v) => store.put(v),
          changes,
        ),
      delete: async (key) => {
        const row = rows.get(key);
        if (!row) return;
        rows.delete(key);
        this.markDirty(this.docIdFor(name, row));
      },
      clear: async () => {
        const docIds = new Set([...rows.values()].map((row) => this.docIdFor(name, row)));
        rows.clear();
        for (const docId of docIds) this.markDirty(docId);
      },
    };
    return store;
  }

  override close(): void {
    for (const w of this.watchers.values()) w.unsubscribe();
    this.watchers.clear();
    super.close();
  }
}
