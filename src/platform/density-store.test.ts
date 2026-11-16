import { describe, expect, it, vi } from "vitest";
import {
  createBrowserDensityStore,
  createMemoryDensityStore,
  DENSITY_STORAGE_KEY,
} from "./density-store";

describe("memory density store", () => {
  it("returns what was saved", () => {
    const store = createMemoryDensityStore();
    expect(store.load()).toBeNull();
    store.save("comfortable");
    expect(store.load()).toBe("comfortable");
  });

  it("starts with the given density", () => {
    expect(createMemoryDensityStore("compact").load()).toBe("compact");
  });
});

describe("browser density store", () => {
  it("remembers the density between store instances", () => {
    createBrowserDensityStore().save("comfortable");
    expect(createBrowserDensityStore().load()).toBe("comfortable");
    expect(window.localStorage.getItem(DENSITY_STORAGE_KEY)).toBe("comfortable");
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
    const store = createBrowserDensityStore(broken);
    expect(() => store.save("compact")).not.toThrow();
    expect(store.load()).toBeNull();
  });

  it("does not throw when reading window.localStorage itself throws", () => {
    const spy = vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("blocked");
    });
    const store = createBrowserDensityStore();
    expect(() => store.save("compact")).not.toThrow();
    expect(store.load()).toBeNull();
    spy.mockRestore();
  });
});
