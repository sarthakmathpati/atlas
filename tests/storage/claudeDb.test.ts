// ClaudeDbRepository against the in-memory fake of the `db` contract (BUILD_SPEC.md 4.3, 10.2).
import { describe, expect, it } from "vitest";
import { DB_LIMITS } from "@/lib/constants";
import {
  ClaudeDbRepository,
  decodeKey,
  encodeKey,
  trimProblemForDoc,
} from "@/lib/storage/ClaudeDbRepository";
import { createDefaultProfile, createConceptState } from "@/lib/storage/defaults";
import type { RepositoryEvent } from "@/lib/storage/Repository";
import { FakeClaudeDb } from "@/lib/runtime/fakeClaude";
import type { Check } from "@/lib/types";
import { asBackup, fullFixture, makeProblem, T1, T2 } from "../fixtures/userData";

const UID = "owner-1";
const open = (db: FakeClaudeDb, today = "2026-09-24") =>
  ClaudeDbRepository.open(db, UID, { debounceMs: 0, retryDelayMs: () => 0, today });
const path = (docId: string) => `data/users/${UID}/${docId}`;
const writes = (db: FakeClaudeDb) => db.calls.filter((c) => c.op === "set" || c.op === "delete");
const tick = () => new Promise((r) => setTimeout(r, 5));

describe("ClaudeDbRepository document layout", () => {
  it("aggregates records into the documented documents with kind and key", async () => {
    const db = new FakeClaudeDb();
    const repo = await open(db);
    await repo.importAll(asBackup(fullFixture()), "replace");
    await repo.flush();

    const ids = [...db.docs.keys()].map((p) => p.split("/").pop()).sort();
    expect(ids).toEqual(
      [
        "activity-2026-09",
        "checks-dsa",
        "checks-os",
        "concepts-custom",
        "concepts-dsa",
        "concepts-os",
        "customConcepts",
        "design-d1",
        "generatedDrills",
        "mapOverrides",
        "mentalMath",
        "mistakeTags",
        "mock-m1",
        "note-dsa.graph-basics.bfs",
        "plan-2026-09-20",
        "problem-custom-Xy_9-k",
        "problem-lc-1",
        "problem-lc-146",
        "profile",
        "story-s1",
      ].sort(),
    );
    for (const [p, body] of db.docs) {
      expect(p.split("/")).toHaveLength(4);
      expect(p.startsWith(`data/users/${UID}/`)).toBe(true);
      expect(body.key).toBe(p.split("/").pop());
      expect(typeof body.kind).toBe("string");
      expect(typeof body.updatedAt).toBe("string");
    }
    const concepts = db.docs.get(path("concepts-dsa"))!;
    expect(concepts.kind).toBe("concepts");
    expect(Object.keys(concepts.data as object)).toEqual(["dsa.hashing.complement-lookup"]);
  });

  it("never writes secrets or anything outside the owner's private path", async () => {
    const db = new FakeClaudeDb();
    const repo = await open(db);
    await repo.importAll(asBackup(fullFixture()), "replace");
    await repo.flush();
    for (const p of db.docs.keys()) expect(p.startsWith(`data/users/${UID}/`)).toBe(true);
    expect(JSON.stringify([...db.docs.values()])).not.toContain("anthropicApiKey");
  });

  it("loads more than one page (500) of documents of a kind", async () => {
    const db = new FakeClaudeDb();
    for (let i = 0; i < 1203; i++) {
      const p = makeProblem(`lc-${i}`, 0);
      db.externalSet(path(`problem-lc-${i}`), {
        kind: "problem",
        key: `problem-lc-${i}`,
        v: 1,
        updatedAt: p.updatedAt,
        data: p,
      });
    }
    const repo = await open(db);
    expect(await repo.problemStates.list()).toHaveLength(1203);
    const queries = db.calls.filter((c) => c.op === "query");
    expect(queries.length).toBeGreaterThanOrEqual(3 + 14); // 3 pages of problems + one per other kind
  });

  it("skips invalid records instead of crashing", async () => {
    const db = new FakeClaudeDb();
    db.externalSet(path("problem-bad"), {
      kind: "problem",
      key: "problem-bad",
      v: 1,
      updatedAt: T1,
      data: { problemId: 42 },
    });
    db.externalSet(path("problem-lc-1"), {
      kind: "problem",
      key: "problem-lc-1",
      v: 1,
      updatedAt: T1,
      data: makeProblem("lc-1", 1),
    });
    const repo = await open(db);
    const problems = await repo.problemStates.list();
    expect(problems.map((p) => p.problemId)).toEqual(["lc-1"]);
  });
});

