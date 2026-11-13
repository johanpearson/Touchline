import { describe, expect, it } from "vitest";
import { createTranslator } from "./translator";

describe("translator", () => {
  it("returns the English text for a key", () => {
    expect(createTranslator("en").t("locale.label")).toBe("Language");
  });

  it("returns the Swedish text for a key", () => {
    expect(createTranslator("sv").t("locale.label")).toBe("Språk");
  });

  it("interpolates params", () => {
    expect(createTranslator("en").t("stats.possession", { value: "62%" })).toBe("Possession: 62%");
  });

  it("keeps unknown placeholders untouched", () => {
    expect(createTranslator("en").t("stats.possession")).toBe("Possession: {value}");
  });

  it("uses the singular form for one", () => {
    expect(createTranslator("en").t("squad.players", { count: 1 })).toBe("1 player");
  });

  it("uses the plural form for other counts", () => {
    expect(createTranslator("en").t("squad.players", { count: 22 })).toBe("22 players");
    expect(createTranslator("sv").t("squad.players", { count: 1 })).toBe("1 spelare");
  });

  it("formats numbers with the locale decimal separator", () => {
    expect(createTranslator("en").formatNumber(0.62)).toBe("0.62");
    expect(createTranslator("sv").formatNumber(0.62)).toBe("0,62");
  });

  it("formats percentages per locale", () => {
    expect(createTranslator("en").formatPercent(0.62)).toBe("62%");
    expect(createTranslator("sv").formatPercent(0.625, 1).replace(/\s/g, " ")).toBe("62,5 %");
  });

  it("formats signed integers with an explicit plus and a true minus sign", () => {
    const en = createTranslator("en");
    expect(en.formatSigned(3)).toBe("+3");
    expect(en.formatSigned(-2)).toBe("\u22122");
    expect(en.formatSigned(0)).toBe("0");
    expect(createTranslator("sv").formatSigned(-2)).toBe("\u22122");
  });
});
