import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { MISTAKE_TAG_SEED } from "@/data/mistakeTags.seed";
import {
  ClaudeDownloadsSaver,
  chooseFileSaver,
  DialogFileSaver,
  BrowserFileSaver,
} from "@/lib/files/FileSaver";
import { detectRuntime, STANDALONE_RUNTIME } from "@/lib/runtime/detect";
import { createFakeClaude, FakeClaudeDb, FakeClaudeDownloads } from "@/lib/runtime/fakeClaude";
import type { ClaudeEntry } from "@/lib/runtime/claude";
import { openRepository, prepareRepository } from "@/lib/storage";
import { MemoryRepository } from "@/lib/storage/MemoryRepository";

describe("detectRuntime", () => {
  it("is standalone when there is no window.claude", async () => {
    expect(await detectRuntime(null)).toEqual(STANDALONE_RUNTIME);
  });

  it("is the artifact runtime when db and a user id are available", async () => {
    const db = new FakeClaudeDb();
    const info = await detectRuntime(createFakeClaude({ db, uid: "u1" }));
    expect(info.kind).toBe("artifact");
    expect(info.uid).toBe("u1");
    expect(info.db).toBe(db);
  });

  it("falls back to standalone storage when the user id is missing, but still reports the frame", async () => {
    const info = await detectRuntime(createFakeClaude({ db: new FakeClaudeDb(), uid: null }));
    expect(info.kind).toBe("standalone");
    expect(info.inClaudeFrame).toBe(true);
  });

  it("keeps `sample` even when storage fell back", async () => {
    const sample = Object.assign(
      async () => ({ text: "hi", truncated: false, modelTierApplied: "default" as const }),
      {
        json: async <T>() => ({}) as T,
      },
    );
    const info = await detectRuntime(createFakeClaude({ db: null, sample }));
    expect(info.kind).toBe("standalone");
    expect(info.sample).toBe(sample);
  });

  it("treats a capability that never answers as missing", async () => {
    const hanging: ClaudeEntry = { use: () => new Promise(() => {}) };
    const info = await detectRuntime(hanging, 20);
    expect(info).toMatchObject({ kind: "standalone", inClaudeFrame: true, db: null, sample: null });
  });

  it("treats a capability that throws as missing", async () => {
    const broken: ClaudeEntry = { use: () => Promise.reject(new Error("boom")) };
    const info = await detectRuntime(broken);
    expect(info.kind).toBe("standalone");
  });
});

describe("FakeClaudeDb follows the db contract", () => {
  it("throws TypeError for bad paths", () => {
    const db = new FakeClaudeDb();
    expect(() => db.doc("data/users/u1")).toThrow(TypeError); // 3 segments = a collection
    expect(() => db.collection("data/users/u1/profile")).toThrow(TypeError);
    expect(() => db.doc("data/users/u1/has space")).toThrow(TypeError);
    expect(() => db.doc("data/users/u1/..")).toThrow(TypeError);
  });

  it("rejects documents over 256 KiB and non-object bodies", async () => {
    const db = new FakeClaudeDb();
    const ref = db.doc("data/users/u1/big");
    await expect(ref.set({ blob: "x".repeat(300 * 1024) })).rejects.toMatchObject({
      code: "invalid_argument",
    });
    await expect(ref.set([] as unknown as Record<string, unknown>)).rejects.toMatchObject({
      code: "invalid_argument",
    });
  });

  it("enforces the document cap with quota_exceeded", async () => {
    const db = new FakeClaudeDb();
    db.maxDocuments = 2;
    await db.doc("c/a").set({ n: 1 });
    await db.doc("c/b").set({ n: 2 });
    await expect(db.doc("c/c").set({ n: 3 })).rejects.toMatchObject({ code: "quota_exceeded" });
    await db.doc("c/a").set({ n: 4 }); // existing documents can still be written
  });

  it("filters, orders and limits queries", async () => {
    const db = new FakeClaudeDb();
    for (const [id, kind] of [
      ["b", "x"],
      ["a", "x"],
      ["c", "y"],
      ["d", "x"],
    ] as const) {
      await db.doc(`col/${id}`).set({ kind, key: id });
    }
    const snap = await db
      .collection("col")
      .where("kind", "==", "x")
      .where("key", ">", "a")
      .orderBy("key")
      .limit(5)
      .get();
    expect(snap.docs.map((d) => d.id)).toEqual(["b", "d"]);
  });
});

describe("FileSaver", () => {
  it("picks the right saver for each runtime", () => {
    expect(chooseFileSaver(STANDALONE_RUNTIME)).toBeInstanceOf(BrowserFileSaver);
    expect(chooseFileSaver({ ...STANDALONE_RUNTIME, inClaudeFrame: true })).toBeInstanceOf(
      DialogFileSaver,
    );
    expect(
      chooseFileSaver({
        ...STANDALONE_RUNTIME,
        inClaudeFrame: true,
        downloads: new FakeClaudeDownloads(),
      }),
    ).toBeInstanceOf(ClaudeDownloadsSaver);
  });

  it("treats a declined save prompt as a normal outcome", async () => {
    const downloads = new FakeClaudeDownloads();
    const saver = new ClaudeDownloadsSaver(downloads);
    expect(await saver.save({ filename: "a.json", data: "{}", mime: "application/json" })).toEqual({
      status: "saved",
    });
    downloads.declineNext = true;
    expect(await saver.save({ filename: "a.json", data: "{}", mime: "application/json" })).toEqual({
      status: "declined",
    });
    expect(downloads.saved).toHaveLength(1);
  });

  it("explains when no dialog is available", async () => {
    const result = await new DialogFileSaver().save({
      filename: "a.md",
      data: "# hi",
      mime: "text/markdown",
    });
    expect(result.status).toBe("failed");
  });
});

describe("storage selection and first run", () => {
  it("uses synced storage in the artifact runtime and IndexedDB elsewhere", async () => {
    const artifact = await openRepository({
      ...STANDALONE_RUNTIME,
      kind: "artifact",
      inClaudeFrame: true,
      db: new FakeClaudeDb(),
      uid: "u1",
    });
    expect(artifact.repository.kind).toBe("claude-db");
    expect(artifact.notice).toBeUndefined();
    const standalone = await openRepository(STANDALONE_RUNTIME);
    expect(standalone.repository.kind).toBe("dexie");
  });

  it("tells the owner when an artifact view can't sync", async () => {
    const opened = await openRepository({ ...STANDALONE_RUNTIME, inClaudeFrame: true });
    expect(opened.repository.kind).toBe("dexie");
    expect(opened.notice).toMatch(/won't sync/);
  });

  it("creates the default profile and mistake tags on first run, once", async () => {
    const repo = new MemoryRepository();
    await prepareRepository(repo);
    const profile = await repo.profile.get();
    expect(profile).toMatchObject({
      onboardingDone: false,
      dailyMinutes: 90,
      balance: { problems: 60, theory: 40 },
      schemaVersion: 1,
    });
    expect(await repo.mistakeTags.list()).toHaveLength(MISTAKE_TAG_SEED.length);
    await repo.profile.patch({ name: "Sam" });
    await prepareRepository(repo);
    expect((await repo.profile.get())?.name).toBe("Sam");
  });
});
