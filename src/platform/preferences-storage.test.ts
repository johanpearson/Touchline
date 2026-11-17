import { describe, expect, it } from "vitest";
import { isPreferenceStorageWritable } from "./preferences-storage";

const memoryStorage = (): Storage => {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => {
      data.delete(key);
    },
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
};

describe("isPreferenceStorageWritable", () => {
  it("is true when a value can be written and removed", () => {
    const storage = memoryStorage();
    expect(isPreferenceStorageWritable(storage)).toBe(true);
    expect(storage.length).toBe(0);
  });

  it("is false when writing throws", () => {
    const storage = {
      ...memoryStorage(),
      setItem: () => {
        throw new DOMException("quota", "QuotaExceededError");
      },
    };
    expect(isPreferenceStorageWritable(storage)).toBe(false);
  });

  it("is false when the storage object itself cannot be reached", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage");
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("blocked", "SecurityError");
      },
    });
    try {
      expect(isPreferenceStorageWritable()).toBe(false);
    } finally {
      if (original) Object.defineProperty(window, "localStorage", original);
    }
  });
});
