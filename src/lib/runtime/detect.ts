// Runtime detection (BUILD_SPEC.md 2.3). The app renders first, then calls this.
//
// - No `window.claude.use`: the standalone web app (GitHub Pages or local dev).
// - Inside a published claude.ai artifact: ask for each capability. `use()` resolves null when a
//   capability is unavailable, which can take up to about 10 seconds.
// Storage and AI are chosen independently: `sample` is used whenever it exists, even if storage
// had to fall back to IndexedDB because `db` or the user id is missing.
import {
  getClaudeEntry,
  type ClaudeDb,
  type ClaudeDownloads,
  type ClaudeEntry,
  type ClaudeSample,
  type ClaudeUser,
} from "./claude";

export interface RuntimeInfo {
  /** "artifact" only when synced storage works (db capability AND a user id). */
  kind: "standalone" | "artifact";
  /** True when the page runs inside a claude.ai artifact frame at all. */
  inClaudeFrame: boolean;
  sample: ClaudeSample | null;
  db: ClaudeDb | null;
  uid: string | null;
  downloads: ClaudeDownloads | null;
  user: ClaudeUser | null;
}

export const STANDALONE_RUNTIME: RuntimeInfo = {
  kind: "standalone",
  inClaudeFrame: false,
  sample: null,
  db: null,
  uid: null,
  downloads: null,
  user: null,
};

/** Safety net on top of the platform's own 10 second null. */
const USE_TIMEOUT_MS = 12_000;

async function requestCapability<K extends "sample" | "db" | "user" | "downloads">(
  entry: ClaudeEntry,
  name: K,
  timeoutMs: number,
) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const timeout = new Promise<null>((resolve) => {
      timer = setTimeout(() => resolve(null), timeoutMs);
    });
    return await Promise.race([entry.use(name), timeout]);
  } catch {
    return null;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export async function detectRuntime(
  entry: ClaudeEntry | null = getClaudeEntry(),
  timeoutMs: number = USE_TIMEOUT_MS,
): Promise<RuntimeInfo> {
  if (!entry) return STANDALONE_RUNTIME;
  const [sample, db, user, downloads] = await Promise.all([
    requestCapability(entry, "sample", timeoutMs),
    requestCapability(entry, "db", timeoutMs),
    requestCapability(entry, "user", timeoutMs),
    requestCapability(entry, "downloads", timeoutMs),
  ]);
  let uid: string | null = null;
  if (user) {
    try {
      uid = await user.id();
    } catch {
      uid = null;
    }
  }
  return {
    kind: db && uid ? "artifact" : "standalone",
    inClaudeFrame: true,
    sample,
    db,
    uid,
    downloads,
    user,
  };
}
