// An in-memory implementation of the claude.ai runtime capabilities (contract 0.2.54), used by
// tests and available for local experiments. It follows the documented `db` contract closely:
// path grammar (TypeErrors), plain-object bodies up to 256 KiB, 5,000 documents, where / orderBy
// / limit queries, onSnapshot delivery, and `{ code, message }` rejections. Tests can inject
// failures to exercise error handling.
import type {
  ClaudeDb,
  ClaudeDownloads,
  ClaudeEntry,
  ClaudeSample,
  ClaudeUser,
  DbCollectionReference,
  DbDocumentReference,
  DbDocumentSnapshot,
  DbError,
  DbQuery,
  DbQuerySnapshot,
} from "./claude";

const SEGMENT = /^[A-Za-z0-9_\-.~:@+]+$/;
const MAX_BYTES = 256 * 1024;

function checkPath(path: string, kind: "doc" | "collection"): string[] {
  if (typeof path !== "string" || path.length === 0)
    throw new TypeError("path must be a non-empty string");
  const segments = path.split("/");
  if (segments.length > 16) throw new TypeError("path has more than 16 segments");
  if (new TextEncoder().encode(path).length > 1000)
    throw new TypeError("path is longer than 1000 bytes");
  for (const s of segments) {
    if (!SEGMENT.test(s) || s === "." || s === "..")
      throw new TypeError(`invalid path segment "${s}"`);
    if (new TextEncoder().encode(s).length > 200)
      throw new TypeError("path segment longer than 200 bytes");
  }
  const even = segments.length % 2 === 0;
  if (kind === "doc" && !even)
    throw new TypeError(`document paths need an even number of segments (got ${segments.length})`);
  if (kind === "collection" && even)
    throw new TypeError(`collection paths need an odd number of segments (got ${segments.length})`);
  return segments;
}

function reject(code: string, message: string): Promise<never> {
  return Promise.reject({ code, message } satisfies DbError);
}

function depth(value: unknown, level = 0): number {
  if (value === null || typeof value !== "object") return level;
  let max = level + 1;
  for (const v of Object.values(value as Record<string, unknown>))
    max = Math.max(max, depth(v, level + 1));
  return max;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    for (const v of Object.values(value as Record<string, unknown>)) deepFreeze(v);
  }
  return value;
}

