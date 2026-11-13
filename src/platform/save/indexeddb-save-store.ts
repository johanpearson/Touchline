import type { SaveEnvelope, SaveStore } from "../../shared";

const STORE_NAME = "saves";
const DB_VERSION = 1;
const DEFAULT_DB_NAME = "touchline";

function describeError(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

function openDatabase(factory: IDBFactory, dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const fail = (reason: string) =>
      reject(new Error(`Could not open the save database: ${reason}`));
    try {
      const request = factory.open(dbName, DB_VERSION);
      request.onupgradeneeded = () => {
        request.result.createObjectStore(STORE_NAME);
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => fail(describeError(request.error));
      request.onblocked = () => fail("opening was blocked by another connection");
    } catch (cause) {
      fail(describeError(cause));
    }
  });
}

/** Runs one request in its own transaction and resolves with its result once the transaction completed. */
async function run<T>(
  factory: IDBFactory,
  dbName: string,
  mode: IDBTransactionMode,
  failure: string,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase(factory, dbName);
  try {
    return await new Promise<T>((resolve, reject) => {
      const fail = (cause: unknown) => reject(new Error(`${failure}: ${describeError(cause)}`));
      try {
        const tx = db.transaction(STORE_NAME, mode);
        const request = action(tx.objectStore(STORE_NAME));
        request.onerror = () => fail(request.error);
        tx.onabort = () => fail(tx.error ?? "transaction aborted");
        tx.oncomplete = () => resolve(request.result);
      } catch (cause) {
        fail(cause);
      }
    });
  } finally {
    db.close();
  }
}

/** True when an IndexedDB database can be opened. Never throws. */
export async function isIndexedDbAvailable(
  factory: IDBFactory | null | undefined = globalThis.indexedDB,
): Promise<boolean> {
  if (!factory) return false;
  try {
    (await openDatabase(factory, DEFAULT_DB_NAME)).close();
    return true;
  } catch {
    return false;
  }
}

/**
 * Browser `SaveStore` backed by IndexedDB: one object store `saves` keyed by save id.
 * The `indexedDB` global is only read when the function is called, never at import time.
 */
export function createIndexedDbSaveStore(
  factory: IDBFactory = globalThis.indexedDB,
  dbName: string = DEFAULT_DB_NAME,
): SaveStore {
  return {
    list: async () => {
      const keys = await run(factory, dbName, "readonly", "Could not list saves", (s) =>
        s.getAllKeys(),
      );
      return keys.map(String).sort();
    },
    load: async (id) => {
      const found = await run<SaveEnvelope | undefined>(
        factory,
        dbName,
        "readonly",
        `Could not read save "${id}"`,
        (s) => s.get(id),
      );
      return found ?? null;
    },
    save: async (id, data) => {
      await run(factory, dbName, "readwrite", `Could not write save "${id}"`, (s) =>
        s.put(data, id),
      );
    },
    delete: async (id) => {
      await run(factory, dbName, "readwrite", `Could not delete save "${id}"`, (s) => s.delete(id));
    },
  };
}