describe("ClaudeDbRepository writes", () => {
  it("coalesces a burst of edits to one document into one write", async () => {
    const db = new FakeClaudeDb();
    const repo = await ClaudeDbRepository.open(db, UID, { debounceMs: 30, retryDelayMs: () => 0 });
    await repo.profile.put(createDefaultProfile());
    for (let i = 0; i < 10; i++) await repo.profile.patch({ name: `Sam ${i}` });
    await new Promise((r) => setTimeout(r, 80));
    await repo.flush();
    const profileWrites = writes(db).filter((c) => c.path.endsWith("/profile"));
    expect(profileWrites).toHaveLength(1);
    expect((db.docs.get(path("profile"))!.data as { name: string }).name).toBe("Sam 9");
  });

  it("does not rewrite a document whose data did not change", async () => {
    const db = new FakeClaudeDb();
    const repo = await open(db);
    const state = createConceptState("dsa.arrays.array-basics", new Date(T1));
    await repo.conceptStates.put(state);
    await repo.flush();
    const before = writes(db).length;
    await repo.conceptStates.put({ ...state });
    await repo.flush();
    expect(writes(db).length).toBe(before);
  });

  it("deletes a document when its last record is removed", async () => {
    const db = new FakeClaudeDb();
    const repo = await open(db);
    await repo.problemStates.put(makeProblem("lc-1", 1));
    await repo.flush();
    expect(db.docs.has(path("problem-lc-1"))).toBe(true);
    await repo.problemStates.delete("lc-1");
    await repo.flush();
    expect(db.docs.has(path("problem-lc-1"))).toBe(false);
  });

  it("retries once after an `unavailable` error", async () => {
    const db = new FakeClaudeDb();
    const repo = await open(db);
    db.failNext({ code: "unavailable", op: "set" });
    await repo.problemStates.put(makeProblem("lc-1", 1));
    await repo.flush();
    expect(db.docs.has(path("problem-lc-1"))).toBe(true);
  });

  it("tells the owner when synced storage is full", async () => {
    const db = new FakeClaudeDb();
    const repo = await open(db);
    const events: RepositoryEvent[] = [];
    repo.subscribe((e) => events.push(e));
    db.failNext({ code: "quota_exceeded", op: "set" });
    await repo.problemStates.put(makeProblem("lc-1", 1));
    await repo.flush();
    expect(events).toContainEqual(
      expect.objectContaining({ type: "notice", code: "quota", level: "error" }),
    );
  });

  it("switches to read-only after access is revoked", async () => {
    const db = new FakeClaudeDb();
    const repo = await open(db);
    const events: RepositoryEvent[] = [];
    repo.subscribe((e) => events.push(e));
    db.failNext({ code: "revoked", op: "set" });
    await repo.problemStates.put(makeProblem("lc-1", 1));
    await repo.flush();
    expect(events).toContainEqual(expect.objectContaining({ code: "read-only" }));
    const count = writes(db).length;
    await repo.problemStates.put(makeProblem("lc-2", 1));
    await repo.flush();
    expect(writes(db).length).toBe(count);
    expect(await repo.problemStates.get("lc-2")).toBeDefined(); // still readable this visit
  });

  it("trims old attempt code when a problem document grows past 200 KiB", async () => {
    const db = new FakeClaudeDb();
    const repo = await open(db);
    const events: RepositoryEvent[] = [];
    repo.subscribe((e) => events.push(e));
    const big = makeProblem("lc-9", 28);
    big.attempts = big.attempts.map((a) => ({ ...a, code: "x".repeat(9000) }));
    await repo.problemStates.put(big);
    await repo.flush();
    const stored = db.docs.get(path("problem-lc-9"))!;
    const size = new TextEncoder().encode(JSON.stringify(stored)).length;
    expect(size).toBeLessThanOrEqual(DB_LIMITS.maxDocBytes);
    const attempts = (stored.data as { attempts: { code: string }[] }).attempts;
    expect(attempts).toHaveLength(28);
    expect(attempts[0]!.code).toHaveLength(DB_LIMITS.trimmedCodeChars);
    expect(attempts[27]!.code).toHaveLength(9000);
    expect(events).toContainEqual(expect.objectContaining({ code: "trimmed" }));
  });

  it("keeps only the latest 400 checks per subject", async () => {
    const db = new FakeClaudeDb();
    const repo = await open(db);
    const checks: Check[] = Array.from({ length: 450 }, (_, i) => ({
      id: `c${String(i).padStart(3, "0")}`,
      conceptId: "dsa.arrays.array-basics",
      kind: "flashcard",
      score: 1,
      createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(),
      updatedAt: T1,
    }));
    await repo.checks.bulkPut(checks);
    await repo.flush();
    const doc = db.docs.get(path("checks-dsa"))!;
    const kept = Object.keys(doc.data as object);
    expect(kept).toHaveLength(DB_LIMITS.checksPerSubject);
    expect(kept).not.toContain("c000");
    expect(kept).toContain("c449");
  });

  it("prunes daily plans older than 60 days when loading", async () => {
    const db = new FakeClaudeDb();
    const plan = (date: string) => ({
      date,
      budgetMinutes: 60,
      minimumDay: false,
      items: [],
      generatedAt: T1,
      updatedAt: T1,
    });
    for (const date of ["2026-06-01", "2026-07-26", "2026-09-20"]) {
      db.externalSet(path(`plan-${date}`), {
        kind: "plan",
        key: `plan-${date}`,
        v: 1,
        updatedAt: T1,
        data: plan(date),
      });
    }
    const repo = await open(db, "2026-09-24");
    expect((await repo.dayPlans.list()).map((p) => p.date).sort()).toEqual([
      "2026-07-26",
      "2026-09-20",
    ]);
    await repo.flush();
    expect(db.docs.has(path("plan-2026-06-01"))).toBe(false);
  });

  it("shows another device's profile change live", async () => {
    const db = new FakeClaudeDb();
    const repo = await open(db);
    await repo.profile.put(createDefaultProfile(new Date(T1)));
    await repo.flush();
    const events: RepositoryEvent[] = [];
    repo.subscribe((e) => events.push(e));
    const stop = repo.watch("profile", "profile");
    await tick();
    const phoneProfile = { ...createDefaultProfile(new Date(T2)), name: "From phone" };
    db.externalSet(path("profile"), {
      kind: "profile",
      key: "profile",
      v: 1,
      updatedAt: T2,
      data: phoneProfile,
    });
    await tick();
    expect((await repo.profile.get())?.name).toBe("From phone");
    expect(events).toContainEqual({ type: "remote-change", table: "profile", keys: ["profile"] });
    stop();
  });
});

describe("helpers", () => {
  it("encodes keys with characters the store does not allow, reversibly", () => {
    expect(encodeKey("lc-1")).toBe("lc-1");
    const odd = encodeKey("custom/with space");
    expect(odd).toMatch(/^x~[0-9a-f]+$/);
    expect(decodeKey(odd)).toBe("custom/with space");
  });

  it("does not trim problems with 20 or fewer attempts", () => {
    const p = makeProblem("lc-1", 20);
    expect(trimProblemForDoc(p).trimmed).toBe(false);
  });
});