function mergeDeep(
  target: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...target };
  for (const [k, v] of Object.entries(patch)) {
    const existing = out[k];
    if (
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      existing &&
      typeof existing === "object" &&
      !Array.isArray(existing)
    ) {
      out[k] = mergeDeep(existing as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

interface Filter {
  field: string;
  op: string;
  value: unknown;
}

function compare(a: unknown, b: unknown): number {
  if (a === b) return 0;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a) < String(b) ? -1 : 1;
}

function matches(body: Record<string, unknown>, f: Filter): boolean {
  if (!(f.field in body)) return false;
  const v = body[f.field];
  switch (f.op) {
    case "==":
      return v === f.value;
    case "!=":
      return v !== f.value;
    case "<":
      return compare(v, f.value) < 0;
    case "<=":
      return compare(v, f.value) <= 0;
    case ">":
      return compare(v, f.value) > 0;
    case ">=":
      return compare(v, f.value) >= 0;
    case "in":
      return Array.isArray(f.value) && f.value.includes(v);
    case "not-in":
      return Array.isArray(f.value) && !f.value.includes(v);
    case "array-contains":
      return Array.isArray(v) && v.includes(f.value);
    default:
      throw new TypeError(`unsupported operator ${f.op}`);
  }
}

export interface InjectedFailure {
  code: string;
  /** How many calls fail (default 1). */
  times?: number;
  /** Only calls whose operation and path match. */
  op?: "get" | "set" | "update" | "delete" | "query";
  pathIncludes?: string;
}

export class FakeClaudeDb implements ClaudeDb {
  readonly docs = new Map<string, Record<string, unknown>>();
  readonly calls: { op: string; path: string }[] = [];
  readonly failures: InjectedFailure[] = [];
  maxDocuments = 5000;
  private docListeners = new Map<string, Set<(snap: DbDocumentSnapshot) => void>>();
  private queryListeners = new Set<() => void>();

  doc(path: string): DbDocumentReference {
    checkPath(path, "doc");
    return new FakeDocRef(this, path);
  }

  collection(path: string): DbCollectionReference {
    checkPath(path, "collection");
    return new FakeQueryRef(this, path, [], null, null) as unknown as DbCollectionReference;
  }

  /** Makes the next matching call(s) reject with `code`. */
  failNext(failure: InjectedFailure): void {
    this.failures.push({ times: 1, ...failure });
  }

  /** Writes as if from another device (fires listeners, bypasses failure injection). */
  externalSet(path: string, body: Record<string, unknown>): void {
    this.docs.set(path, deepFreeze(structuredClone(body)));
    this.notify(path);
  }

  documentCount(): number {
    return this.docs.size;
  }

  /** @internal */
  checkFailure(op: InjectedFailure["op"], path: string): DbError | null {
    this.calls.push({ op: op ?? "", path });
    const index = this.failures.findIndex(
      (f) => (!f.op || f.op === op) && (!f.pathIncludes || path.includes(f.pathIncludes)),
    );
    if (index < 0) return null;
    const failure = this.failures[index]!;
    failure.times = (failure.times ?? 1) - 1;
    if (failure.times <= 0) this.failures.splice(index, 1);
    return { code: failure.code, message: `injected ${failure.code}` };
  }

  /** @internal */
  snapshot(path: string): DbDocumentSnapshot {
    const body = this.docs.get(path);
    return {
      id: path.split("/").pop()!,
      exists: body !== undefined,
      data: () => body,
      metadata: { fromCache: false, hasPendingWrites: false },
    };
  }

  /** @internal */
  write(path: string, body: Record<string, unknown> | undefined): void {
    if (body === undefined) this.docs.delete(path);
    else this.docs.set(path, deepFreeze(structuredClone(body)));
    this.notify(path);
  }

  /** @internal */
  listenDoc(path: string, fn: (snap: DbDocumentSnapshot) => void): () => void {
    const set = this.docListeners.get(path) ?? new Set();
    set.add(fn);
    this.docListeners.set(path, set);
    queueMicrotask(() => {
      if (set.has(fn)) fn(this.snapshot(path));
    });
    return () => {
      set.delete(fn);
    };
  }

  /** @internal */
  listenQuery(fn: () => void): () => void {
    this.queryListeners.add(fn);
    queueMicrotask(() => {
      if (this.queryListeners.has(fn)) fn();
    });
    return () => {
      this.queryListeners.delete(fn);
    };
  }

  private notify(path: string): void {
    const listeners = this.docListeners.get(path);
    queueMicrotask(() => {
      if (listeners) for (const fn of listeners) fn(this.snapshot(path));
      for (const fn of this.queryListeners) fn();
    });
  }
}

class FakeDocRef implements DbDocumentReference {
  readonly id: string;
  constructor(
    private readonly db: FakeClaudeDb,
    readonly path: string,
  ) {
    this.id = path.split("/").pop()!;
  }

  async get(): Promise<DbDocumentSnapshot> {
    const fail = this.db.checkFailure("get", this.path);
    if (fail) return reject(fail.code, fail.message);
    return this.db.snapshot(this.path);
  }

  async set(data: Record<string, unknown>): Promise<void> {
    const fail = this.db.checkFailure("set", this.path);
    if (fail) return reject(fail.code, fail.message);
    if (!data || typeof data !== "object" || Array.isArray(data))
      return reject("invalid_argument", "body must be an object");
    const json = JSON.stringify(data);
    if (new TextEncoder().encode(json).length > MAX_BYTES)
      return reject("invalid_argument", "document over 256 KiB");
    if (depth(data) > 32) return reject("invalid_argument", "document deeper than 32 levels");
    if (!this.db.docs.has(this.path) && this.db.docs.size >= this.db.maxDocuments) {
      return reject("quota_exceeded", "documents in this artifact's database are full");
    }
    this.db.write(this.path, JSON.parse(json) as Record<string, unknown>);
  }

  async update(data: Record<string, unknown>): Promise<void> {
    const fail = this.db.checkFailure("update", this.path);
    if (fail) return reject(fail.code, fail.message);
    const existing = this.db.docs.get(this.path);
    if (!existing) return reject("invalid_argument", "update requires an existing document");
    const merged = mergeDeep(structuredClone(existing), structuredClone(data));
    if (new TextEncoder().encode(JSON.stringify(merged)).length > MAX_BYTES) {
      return reject("invalid_argument", "document over 256 KiB");
    }
    this.db.write(this.path, merged);
  }

  async delete(): Promise<void> {
    const fail = this.db.checkFailure("delete", this.path);
    if (fail) return reject(fail.code, fail.message);
    this.db.write(this.path, undefined);
  }

  onSnapshot(next: (snap: DbDocumentSnapshot) => void): () => void {
    return this.db.listenDoc(this.path, next);
  }

  collection(path: string): DbCollectionReference {
    return this.db.collection(`${this.path}/${path}`);
  }
}

class FakeQueryRef implements DbQuery {
  constructor(
    private readonly db: FakeClaudeDb,
    readonly path: string,
    private readonly filters: Filter[],
    private readonly order: { field: string; dir: "asc" | "desc" } | null,
    private readonly max: number | null,
  ) {}

  where(field: string, op: string, value: unknown): DbQuery {
    if (this.filters.length >= 10) throw new TypeError("at most 10 filters");
    return new FakeQueryRef(
      this.db,
      this.path,
      [...this.filters, { field, op, value }],
      this.order,
      this.max,
    );
  }

  orderBy(field: string, dir: "asc" | "desc" = "asc"): DbQuery {
    return new FakeQueryRef(this.db, this.path, this.filters, { field, dir }, this.max);
  }

  limit(n: number): DbQuery {
    return new FakeQueryRef(this.db, this.path, this.filters, this.order, n);
  }

  doc(id?: string): DbDocumentReference {
    return this.db.doc(`${this.path}/${id ?? Math.random().toString(36).slice(2, 12)}`);
  }

  async add(data: Record<string, unknown>): Promise<DbDocumentReference> {
    const ref = this.doc();
    await ref.set(data);
    return ref;
  }

  private run(): DbQuerySnapshot {
    const prefix = `${this.path}/`;
    let rows = [...this.db.docs.entries()]
      .filter(([p]) => p.startsWith(prefix) && !p.slice(prefix.length).includes("/"))
      .filter(([, body]) => this.filters.every((f) => matches(body, f)));
    if (this.order) {
      const { field, dir } = this.order;
      rows.sort(([pa, a], [pb, b]) => {
        const hasA = field in a;
        const hasB = field in b;
        if (!hasA || !hasB) return hasA === hasB ? compare(pa, pb) : hasA ? -1 : 1;
        const c = compare(a[field], b[field]);
        return dir === "asc" ? c : -c;
      });
    } else {
      rows.sort(([pa], [pb]) => compare(pa, pb));
    }
    if (this.max !== null) rows = rows.slice(0, this.max);
    const docs = rows.map(([p]) => this.db.snapshot(p));
    return {
      docs,
      size: docs.length,
      empty: docs.length === 0,
      metadata: { fromCache: false, hasPendingWrites: false },
    };
  }

  async get(): Promise<DbQuerySnapshot> {
    const fail = this.db.checkFailure("query", this.path);
    if (fail) return reject(fail.code, fail.message);
    if (this.max !== null && (this.max < 1 || this.max > 1000))
      return reject("invalid_argument", "limit must be 1-1000");
    return this.run();
  }

  onSnapshot(next: (snap: DbQuerySnapshot) => void): () => void {
    return this.db.listenQuery(() => next(this.run()));
  }
}

export class FakeClaudeDownloads implements ClaudeDownloads {
  readonly saved: { filename: string; data: unknown }[] = [];
  declineNext = false;
  async save(request: { filename: string; data: unknown }): Promise<{ status: "saved" }> {
    if (this.declineNext) {
      this.declineNext = false;
      return Promise.reject({ code: "declined", message: "The viewer declined." });
    }
    this.saved.push(request);
    return { status: "saved" };
  }
}

export function createFakeUser(uid: string | null): ClaudeUser {
  return {
    id: async () => uid,
    isOwner: async () => true,
    canEdit: async () => true,
    can: async () => true,
  };
}

export interface FakeClaudeOptions {
  db?: ClaudeDb | null;
  uid?: string | null;
  downloads?: ClaudeDownloads | null;
  sample?: ClaudeSample | null;
}

/** A `window.claude`-like entry point whose `use()` resolves the given capabilities. */
export function createFakeClaude(options: FakeClaudeOptions = {}): ClaudeEntry {
  const caps: Record<string, unknown> = {
    db: options.db ?? null,
    user:
      options.uid === undefined
        ? createFakeUser("owner-1")
        : options.uid === null
          ? null
          : createFakeUser(options.uid),
    downloads: options.downloads ?? null,
    sample: options.sample ?? null,
  };
  return {
    use: async (name) => (caps[name] ?? null) as never,
  };
}
