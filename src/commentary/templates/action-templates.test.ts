import { describe, expect, it } from "vitest";
import { actionTemplateParams, actionTemplates } from "./action-templates";

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1] as string);

describe("action commentary templates", () => {
  const keys = Object.keys(actionTemplates.en) as (keyof typeof actionTemplates.en)[];

  it("has the same keys in English and Swedish", () => {
    expect(Object.keys(actionTemplates.sv).sort()).toEqual([...keys].sort());
  });

  it("declares the parameters of every key", () => {
    expect(Object.keys(actionTemplateParams).sort()).toEqual([...keys].sort());
  });

  it.each(keys)("has several variants of %s in both locales", (key) => {
    expect(actionTemplates.en[key].length).toBeGreaterThanOrEqual(2);
    expect(actionTemplates.sv[key].length).toBeGreaterThanOrEqual(2);
  });

  it.each(keys)("mentions no parameter of %s that the generator does not fill", (key) => {
    const allowed = new Set(actionTemplateParams[key]);
    for (const locale of ["en", "sv"] as const) {
      for (const variant of actionTemplates[locale][key]) {
        for (const name of placeholders(variant)) {
          expect(allowed.has(name), `${locale}.${key}: {${name}} in "${variant}"`).toBe(true);
        }
      }
    }
  });
});
