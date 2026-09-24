// Shared plumbing for every Repository implementation.
import { nowIso } from "@/lib/time";
import type { Profile } from "@/lib/types";
import { exportRepository, importIntoRepository } from "./exportImport";
import type {
  EntityStore,
  ImportMode,
  ImportSummary,
  Repository,
  RepositoryEvent,
  RepositoryKind,
  SingletonStore,
} from "./Repository";
import type { AtlasExport } from "./schemas";
import { TABLE_NAMES, type TableName, type TableTypes } from "./tables";

/** Deep copy, so callers can never mutate stored data by accident. */
export function clone<T>(value: T): T {
  return structuredClone(value);
}

/** get → merge → put, stamping updatedAt unless the caller set one. */
export async function patchRecord<T>(
  get: () => Promise<T | undefined>,
  put: (value: T) => Promise<void>,
  changes: Partial<T>,
): Promise<T | undefined> {
  const existing = await get();
  if (!existing) return undefined;
  const stamp = (changes as { updatedAt?: string }).updatedAt ?? nowIso();
  const next = { ...existing, ...changes, updatedAt: stamp } as T;
  await put(next);
  return next;
}

export abstract class BaseRepository implements Repository {
  abstract readonly kind: RepositoryKind;
  abstract readonly profile: SingletonStore<Profile>;
  abstract table<K extends TableName>(name: K): EntityStore<TableTypes[K]>;

  private listeners = new Set<(event: RepositoryEvent) => void>();

  get conceptStates() {
    return this.table("conceptStates");
  }
  get conceptNotes() {
    return this.table("conceptNotes");
  }
  get problemStates() {
    return this.table("problemStates");
  }
  get mistakeTags() {
    return this.table("mistakeTags");
  }
  get checks() {
    return this.table("checks");
  }
  get dayPlans() {
    return this.table("dayPlans");
  }
  get activity() {
    return this.table("activity");
  }
  get mocks() {
    return this.table("mocks");
  }
  get designs() {
    return this.table("designs");
  }
  get stories() {
    return this.table("stories");
  }
  get mentalMath() {
    return this.table("mentalMath");
  }
  get mapOverrides() {
    return this.table("mapOverrides");
  }
  get customConcepts() {
    return this.table("customConcepts");
  }
  get generatedDrills() {
    return this.table("generatedDrills");
  }

  exportAll(): Promise<AtlasExport> {
    return exportRepository(this);
  }

  importAll(file: unknown, mode: ImportMode): Promise<ImportSummary> {
    return importIntoRepository(this, file, mode);
  }

  async clearAll(): Promise<void> {
    await this.profile.clear();
    for (const t of TABLE_NAMES) await this.table(t).clear();
    await this.flush();
  }

  flush(): Promise<void> {
    return Promise.resolve();
  }

  watch(_table: "profile" | "dayPlans", _key: string): () => void {
    return () => {};
  }

  subscribe(listener: (event: RepositoryEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  protected emit(event: RepositoryEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error("Repository listener failed", e);
      }
    }
  }

  close(): void {
    this.listeners.clear();
  }
}
