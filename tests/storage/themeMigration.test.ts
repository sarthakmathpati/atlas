// Data version 2 (Phase 9): the theme choice becomes Day, Dusk, Night, System or By time of day.
// Stored and imported data from version 1 is migrated: light → Day, dark → Night, and the
// profile gains the default start times.
import { describe, expect, it } from "vitest";
import { DEFAULT_THEME_SCHEDULE, SCHEMA_VERSION } from "@/lib/constants";
import { prepareRepository } from "@/lib/storage";
import { parseBackup } from "@/lib/storage/exportImport";
import { MemoryRepository } from "@/lib/storage/MemoryRepository";
import { migrateRawData } from "@/lib/storage/migrations";
import type { ExportData } from "@/lib/storage/schemas";
import type { Profile } from "@/lib/types";
import { asBackup, fullFixture } from "../fixtures/userData";

/** A backup as Phase 8 wrote it: schema 1, light or dark, no schedule. */
function versionOne(theme: string): { data: ExportData; raw: Record<string, unknown> } {
  const data = fullFixture();
  const { themeSchedule: _dropped, ...prefs } = data.profile!.prefs;
  const raw = {
    ...data,
    profile: { ...data.profile!, theme, prefs, schemaVersion: 1 },
  } as unknown as Record<string, unknown>;
  return { data, raw };
}

describe("theme migration (schema 1 → 2)", () => {
  it("turns light into Day and dark into Night and adds the default start times", () => {
    for (const [before, after] of [
      ["light", "day"],
      ["dark", "night"],
      ["system", "system"],
    ] as const) {
      const migrated = migrateRawData(versionOne(before).raw, 1) as { profile: Profile };
      expect(migrated.profile.theme).toBe(after);
      expect(migrated.profile.prefs.themeSchedule).toEqual(DEFAULT_THEME_SCHEDULE);
    }
  });

  it("imports a version 1 backup", () => {
    const { raw } = versionOne("dark");
    const backup = { ...asBackup(fullFixture()), schemaVersion: 1, data: raw };
    const parsed = parseBackup(JSON.stringify(backup));
    expect(parsed.schemaVersion).toBe(SCHEMA_VERSION);
    expect(parsed.data.profile?.theme).toBe("night");
    expect(parsed.data.profile?.prefs.themeSchedule).toEqual(DEFAULT_THEME_SCHEDULE);
  });

  it("migrates data already stored in the browser when the app starts", async () => {
    const repo = new MemoryRepository();
    const { data } = versionOne("light");
    await repo.importAll(asBackup(data), "replace");
    const { themeSchedule: _dropped, ...prefs } = data.profile!.prefs;
    await repo.profile.put({
      ...data.profile!,
      theme: "light",
      prefs,
      schemaVersion: 1,
    } as unknown as Profile);
    await prepareRepository(repo);
    const profile = await repo.profile.get();
    expect(profile?.theme).toBe("day");
    expect(profile?.prefs.themeSchedule).toEqual(DEFAULT_THEME_SCHEDULE);
    expect(profile?.schemaVersion).toBe(SCHEMA_VERSION);
    expect(profile?.name).toBe("Sam");
  });
});
