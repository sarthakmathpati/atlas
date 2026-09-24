// F22 import: validation, previews, and merge rules (newer updatedAt wins; attempts unioned).
import { describe, expect, it } from "vitest";
import {
  backupFilename,
  emptyExportData,
  ImportError,
  mergeAttempts,
  mergeExportData,
  parseBackup,
  previewBackup,
} from "@/lib/storage/exportImport";
import { MemoryRepository } from "@/lib/storage/MemoryRepository";
import {
  applyIdAliases,
  migrateRawData,
  MigrationError,
  resolveAlias,
} from "@/lib/storage/migrations";
import { asBackup, fullFixture, makeAttempt, makeProblem, T0, T1, T2 } from "../fixtures/userData";

describe("parseBackup", () => {
  it("accepts a valid backup as text or object", () => {
    const backup = asBackup(fullFixture());
    expect(parseBackup(JSON.stringify(backup)).data.problemStates).toHaveLength(3);
    expect(parseBackup(backup).data.checks).toHaveLength(3);
  });

  it("gives friendly errors for bad files", () => {
    expect(() => parseBackup("not json")).toThrow(ImportError);
    expect(() => parseBackup("not json")).toThrow(/isn't valid JSON/);
    expect(() => parseBackup({ hello: 1 })).toThrow(/doesn't look like an Atlas backup/);
    expect(() => parseBackup({ ...asBackup(fullFixture()), app: "OtherApp" })).toThrow(
      /made by "OtherApp"/,
    );
    expect(() => parseBackup({ ...asBackup(fullFixture()), schemaVersion: 99 })).toThrow(
      /newer version/,
    );
  });

  it("points at the broken field when data is invalid", () => {
    const data = fullFixture();
    (data.problemStates[0]!.attempts[0] as unknown as { code: number }).code = 5;
    expect(() => parseBackup(asBackup(data))).toThrow(/problemStates\[0\]\.attempts\[0\]\.code/);
  });

  it("treats tables missing from older files as empty", () => {
    const backup = asBackup(fullFixture()) as unknown as { data: Record<string, unknown> };
    delete backup.data.generatedDrills;
    delete backup.data.mapOverrides;
    const parsed = parseBackup(backup);
    expect(parsed.data.generatedDrills).toEqual([]);
    expect(parsed.data.mapOverrides).toEqual([]);
  });

  it("previews counts before importing", () => {
    const preview = previewBackup(parseBackup(asBackup(fullFixture())));
    expect(preview).toMatchObject({ conceptStates: 3, problems: 3, attempts: 4, notes: 1 });
  });
});

describe("merge", () => {
  it("keeps the newer record and counts added, updated and unchanged", () => {
    const current = fullFixture();
    const incoming = fullFixture();
    incoming.mistakeTags[0] = {
      ...incoming.mistakeTags[0]!,
      label: "Off by one (renamed)",
      updatedAt: T2,
    };
    incoming.mistakeTags[1] = { ...incoming.mistakeTags[1]!, label: "Older rename", updatedAt: T0 };
    incoming.checks.push({
      id: "c9",
      conceptId: "dsa.arrays.array-basics",
      kind: "manual",
      score: 0.8,
      createdAt: T2,
      updatedAt: T2,
    });
    const { merged, summary } = mergeExportData(current, incoming);
    expect(merged.mistakeTags.find((t) => t.id === "mt-off-by-one")?.label).toBe(
      "Off by one (renamed)",
    );
    expect(merged.mistakeTags.find((t) => t.id === "mt-custom-1")?.label).toBe("Forgot modulo");
    expect(summary.tables.mistakeTags).toEqual({ added: 0, updated: 1, unchanged: 1 });
    expect(summary.tables.checks).toEqual({ added: 1, updated: 0, unchanged: 3 });
  });

  it("unions attempts by id so no attempt is lost", () => {
    const current = emptyExportData();
    const incoming = emptyExportData();
    const laptop = makeProblem("lc-1", 2, T1); // attempts a0, a1
    const phone = makeProblem("lc-1", 0, T2);
    phone.attempts = [makeAttempt("lc-1", 1), makeAttempt("lc-1", 7)]; // a1 again, plus a7
    phone.status = "attempted";
    current.problemStates = [laptop];
    incoming.problemStates = [phone];
    const { merged, summary } = mergeExportData(current, incoming);
    const ids = merged.problemStates[0]!.attempts.map((a) => a.id).sort();
    expect(ids).toEqual(["lc-1-a0", "lc-1-a1", "lc-1-a7"]);
    expect(merged.problemStates[0]!.status).toBe("solved"); // never downgraded
    expect(merged.problemStates[0]!.updatedAt).toBe(T2);
    expect(summary.attemptsAdded).toBe(1);
  });

  it("caps merged attempts at 30, keeping the newest", () => {
    const a = Array.from({ length: 20 }, (_, i) => makeAttempt("lc-1", i));
    const b = Array.from({ length: 20 }, (_, i) => makeAttempt("lc-1", i + 20));
    const { attempts, trimmed } = mergeAttempts(a, b);
    expect(attempts).toHaveLength(30);
    expect(trimmed).toBe(10);
  });

  it("unions saved answers, story practice and activity days", () => {
    const current = fullFixture();
    const incoming = fullFixture();
    incoming.conceptNotes[0] = {
      ...incoming.conceptNotes[0]!,
      savedAnswers: [{ id: "sa2", question: "Q2", answer: "A2", createdAt: T2, source: "copy" }],
      updatedAt: T2,
    };
    incoming.activity[0] = {
      month: "2026-09",
      days: { "2026-09-21": { minutes: 30, problemsSolved: 0, reviews: 3, conceptsTouched: 2 } },
      updatedAt: T2,
    };
    incoming.stories[0] = {
      ...incoming.stories[0]!,
      practice: [{ questionId: "bq-why-this-company", answer: "…", createdAt: T2 }],
      updatedAt: T2,
    };
    const { merged } = mergeExportData(current, incoming);
    expect(merged.conceptNotes[0]!.savedAnswers.map((s) => s.id)).toEqual(["sa1", "sa2"]);
    expect(Object.keys(merged.activity[0]!.days)).toEqual([
      "2026-09-01",
      "2026-09-20",
      "2026-09-21",
    ]);
    expect(merged.activity[0]!.streakFreezeUsed).toEqual(["2026-09-05"]);
    expect(merged.stories[0]!.practice).toHaveLength(2);
  });

  it("writes only what changed when merging into a repository", async () => {
    const repo = new MemoryRepository();
    await repo.importAll(asBackup(fullFixture()), "replace");
    const summary = await repo.importAll(asBackup(fullFixture()), "merge");
    for (const s of Object.values(summary.tables)) {
      expect(s.added + s.updated).toBe(0);
    }
  });
});

describe("migrations and id aliases", () => {
  it("runs migrations in order and refuses newer data", () => {
    const steps = [
      {
        from: 1,
        to: 2,
        description: "add x",
        migrate: (d: Record<string, unknown>) => ({ ...d, x: 1 }),
      },
    ];
    expect(migrateRawData({}, 1, steps)).toEqual({}); // already current (version 1)
    expect(() => migrateRawData({}, 2, steps)).toThrow(MigrationError);
  });

  it("rewrites renamed ids everywhere so progress follows the concept", () => {
    const aliases = {
      "dsa.hashing.complement-lookup": "dsa.hashing.two-sum-lookup",
      "dsa.arrays": "dsa.arrays-basics",
    };
    const { data, changed } = applyIdAliases(fullFixture(), aliases);
    expect(changed).toBeGreaterThanOrEqual(3);
    expect(data.conceptStates.map((s) => s.conceptId)).toContain("dsa.hashing.two-sum-lookup");
    expect(data.checks.find((c) => c.id === "c1")?.conceptId).toBe("dsa.hashing.two-sum-lookup");
    expect(data.customConcepts[0]!.topicId).toBe("dsa.arrays-basics");
    expect(data.problemStates.find((p) => p.custom)?.custom?.topicId).toBe("dsa.arrays-basics");
  });

  it("follows alias chains and stops on loops", () => {
    expect(resolveAlias("a", { a: "b", b: "c" })).toBe("c");
    expect(resolveAlias("a", { a: "b", b: "a" })).toMatch(/^[ab]$/);
  });
});

describe("backupFilename", () => {
  it("uses the local date", () => {
    expect(backupFilename(new Date(2026, 8, 4, 23, 30))).toBe("atlas-backup-2026-09-04.json");
  });
});
