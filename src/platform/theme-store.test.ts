import { describe, expect, it, vi } from "vitest";
import { createBrowserThemeStore, createMemoryThemeStore, THEME_STORAGE_KEY } from "./theme-store";

describe("memory theme store", () => {
  it("returns what was saved", () => {
    const store = createMemoryThemeStore();
    expect(store.load()).toBeNull();
    store.save("light");
    expect(store.load()).toBe("light");
  });

  it("starts with the given theme", () => {
    expect(createMemoryThemeStore("graphite").load()).toBe("graphite");
  });
});

describe("browser theme store", () => {
  it("remembers the theme between store instances", () => {
    createBrowserThemeStore().save("graphite");
    expect(createBrowserThemeStore().load()).toBe("graphite");
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe("graphite");
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
    const store = createBrowserThemeStore(broken);
    expect(() => store.save("light")).not.toThrow();
    expect(store.load()).toBeNull();
  });

  it("does not throw when reading window.localStorage itself throws", () => {
    const spy = vi.spyOn(window, "localStorage", "get").mockImplementation(() => {
      throw new Error("blocked");
    });
    const store = createBrowserThemeStore();
    expect(() => store.save("light")).not.toThrow();
    expect(store.load()).toBeNull();
    spy.mockRestore();
  });
});
