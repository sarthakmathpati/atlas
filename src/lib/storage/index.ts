// Picks and prepares the Repository for the detected runtime (BUILD_SPEC.md 2.3, 2.4, 4.4).
import { MISTAKE_TAG_SEED } from "@/data/mistakeTags.seed";
import type { RuntimeInfo } from "@/lib/runtime/detect";
import type { AIMode } from "@/lib/types";
import { ClaudeDbRepository } from "./ClaudeDbRepository";
import { createDefaultProfile, seedTagsToRecords } from "./defaults";
import { DexieRepository } from "./DexieRepository";
import { applyIdAliases, CURRENT_SCHEMA_VERSION, ID_ALIASES, migrateRawData } from "./migrations";
import { MemoryRepository } from "./MemoryRepository";
import type { Repository } from "./Repository";
import { exportDataSchema } from "./schemas";

export type { Repository } from "./Repository";

export interface OpenedStorage {
  repository: Repository;
  /** Set when storage isn't the ideal one for this runtime; shown to the owner once. */
  notice?: string;
}

/**
 * artifact with db and a user id  → ClaudeDbRepository (synced across the owner's devices)
 * otherwise                       → DexieRepository (this browser)
 * browser storage blocked         → MemoryRepository (this tab only), with a warning
 */
export async function openRepository(runtime: RuntimeInfo): Promise<OpenedStorage> {
  let notice: string | undefined;
  if (runtime.db && runtime.uid) {
    try {
      return { repository: await ClaudeDbRepository.open(runtime.db, runtime.uid) };
    } catch {
      notice =
        "Couldn't load your synced data, so this visit uses this browser's storage. Reload to try syncing again.";
    }
  } else if (runtime.inClaudeFrame) {
    notice =
      "Synced storage isn't available here, so your data is saved in this browser only and won't sync across devices.";
  }
  try {
    return { repository: await DexieRepository.open(), notice };
  } catch {
    return {
      repository: new MemoryRepository(),
      notice:
        "This browser is blocking storage, so nothing will be saved after you close the tab. Export a backup before leaving.",
    };
  }
}

/**
 * Runs on every start, for every repository:
 * - first run: creates the default profile and the default mistake tags;
 * - older schema: migrates all data to the current version;
 * - renamed seed ids: rewrites them using ID_ALIASES so progress follows the concept.
 */
export async function prepareRepository(
  repo: Repository,
  now: Date = new Date(),
  firstRun: { aiMode?: AIMode } = {},
): Promise<void> {
  const profile = await repo.profile.get();
  if (!profile) {
    const fresh = createDefaultProfile(now);
    if (firstRun.aiMode) fresh.ai = { ...fresh.ai, mode: firstRun.aiMode };
    await repo.profile.put(fresh);
    if ((await repo.mistakeTags.list()).length === 0) {
      await repo.mistakeTags.bulkPut(seedTagsToRecords(MISTAKE_TAG_SEED, now));
    }
    await repo.flush();
    return;
  }
  const needsMigration = profile.schemaVersion < CURRENT_SCHEMA_VERSION;
  const hasAliases = Object.keys(ID_ALIASES).length > 0;
  if (!needsMigration && !hasAliases) return;

  const backup = await repo.exportAll();
  let raw = backup.data as unknown as Record<string, unknown>;
  if (needsMigration) raw = migrateRawData(raw, profile.schemaVersion);
  const parsed = exportDataSchema.parse(raw);
  const { data, changed } = applyIdAliases(parsed);
  if (!needsMigration && changed === 0) return;
  if (data.profile) data.profile = { ...data.profile, schemaVersion: CURRENT_SCHEMA_VERSION };
  await repo.importAll({ ...backup, schemaVersion: CURRENT_SCHEMA_VERSION, data }, "replace");
}
