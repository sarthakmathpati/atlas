// In-memory Repository. Used when browser storage is blocked (data lasts until the tab closes)
// and in tests. Behaves exactly like the persistent implementations.
import type { Profile } from "@/lib/types";
import { BaseRepository, clone, patchRecord } from "./base";
import type { EntityStore, SingletonStore } from "./Repository";
import { keyOf, TABLE_NAMES, type TableName, type TableTypes } from "./tables";

class MemoryStore<K extends TableName> implements EntityStore<TableTypes[K]> {
  private rows = new Map<string, TableTypes[K]>();
  constructor(private readonly tableName: K) {}

  async get(key: string) {
    const row = this.rows.get(key);
    return row ? clone(row) : undefined;
  }
  async list() {
    return [...this.rows.values()].map(clone);
  }
  async put(value: TableTypes[K]) {
    this.rows.set(keyOf(this.tableName, value), clone(value));
  }
  async bulkPut(values: TableTypes[K][]) {
    for (const v of values) await this.put(v);
  }
  patch(key: string, changes: Partial<TableTypes[K]>) {
    return patchRecord(
      () => this.get(key),
      (v) => this.put(v),
      changes,
    );
  }
  async delete(key: string) {
    this.rows.delete(key);
  }
  async clear() {
    this.rows.clear();
  }
}

class MemorySingleton<T> implements SingletonStore<T> {
  private value: T | undefined;
  async get() {
    return this.value === undefined ? undefined : clone(this.value);
  }
  async put(value: T) {
    this.value = clone(value);
  }
  patch(changes: Partial<T>) {
    return patchRecord(
      () => this.get(),
      (v) => this.put(v),
      changes,
    );
  }
  async clear() {
    this.value = undefined;
  }
}

export class MemoryRepository extends BaseRepository {
  readonly kind = "memory" as const;
  readonly profile = new MemorySingleton<Profile>();
  private readonly stores = Object.fromEntries(TABLE_NAMES.map((t) => [t, new MemoryStore(t)])) as {
    [K in TableName]: MemoryStore<K>;
  };

  table<K extends TableName>(name: K): EntityStore<TableTypes[K]> {
    return this.stores[name] as unknown as EntityStore<TableTypes[K]>;
  }
}
