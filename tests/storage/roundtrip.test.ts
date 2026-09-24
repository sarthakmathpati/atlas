// F22 "done when": export then import into a fresh browser reproduces identical state.
import "fake-indexeddb/auto";
import { describe, expect, it } from "vitest";
import { ClaudeDbRepository } from "@/lib/storage/ClaudeDbRepository";
import { DexieRepository, SecretsStore } from "@/lib/storage/DexieRepository";
import { emptyExportData, stableStringify } from "@/lib/storage/exportImport";
import { MemoryRepository } from "@/lib/storage/MemoryRepository";
import type { Repository } from "@/lib/storage/Repository";
import type { ExportData } from "@/lib/storage/schemas";
import { keyOf, TABLE_NAMES } from "@/lib/storage/tables";
import { FakeClaudeDb } from "@/lib/runtime/fakeClaude";
import { asBackup, fullFixture } from "../fixtures/userData";

let dbCounter = 0;
const freshDexie = () => DexieRepository.open(`atlas-test-${++dbCounter}`);
const freshClaude = (db = new FakeClaudeDb(), uid = "owner-1") =>
  ClaudeDbRepository.open(db, uid, { debounceMs: 0, retryDelayMs: () => 0, today: "2026-09-24" });

/** Sorts every table by key, like an export does. */
function sorted(data: ExportData): ExportData {
  const out = emptyExportData();
  out.profile = data.profile;
  for (const t of TABLE_NAMES) {
    (out as Record<string, unknown>)[t] = [...data[t]].sort((a, b) =>
      keyOf(t, a as never) < keyOf(t, b as never) ? -1 : 1,
    );
  }
  return out;
}

const same = (a: unknown, b: unknown) => expect(stableStringify(a)).toBe(stableStringify(b));

async function roundTrip(
  makeSource: () => Promise<Repository>,
  makeTarget: () => Promise<Repository>,
) {
  const fixture = fullFixture();
  const source = await makeSource();
  await source.importAll(asBackup(fixture), "replace");
  const first = await source.exportAll();
  same(first.data, sorted(fixture));

  const target = await makeTarget();
  await target.importAll(JSON.stringify(first), "replace");
  const second = await target.exportAll();
  same(second.data, first.data);
  expect(second.app).toBe("Atlas");
  expect(second.schemaVersion).toBe(1);
  source.close();
  target.close();
}

describe("export → import round trip", () => {
  it("reproduces identical state in IndexedDB (Dexie)", async () => {
    await roundTrip(freshDexie, freshDexie);
  });

  it("reproduces identical state in the claude.ai db store", async () => {
    await roundTrip(
      () => freshClaude(),
      () => freshClaude(),
    );
  });

  it("reproduces identical state in memory", async () => {
    await roundTrip(
      async () => new MemoryRepository(),
      async () => new MemoryRepository(),
    );
  });

  it("moves data between runtimes (Dexie → claude.ai db → Dexie)", async () => {
    await roundTrip(freshDexie, () => freshClaude());
    await roundTrip(() => freshClaude(), freshDexie);
  });

  it("keeps everything after a reload of the claude.ai store (another device)", async () => {
    const db = new FakeClaudeDb();
    const laptop = await freshClaude(db);
    await laptop.importAll(asBackup(fullFixture()), "replace");
    await laptop.flush();
    const phone = await freshClaude(db);
    same((await phone.exportAll()).data, (await laptop.exportAll()).data);
  });

  it("never exports the API key", async () => {
    const name = `atlas-test-${++dbCounter}`;
    const repo = await DexieRepository.open(name);
    const secrets = await SecretsStore.open(name);
    await secrets!.set({ anthropicApiKey: "sk-ant-secret-123" });
    await repo.importAll(asBackup(fullFixture()), "replace");
    const text = JSON.stringify(await repo.exportAll());
    expect(text).not.toContain("sk-ant-secret-123");
    expect(text).not.toContain("anthropicApiKey");
    expect((await secrets!.get()).anthropicApiKey).toBe("sk-ant-secret-123");
    repo.close();
  });

  it("replace clears data that is not in the backup", async () => {
    const repo = await freshDexie();
    await repo.importAll(asBackup(fullFixture()), "replace");
    const small = emptyExportData();
    small.profile = fullFixture().profile;
    await repo.importAll(asBackup(small), "replace");
    const out = await repo.exportAll();
    expect(out.data.problemStates).toHaveLength(0);
    expect(out.data.checks).toHaveLength(0);
    expect(out.data.profile?.name).toBe("Sam");
    repo.close();
  });
});
