import { describe, expect, it } from "vitest";
import { createTranslator } from "../../i18n";
import { describeContinue, describeSavedRow } from "./describe-save";

const NOW = "2026-03-10T12:00:00.000Z";
const TWO_HOURS_AGO = "2026-03-10T10:00:00.000Z";
const FACTS = { season: 1, matchday: 12, position: 3, savedAt: TWO_HOURS_AGO };

describe("describeContinue", () => {
  it("describes the save in English", () => {
    const { t } = createTranslator("en");
    expect(describeContinue(t, "en", FACTS, NOW)).toBe(
      "Season 1, round 12, 3rd, saved 2 hours ago",
    );
  });

  it("describes the save in Swedish", () => {
    const { t } = createTranslator("sv");
    expect(describeContinue(t, "sv", FACTS, NOW)).toBe(
      "Säsong 1, omgång 12, 3:e, sparad för 2 timmar sedan",
    );
  });

  it("leaves out the position when the table cannot be built", () => {
    const { t } = createTranslator("en");
    expect(describeContinue(t, "en", { ...FACTS, position: null }, NOW)).toBe(
      "Season 1, round 12, saved 2 hours ago",
    );
  });

  it("says just now for a save written seconds ago, in both languages", () => {
    const seconds = { ...FACTS, savedAt: "2026-03-10T11:59:40.000Z" };
    expect(describeContinue(createTranslator("en").t, "en", seconds, NOW)).toContain(
      "saved just now",
    );
    expect(describeContinue(createTranslator("sv").t, "sv", seconds, NOW)).toContain("sparad nyss");
  });
});

describe("describeSavedRow", () => {
  it("describes a row without a position in both languages", () => {
    const facts = { season: 3, matchday: 4, savedAt: "2026-03-09T12:00:00.000Z" };
    expect(describeSavedRow(createTranslator("en").t, "en", facts, NOW)).toBe(
      "Season 3, round 4, saved yesterday",
    );
    expect(describeSavedRow(createTranslator("sv").t, "sv", facts, NOW)).toBe(
      "Säsong 3, omgång 4, sparad i går",
    );
  });
});
