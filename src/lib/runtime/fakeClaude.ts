// An in-memory implementation of the claude.ai runtime capabilities (contract 0.2.54), used by
// tests and available for local experiments. It follows the documented `db` contract closely:
// path grammar (TypeErrors), plain-object bodies up to 256 KiB, 5,000 documents, where / orderBy
// / limit queries, onSnapshot delivery, and `{ code, message }` rejections. Tests can inject
// failures to exercise error handling. `createFakeSample` does the same for `sample`: input
// checks, streaming through `onText` (whole text so far), cancel, the 5-minute answer cache,
// tolerant `json()` and every rejection code.
import type {
  ClaudeDb,
  ClaudeDownloads,
  ClaudeEntry,
  ClaudeSample,
  ClaudeUser,
  SampleInput,
  SampleModelTier,
  SampleOptions,
  SampleResult,
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

// ----- sample -------------------------------------------------------------------------------------

const MAX_PROMPT_BYTES = 65536;
const TIERS: readonly SampleModelTier[] = ["quick", "default", "complex"];

/** What a fake answer can be: text, or a rejection (`{ code, message, text? }`). */
export type FakeSampleReply =
  | string
  | { text: string; truncated?: boolean; tier?: SampleModelTier }
  | { reject: { code: string; message?: string; text?: string } };

export type FakeSampleResponder = (
  input: SampleInput,
  meta: { verb: "sample" | "json"; tier: SampleModelTier; call: number },
) => FakeSampleReply | Promise<FakeSampleReply>;

export interface FakeSampleOptions {
  responder?: FakeSampleResponder;
  /** How many onText updates a reply streams in (default 3). */
  chunks?: number;
  /** Milliseconds between updates (default 0: each on its own macrotask). */
  delayMs?: number;
}

export interface FakeSampleCall {
  verb: "sample" | "json";
  input: SampleInput;
  options: SampleOptions;
}

export interface FakeSample extends ClaudeSample {
  readonly calls: FakeSampleCall[];
  setResponder(responder: FakeSampleResponder): void;
  /** The next call rejects with this error (after streaming `text`, if given). */
  failNext(error: { code: string; message?: string; text?: string }): void;
  limits(): Promise<{ maxPromptBytes: number }>;
}

function inputBytes(input: SampleInput): number {
  const text = typeof input === "string" ? input : input.map((t) => t.content).join("");
  return new TextEncoder().encode(text).length;
}

function inputProblem(input: unknown): string | null {
  if (typeof input === "string") return input.trim() === "" ? "input is empty" : null;
  if (!Array.isArray(input) || input.length === 0) return "input must be a string or turns";
  for (const t of input as { role?: unknown; content?: unknown }[]) {
    if (t.role !== "user" && t.role !== "assistant") return "a turn has an unknown role";
    if (typeof t.content !== "string" || t.content.trim() === "") return "a turn is empty";
  }
  const first = (input[0] as { role: string }).role;
  const last = (input[input.length - 1] as { role: string }).role;
  if (first !== "user" || last !== "user") return "turns must start and end with a user turn";
  return null;
}

/** The runtime's tolerant JSON reading (whole text, one fence, first bracket to last). */
function readJson(text: string): { ok: true; value: unknown } | { ok: false } {
  const attempt = (t: string) => {
    try {
      return { ok: true as const, value: JSON.parse(t.trim()) as unknown };
    } catch {
      return { ok: false as const };
    }
  };
  const whole = attempt(text);
  if (whole.ok) return whole;
  const fence = /```[a-zA-Z0-9_-]*[ \t]*\r?\n([\s\S]*?)```/.exec(text);
  if (fence) {
    const inner = attempt(fence[1] ?? "");
    if (inner.ok) return inner;
  }
  const start = [text.indexOf("{"), text.indexOf("[")].filter((i) => i >= 0);
  const end = Math.max(text.lastIndexOf("}"), text.lastIndexOf("]"));
  if (start.length && end > Math.min(...start))
    return attempt(text.slice(Math.min(...start), end + 1));
  return { ok: false };
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** An in-memory `sample` capability that follows the 0.2.54 contract. */
export function createFakeSample(options: FakeSampleOptions = {}): FakeSample {
  let responder: FakeSampleResponder = options.responder ?? (() => "OK");
  let nextFailure: { code: string; message?: string; text?: string } | null = null;
  const calls: FakeSampleCall[] = [];
  const cache = new Map<string, SampleResult>();
  const chunks = Math.max(1, options.chunks ?? 3);
  const delay = options.delayMs ?? 0;

  const run = async (
    verb: "sample" | "json",
    input: SampleInput,
    opts: SampleOptions = {},
  ): Promise<SampleResult> => {
    // The request leaves on the next microtask; nothing is sent when already aborted.
    await Promise.resolve();
    calls.push({ verb, input, options: opts });
    const problem = inputProblem(input);
    if (problem) throw { code: "invalid_request", message: problem };
    if (opts.modelTier !== undefined && !TIERS.includes(opts.modelTier))
      throw { code: "invalid_request", message: "unknown modelTier" };
    if (opts.signal?.aborted) throw { code: "cancelled", message: "The call was cancelled." };
    if (inputBytes(input) > MAX_PROMPT_BYTES)
      throw { code: "prompt_too_large", message: "The input is over 64 KiB." };
    const tier = opts.modelTier ?? "default";
    const key = JSON.stringify([verb, input, tier]);
    if (opts.cache !== false && cache.has(key)) {
      const hit = cache.get(key)!;
      await sleep(delay);
      opts.onText?.({ text: hit.text, delta: hit.text });
      return hit;
    }

    const failing = nextFailure;
    nextFailure = null;
    const reply: FakeSampleReply = failing
      ? { reject: failing }
      : await responder(input, { verb, tier, call: calls.length });
    const rejection = typeof reply === "object" && "reject" in reply ? reply.reject : null;
    const text =
      typeof reply === "string" ? reply : "text" in reply ? reply.text : (rejection?.text ?? "");
    // Stream what there is, in a few pieces, unless cancelled part way.
    let shown = "";
    const size = Math.max(1, Math.ceil(text.length / chunks));
    for (let i = 0; i < text.length; i += size) {
      await sleep(delay);
      if (opts.signal?.aborted)
        throw { code: "cancelled", message: "The call was cancelled.", text: shown || undefined };
      const delta = text.slice(i, i + size);
      shown += delta;
      if (shown.trim()) opts.onText?.({ text: shown, delta });
    }
    await sleep(delay);
    if (opts.signal?.aborted)
      throw { code: "cancelled", message: "The call was cancelled.", text: shown || undefined };
    if (rejection) {
      const error: { code: string; message: string; text?: string } = {
        code: rejection.code,
        message: rejection.message ?? rejection.code,
      };
      if (rejection.code !== "refused" && shown) error.text = shown;
      throw error;
    }
    if (!text.trim()) throw { code: "empty_completion", message: "Claude produced no text." };
    const result: SampleResult = {
      text,
      truncated:
        typeof reply === "object" && "truncated" in reply ? Boolean(reply.truncated) : false,
      modelTierApplied:
        typeof reply === "object" && "tier" in reply && reply.tier ? reply.tier : tier,
    };
    if (verb === "sample" && opts.cache !== false) cache.set(key, result);
    return result;
  };

  const fn = ((input: SampleInput, opts?: SampleOptions) =>
    run("sample", input, opts)) as FakeSample;
  const json = async (input: SampleInput, opts?: SampleOptions) => {
    const result = await run("json", input, opts);
    const parsed = readJson(result.text);
    if (!parsed.ok || result.truncated)
      throw { code: "invalid_json", message: "The reply held no JSON value.", text: result.text };
    return parsed.value as never;
  };
  Object.assign(fn, {
    json,
    calls,
    setResponder: (r: FakeSampleResponder) => {
      responder = r;
    },
    failNext: (e: { code: string; message?: string; text?: string }) => {
      nextFailure = e;
    },
    limits: async () => ({ maxPromptBytes: MAX_PROMPT_BYTES }),
  });
  return fn;
}
