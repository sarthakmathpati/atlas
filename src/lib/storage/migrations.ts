// Schema versioning (BUILD_SPEC.md 4.4).
//
// - Profile.schemaVersion starts at 1. When a stored shape changes, bump SCHEMA_VERSION in
//   lib/constants.ts and add a migration here that turns version N data into version N + 1.
//   Migrations run on load (both repositories) and on import, before validation.
// - If the seed syllabus ever renames an id, add `oldId: newId` to ID_ALIASES so the owner's
//   progress follows the concept, topic or subject. Aliases are applied on load and on import.
import { SCHEMA_VERSION } from "@/lib/constants";
import type { ExportData } from "./schemas";

export const CURRENT_SCHEMA_VERSION = SCHEMA_VERSION;

type RawData = Record<string, unknown>;

export interface Migration {
  from: number;
  to: number;
  description: string;
  migrate(data: RawData): RawData;
}

/** Ordered list of migrations. Empty while the schema is at version 1. */
export const MIGRATIONS: Migration[] = [];

/** Renamed seed ids: old id -> new id (concepts, topics or subjects). */
export const ID_ALIASES: Readonly<Record<string, string>> = {};

export class MigrationError extends Error {}

/** Runs every migration from `fromVersion` up to the current version. */
export function migrateRawData(
  data: RawData,
  fromVersion: number,
  migrations = MIGRATIONS,
): RawData {
  if (fromVersion > CURRENT_SCHEMA_VERSION) {
    throw new MigrationError(
      `This data comes from a newer version of the app (schema ${fromVersion}; this app understands up to ${CURRENT_SCHEMA_VERSION}). Update the app first.`,
    );
  }
  let version = fromVersion;
  let current = data;
  while (version < CURRENT_SCHEMA_VERSION) {
    const step = migrations.find((m) => m.from === version);
    if (!step) throw new MigrationError(`No migration from schema version ${version}.`);
    current = step.migrate(current);
    version = step.to;
  }
  return current;
}

/** Follows alias chains (a -> b -> c) with a hop limit, so a bad alias loop cannot hang. */
export function resolveAlias(
  id: string,
  aliases: Readonly<Record<string, string>> = ID_ALIASES,
): string {
  let current = id;
  for (let hops = 0; hops < 8; hops++) {
    const next = aliases[current];
    if (!next || next === current) return current;
    current = next;
  }
  return current;
}

/** Returns a copy of `data` with every aliased id replaced. `changed` counts rewritten ids. */
export function applyIdAliases(
  data: ExportData,
  aliases: Readonly<Record<string, string>> = ID_ALIASES,
): { data: ExportData; changed: number } {
  if (Object.keys(aliases).length === 0) return { data, changed: 0 };
  let changed = 0;
  const fix = (id: string): string => {
    const next = resolveAlias(id, aliases);
    if (next !== id) changed++;
    return next;
  };
  const newer = <T extends { updatedAt: string }>(a: T, b: T) =>
    b.updatedAt > a.updatedAt ? b : a;
  const dedupe = <T extends { updatedAt: string }>(items: T[], key: (t: T) => string): T[] => {
    const byKey = new Map<string, T>();
    for (const item of items) {
      const k = key(item);
      const existing = byKey.get(k);
      byKey.set(k, existing ? newer(existing, item) : item);
    }
    return [...byKey.values()];
  };

  const out: ExportData = {
    ...data,
    profile: data.profile
      ? { ...data.profile, focusSubjects: data.profile.focusSubjects.map(fix) }
      : null,
    conceptStates: dedupe(
      data.conceptStates.map((s) => ({ ...s, conceptId: fix(s.conceptId) })),
      (s) => s.conceptId,
    ),
    conceptNotes: dedupe(
      data.conceptNotes.map((n) => ({ ...n, conceptId: fix(n.conceptId) })),
      (n) => n.conceptId,
    ),
    checks: data.checks.map((c) => ({ ...c, conceptId: fix(c.conceptId) })),
    problemStates: data.problemStates.map((p) =>
      p.custom
        ? {
            ...p,
            custom: {
              ...p.custom,
              topicId: p.custom.topicId ? fix(p.custom.topicId) : undefined,
              conceptIds: p.custom.conceptIds.map(fix),
            },
          }
        : p,
    ),
    customConcepts: data.customConcepts.map((c) => ({ ...c, topicId: fix(c.topicId) })),
    mapOverrides: dedupe(
      data.mapOverrides.map((m) => ({ ...m, nodeId: fix(m.nodeId) })),
      (m) => m.nodeId,
    ),
    dayPlans: data.dayPlans.map((plan) => ({
      ...plan,
      items: plan.items.map((item) => ({
        ...item,
        refId: item.refId ? fix(item.refId) : undefined,
        refIds: item.refIds?.map(fix),
      })),
    })),
    generatedDrills: data.generatedDrills.map((d) => ({
      ...d,
      answerConceptIds: d.answerConceptIds.map(fix),
    })),
  };
  return { data: out, changed };
}
