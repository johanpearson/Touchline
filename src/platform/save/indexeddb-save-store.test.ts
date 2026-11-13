import { IDBFactory } from "fake-indexeddb";
import { describe, expect, it } from "vitest";
import type { SaveEnvelope } from "../../shared";
import { createIndexedDbSaveStore, isIndexedDbAvailable } from "./indexeddb-save-store";
import { runSaveStoreContract } from "./save-store-contract";

const envelope: SaveEnvelope = {
  schemaVersion: 1,
  createdAt: "2030-01-01T00:00:00.000Z",
  game: { week: 1 },
};

runSaveStoreContract("indexeddb save store", () => createIndexedDbSaveStore(new IDBFactory()));

describe("indexeddb save store", () => {
  it("keeps saves between store instances on the same factory and database name", async () => {
    const factory = new IDBFactory();
    await createIndexedDbSaveStore(factory).save("a", envelope);
    expect(await createIndexedDbSaveStore(factory).load("a")).toEqual(envelope);
  });

  it("keeps different database names separate", async () => {
    const factory = new IDBFactory();
    await createIndexedDbSaveStore(factory, "one").save("a", envelope);
    expect(await createIndexedDbSaveStore(factory, "two").list()).toEqual([]);
  });

  it("creates a version 1 database with one object store named saves", async () => {
    const factory = new IDBFactory();
    await createIndexedDbSaveStore(factory, "touchline-check").save("a", envelope);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open("touchline-check");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    expect(db.version).toBe(1);
    expect([...db.objectStoreNames]).toEqual(["saves"]);
    db.close();
  });

  it("rejects with a clear error when opening the database throws", async () => {
    const factory = {
      open: () => {
        throw new Error("denied");
      },
    } as unknown as IDBFactory;
    await expect(createIndexedDbSaveStore(factory).list()).rejects.toThrow(
      /could not open the save database.*denied/i,
    );
  });

  it("rejects with a clear error when opening the database fails", async () => {
    const factory = failingOpenFactory("error");
    await expect(createIndexedDbSaveStore(factory).load("a")).rejects.toThrow(
      /could not open the save database/i,
    );
  });

  it("rejects instead of hanging when opening the database is blocked", async () => {
    const factory = failingOpenFactory("blocked");
    await expect(createIndexedDbSaveStore(factory).list()).rejects.toThrow(/blocked/i);
  });

  it("rejects with a clear error when a write fails", async () => {
    const factory = new IDBFactory();
    const store = createIndexedDbSaveStore(factory);
    const unclonable = { ...envelope, game: () => undefined };
    await expect(store.save("a", unclonable)).rejects.toThrow(/could not write save "a"/i);
  });

  it("rejects with a clear error when a transaction aborts", async () => {
    const store = createIndexedDbSaveStore(abortingFactory());
    await expect(store.save("a", envelope)).rejects.toThrow(/could not write save "a"/i);
  });

  it("rejects with a clear error when a read request fails", async () => {
    const store = createIndexedDbSaveStore(erroringRequestFactory());
    await expect(store.load("a")).rejects.toThrow(/could not read save "a"/i);
    await expect(store.list()).rejects.toThrow(/could not list saves/i);
    await expect(store.delete("a")).rejects.toThrow(/could not delete save "a"/i);
  });
});

describe("isIndexedDbAvailable", () => {
  it("is true for a working factory", async () => {
    expect(await isIndexedDbAvailable(new IDBFactory())).toBe(true);
  });

  it("is false when no factory exists", async () => {
    expect(await isIndexedDbAvailable(null)).toBe(false);
  });

  it("is false when opening throws", async () => {
    const factory = {
      open: () => {
        throw new Error("blocked by policy");
      },
    } as unknown as IDBFactory;
    expect(await isIndexedDbAvailable(factory)).toBe(false);
  });

  it("is false when opening fails asynchronously", async () => {
    expect(await isIndexedDbAvailable(failingOpenFactory("error"))).toBe(false);
  });

  it("is false when opening is blocked", async () => {
    expect(await isIndexedDbAvailable(failingOpenFactory("blocked"))).toBe(false);
  });

  it("is false when the global indexedDB is missing", async () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "indexedDB");
    Reflect.deleteProperty(globalThis, "indexedDB");
    try {
      expect(await isIndexedDbAvailable()).toBe(false);
    } finally {
      if (original) Object.defineProperty(globalThis, "indexedDB", original);
    }
  });
});

type FakeRequest = {
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
  onblocked: (() => void) | null;
  onupgradeneeded: (() => void) | null;
  error: Error | null;
  result: unknown;
};

function aFakeRequest(): FakeRequest {
  return {
    onsuccess: null,
    onerror: null,
    onblocked: null,
    onupgradeneeded: null,
    error: new Error("boom"),
    result: undefined,
  };
}

function failingOpenFactory(mode: "error" | "blocked"): IDBFactory {
  return {
    open: () => {
      const request = aFakeRequest();
      queueMicrotask(() => (mode === "error" ? request.onerror?.() : request.onblocked?.()));
      return request;
    },
  } as unknown as IDBFactory;
}

function fakeDatabase(transaction: () => unknown): IDBDatabase {
  return { transaction, close: () => undefined } as unknown as IDBDatabase;
}

function openingFactory(db: IDBDatabase): IDBFactory {
  return {
    open: () => {
      const request = aFakeRequest();
      request.result = db;
      queueMicrotask(() => request.onsuccess?.());
      return request;
    },
  } as unknown as IDBFactory;
}

function abortingFactory(): IDBFactory {
  return openingFactory(
    fakeDatabase(() => {
      const tx = {
        onabort: null as (() => void) | null,
        oncomplete: null,
        onerror: null,
        error: new Error("quota exceeded"),
        objectStore: () => ({ put: () => aFakeRequest() }),
      };
      queueMicrotask(() => tx.onabort?.());
      return tx;
    }),
  );
}

function erroringRequestFactory(): IDBFactory {
  return openingFactory(
    fakeDatabase(() => {
      const failing = () => {
        const request = aFakeRequest();
        queueMicrotask(() => request.onerror?.());
        return request;
      };
      return {
        objectStore: () => ({ get: failing, getAllKeys: failing, delete: failing, put: failing }),
        oncomplete: null,
        onabort: null,
        onerror: null,
      };
    }),
  );
}
