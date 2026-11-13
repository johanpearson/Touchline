import { describe, expect, it } from "vitest";
import { messages } from "./messages";

describe("message catalogues", () => {
  const enKeys = Object.keys(messages.en).sort();
  const svKeys = Object.keys(messages.sv).sort();

  it("has every English key in Swedish", () => {
    expect(enKeys.filter((k) => !svKeys.includes(k))).toEqual([]);
  });

  it("has no Swedish key missing from English", () => {
    expect(svKeys.filter((k) => !enKeys.includes(k))).toEqual([]);
  });

  it("uses the same placeholders in both locales", () => {
    const placeholders = (m: unknown) =>
      [...JSON.stringify(m).matchAll(/\{(\w+)\}/g)].map((x) => x[1]).sort();
    for (const key of enKeys) {
      const k = key as keyof typeof messages.en;
      expect(placeholders(messages.sv[k]), key).toEqual(placeholders(messages.en[k]));
    }
  });
});
