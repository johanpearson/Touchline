import { describe, expect, it } from "vitest";
import { createSeason } from "./create-season";

const ids = ["a", "b", "c", "d"];

describe("createSeason", () => {
  it("starts on matchday 1 with no results", () => {
    const season = createSeason(1, 2, ids);

    expect(season).toMatchObject({ number: 2, currentMatchday: 1, results: [] });
    expect(season.fixtures).toHaveLength(12);
  });

  it("gives a different schedule for each season number", () => {
    const first = createSeason(7, 1, ids).fixtures;
    const schedules = [2, 3, 4].map((n) => createSeason(7, n, ids).fixtures);

    expect(schedules.some((fixtures) => JSON.stringify(fixtures) !== JSON.stringify(first))).toBe(
      true,
    );
  });

  it("throws for club ids that cannot be scheduled", () => {
    expect(() => createSeason(1, 1, ["a", "b", "c"])).toThrow(RangeError);
  });
});
