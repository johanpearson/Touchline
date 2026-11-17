import { describe, expect, it } from "vitest";
import { aCareer } from "./career-builders";
import { finishSeason } from "./finish-season";
import { rollOverSeason } from "./roll-over-season";
import { playMatchdays } from "./season-test-helpers";

describe("rollOverSeason", () => {
  it("returns season-incomplete while the season runs", () => {
    expect(rollOverSeason(playMatchdays(aCareer(), 10))).toEqual({
      ok: false,
      error: "season-incomplete",
    });
  });

  it("finishes the season and starts the next one from a completed season", () => {
    const result = rollOverSeason(playMatchdays(aCareer(), 26));

    if (!result.ok) throw new Error(result.error);
    expect(result.career.season.number).toBe(2);
    expect(result.career.history).toHaveLength(1);
    expect(result.career.window).toBe("closed");
  });

  it("does not finish a season twice when the off-season already began", () => {
    const opened = finishSeason(playMatchdays(aCareer(), 26));
    if (!opened.ok) throw new Error(opened.error);

    const result = rollOverSeason(opened.career);

    if (!result.ok) throw new Error(result.error);
    expect(result.career.history).toHaveLength(1);
    expect(result.career.season.number).toBe(2);
  });
});
