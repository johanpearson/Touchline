import { describe, expect, it } from "vitest";
import { aCareer } from "./career-builders";
import { simulateFixture } from "./simulate-fixture";

describe("simulateFixture", () => {
  it("returns a result for the fixture with whole-number goals", () => {
    const career = aCareer();
    const fixture = career.season.fixtures[0] as (typeof career.season.fixtures)[number];

    const result = simulateFixture(career, fixture);

    expect(result).toMatchObject({
      fixtureId: fixture.id,
      homeClubId: fixture.homeClubId,
      awayClubId: fixture.awayClubId,
    });
    expect(Number.isInteger(result.homeGoals) && result.homeGoals >= 0).toBe(true);
    expect(Number.isInteger(result.awayGoals) && result.awayGoals >= 0).toBe(true);
  });

  it("gives the same result for the same career and fixture", () => {
    const career = aCareer();
    const fixture = career.season.fixtures[3] as (typeof career.season.fixtures)[number];

    expect(simulateFixture(career, fixture)).toEqual(simulateFixture(aCareer(), fixture));
  });

  it("produces varied scores across fixtures", () => {
    const career = aCareer();
    const totals = new Set(
      career.season.fixtures.slice(0, 30).map((f) => {
        const r = simulateFixture(career, f);
        return `${r.homeGoals}-${r.awayGoals}`;
      }),
    );

    expect(totals.size).toBeGreaterThan(2);
  });
});
