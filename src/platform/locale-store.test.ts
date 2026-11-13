import { describe, expect, it } from "vitest";
import { createBrowserLocaleStore, createMemoryLocaleStore } from "./locale-store";

describe("memory locale store", () => {
  it("returns what was saved", () => {
    const store = createMemoryLocaleStore();
    expect(store.load()).toBeNull();
    store.save("sv");
    expect(store.load()).toBe("sv");
  });
});

describe("browser locale store", () => {
  it("remembers the locale between store instances", () => {
    createBrowserLocaleStore().save("sv");
    expect(createBrowserLocaleStore().load()).toBe("sv");
  });

  it("does not throw when storage fails", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Storage;
    const store = createBrowserLocaleStore(broken);
    expect(() => store.save("sv")).not.toThrow();
    expect(store.load()).toBeNull();
  });
});
