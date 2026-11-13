import { describe, expect, it } from "vitest";
import type { SaveEnvelope, SaveStore } from "../../shared";

function anEnvelope(game: unknown = { week: 1 }): SaveEnvelope {
  return { schemaVersion: 1, createdAt: "2030-01-01T00:00:00.000Z", game };
}

/** Behaviour every `SaveStore` implementation must have. Call from the implementation's test. */
export function runSaveStoreContract(name: string, createStore: () => SaveStore): void {
  describe(`${name} satisfies the SaveStore contract`, () => {
    it("lists nothing when empty", async () => {
      expect(await createStore().list()).toEqual([]);
    });

    it("loads null for an unknown id", async () => {
      expect(await createStore().load("missing")).toBeNull();
    });

    it("loads what was saved", async () => {
      const store = createStore();
      await store.save("a", anEnvelope({ week: 7 }));
      expect(await store.load("a")).toEqual(anEnvelope({ week: 7 }));
    });

    it("lists saved ids in alphabetical order", async () => {
      const store = createStore();
      await store.save("b", anEnvelope());
      await store.save("a", anEnvelope());
      expect(await store.list()).toEqual(["a", "b"]);
    });

    it("replaces an existing save with the same id", async () => {
      const store = createStore();
      await store.save("a", anEnvelope({ week: 1 }));
      await store.save("a", anEnvelope({ week: 2 }));
      expect(await store.load("a")).toEqual(anEnvelope({ week: 2 }));
      expect(await store.list()).toEqual(["a"]);
    });

    it("deletes a save", async () => {
      const store = createStore();
      await store.save("a", anEnvelope());
      await store.delete("a");
      expect(await store.load("a")).toBeNull();
      expect(await store.list()).toEqual([]);
    });

    it("ignores deleting an unknown id", async () => {
      await expect(createStore().delete("missing")).resolves.toBeUndefined();
    });

    it("is not affected by later changes to the saved object", async () => {
      const store = createStore();
      const data = anEnvelope({ week: 1 });
      await store.save("a", data);
      data.game = { week: 99 };
      expect(await store.load("a")).toEqual(anEnvelope({ week: 1 }));
    });

    it("keeps separate stores independent", async () => {
      const first = createStore();
      await first.save("a", anEnvelope());
      expect(await createStore().list()).toEqual([]);
    });
  });
}
