import { describe, expect, it } from "vitest";
import { aCareer } from "./career-builders";
import { isSeasonComplete } from "./is-season-complete";
import { playSeasons } from "./season-test-helpers";

describe("isSeasonComplete", () => {
  it("is false for a season that has not started", () => {
    expect(isSeasonComplete(aCareer().season)).toBe(false);
  });

  it("is false while the last matchday is still to be played", () => {
    const career = playSeasons(aCareer(), 1, 25);

    expect(career.season.currentMatchday).toBe(26);
    expect(isSeasonComplete(career.season)).toBe(false);
  });

  it("is true after the last matchday", () => {
    expect(isSeasonComplete(playSeasons(aCareer(), 1).season)).toBe(true);
  });

  it("is false when the matchday is past the end but a fixture has no result", () => {
    const { season } = playSeasons(aCareer(), 1);

    expect(isSeasonComplete({ ...season, results: season.results.slice(1) })).toBe(false);
  });
});
