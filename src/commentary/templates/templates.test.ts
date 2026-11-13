import { describe, expect, it } from "vitest";
import { templates } from "./templates";

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("commentary templates", () => {
  const keys = Object.keys(templates.en) as (keyof typeof templates.en)[];

  it("has the same keys in English and Swedish", () => {
    expect(Object.keys(templates.sv).sort()).toEqual([...keys].sort());
  });

  it.each(keys)("has several variants of %s in both locales", (key) => {
    expect(templates.en[key].length).toBeGreaterThanOrEqual(2);
    expect(templates.sv[key].length).toBeGreaterThanOrEqual(2);
  });

  it.each(keys)("uses only placeholders in %s that the English variants use", (key) => {
    const reference = new Set(templates.en[key].flatMap(placeholders));
    for (const locale of ["en", "sv"] as const) {
      for (const variant of templates[locale][key]) {
        for (const name of placeholders(variant)) expect(reference.has(name), variant).toBe(true);
      }
    }
  });

  it("only names a player in goal templates", () => {
    for (const locale of ["en", "sv"] as const) {
      for (const key of keys) {
        const mentionsPlayer = templates[locale][key].some((v) => v.includes("{player}"));
        expect(mentionsPlayer, `${locale}.${key}`).toBe(key === "goal");
      }
    }
  });
});
