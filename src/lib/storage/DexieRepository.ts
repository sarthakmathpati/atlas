// IndexedDB Repository (Dexie) for the standalone web app (BUILD_SPEC.md 4.3).
// One table per entity. Data lives in this browser only; export and import move it elsewhere.
// Every IndexedDB call is wrapped so a storage failure becomes a friendly StorageError.
import Dexie, { type Table } from "dexie";
import type { Profile, Secrets } from "@/lib/types";
import { BaseRepository, patchRecord } from "./base";
import { StorageError, type EntityStore, type SingletonStore } from "./Repository";
import { TABLE_NAMES, type TableName, type TableTypes } from "./tables";

export const DEXIE_DB_NAME = "atlas";
const PROFILE_KEY = "profile";
const SECRETS_KEY = "secrets";

type DexieTables = { [K in TableName]: Table<TableTypes[K], string> };

export class AtlasDexie extends Dexie {
  profile!: Table<Profile, string>;
  secrets!: Table<Secrets, string>;

  constructor(name: string = DEXIE_DB_NAME) {
    super(name);
    this.version(1).stores({
      profile: "", // one record under the outbound key "profile"
      secrets: "", // one record under "secrets"; never exported
      conceptStates: "conceptId",
      conceptNotes: "conceptId",
      problemStates: "problemId",
      mistakeTags: "id",
      checks: "id, conceptId, createdAt",
      dayPlans: "date",
      activity: "month",
      mocks: "id",
      designs: "id",
      stories: "id",
      mentalMath: "id",
      mapOverrides: "nodeId",
      customConcepts: "id",
      generatedDrills: "id",
    });
  }

  entityTable<K extends TableName>(name: K): DexieTables[K] {
    return this.table(name) as DexieTables[K];
  }
}

function friendlyMessage(e: unknown): string {
  const name = (e as { name?: string; inner?: { name?: string } })?.name ?? "";
  const inner = (e as { inner?: { name?: string } })?.inner?.name ?? "";
  if (name === "QuotaExceededError" || inner === "QuotaExceededError") {
    return "This browser's storage is full. Export a backup, then free some space.";
  }
  return "Couldn't reach this browser's storage. Your latest change may not be saved.";
}

async function guard<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    throw new StorageError(friendlyMessage(e), e);
  }
}

class DexieStore<K extends TableName> implements EntityStore<TableTypes[K]> {
  constructor(
    private readonly db: AtlasDexie,
    private readonly name: K,
  ) {}
  private get t() {
    return this.db.entityTable(this.name);
  }
  get(key: string) {
    return guard(() => this.t.get(key));
  }
  list() {
    return guard(() => this.t.toArray());
  }
  put(value: TableTypes[K]) {
    return guard(async () => {
      await this.t.put(value);
    });
  }
  bulkPut(values: TableTypes[K][]) {
    return guard(async () => {
      if (values.length) await this.t.bulkPut(values);
    });
  }
  patch(key: string, changes: Partial<TableTypes[K]>) {
    return guard(() =>
      this.db.transaction("rw", this.t, () =>
        patchRecord(
          () => this.t.get(key),
          async (v) => {
            await this.t.put(v);
          },
          changes,
        ),
      ),
    );
  }
  delete(key: string) {
    return guard(() => this.t.delete(key));
  }
  clear() {
    return guard(() => this.t.clear());
  }
}

class DexieSingleton<T> implements SingletonStore<T> {
  constructor(
    private readonly table: Table<T, string>,
    private readonly key: string,
  ) {}
  get() {
    return guard(() => this.table.get(this.key));
  }
  put(value: T) {
    return guard(async () => {
      await this.table.put(value, this.key);
    });
  }
  patch(changes: Partial<T>) {
    return guard(() =>
      patchRecord(
        () => this.table.get(this.key),
        async (v) => {
          await this.table.put(v, this.key);
        },
        changes,
      ),
    );
  }
  clear() {
    return guard(() => this.table.delete(this.key));
  }
}

export class DexieRepository extends BaseRepository {
  readonly kind = "dexie" as const;
  readonly profile: SingletonStore<Profile>;
  private readonly stores: { [K in TableName]: DexieStore<K> };

  private constructor(private readonly db: AtlasDexie) {
    super();
    this.profile = new DexieSingleton(db.profile, PROFILE_KEY);
    this.stores = Object.fromEntries(TABLE_NAMES.map((t) => [t, new DexieStore(db, t)])) as {
      [K in TableName]: DexieStore<K>;
    };
  }

  /** Opens (and creates on first use) the IndexedDB database. Throws StorageError if blocked. */
  static async open(name: string = DEXIE_DB_NAME): Promise<DexieRepository> {
    const db = new AtlasDexie(name);
    await guard(() => db.open());
    return new DexieRepository(db);
  }

  table<K extends TableName>(name: K): EntityStore<TableTypes[K]> {
    return this.stores[name] as unknown as EntityStore<TableTypes[K]>;
  }

  override close(): void {
    super.close();
    this.db.close();
  }
}

/** The owner's API key lives here only: this browser's IndexedDB, never exported or synced. */
export class SecretsStore {
  private constructor(private readonly db: AtlasDexie) {}

  static async open(name: string = DEXIE_DB_NAME): Promise<SecretsStore | null> {
    try {
      const db = new AtlasDexie(name);
      await db.open();
      return new SecretsStore(db);
    } catch {
      return null;
    }
  }

  async get(): Promise<Secrets> {
    try {
      return (await this.db.secrets.get(SECRETS_KEY)) ?? {};
    } catch {
      return {};
    }
  }

  async set(secrets: Secrets): Promise<void> {
    await guard(async () => {
      await this.db.secrets.put(secrets, SECRETS_KEY);
    });
  }

  async clear(): Promise<void> {
    await guard(() => this.db.secrets.delete(SECRETS_KEY));
  }
}
