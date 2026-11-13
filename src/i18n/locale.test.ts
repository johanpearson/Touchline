import { describe, expect, it } from "vitest";
import { isLocale } from "./locale";

describe("isLocale", () => {
  it("accepts supported locales", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("sv")).toBe(true);
  });

  it("rejects unsupported values", () => {
    expect(isLocale("de")).toBe(false);
    expect(isLocale(null)).toBe(false);
  });
});
