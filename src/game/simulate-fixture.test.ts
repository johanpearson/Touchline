import { describe, expect, it } from "vitest";
import { createActionMatch } from "../engine";
import { aCareer } from "./career-builders";
import { matchInputFor, matchSeed } from "./match-input-for";
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

  it("stamps the engine version the match was played on", () => {
    const career = aCareer();
    const fixture = career.season.fixtures[0] as (typeof career.season.fixtures)[number];

    expect(simulateFixture(career, fixture).engineVersion).toBe(2);
  });

  it("plays the action engine, deterministically", () => {
    const career = aCareer();
    const fixture = career.season.fixtures[2] as (typeof career.season.fixtures)[number];
    const input = matchInputFor(career, fixture);
    const match = createActionMatch(input, matchSeed(career, fixture));
    match.advanceTo(1_000_000);
    match.resume();
    match.advanceTo(1_000_000);

    const result = simulateFixture(career, fixture);

    expect(result.homeGoals).toBe(match.state.score.home);
    expect(result.awayGoals).toBe(match.state.score.away);
    expect(simulateFixture(aCareer(), fixture)).toEqual(result);
  });
});
