import { describe, expect, it } from "vitest";
import { aCareer } from "./career-builders";
import { deriveTeamProfile } from "./derive-team-profile";
import { matchInputFor, matchSeed } from "./match-input-for";

describe("matchInputFor", () => {
  it("uses both clubs' derived profiles, home first", () => {
    const career = aCareer();
    const fixture = career.season.fixtures[0] as (typeof career.season.fixtures)[number];
    const club = (id: string) => career.league.clubs.find((c) => c.id === id) as never;

    const input = matchInputFor(career, fixture);

    expect(input.home).toEqual(deriveTeamProfile(club(fixture.homeClubId), career.league.players));
    expect(input.away).toEqual(deriveTeamProfile(club(fixture.awayClubId), career.league.players));
  });

  it("throws for a fixture with an unknown club", () => {
    const career = aCareer();
    const fixture = { id: "x", matchday: 1, homeClubId: "nope", awayClubId: "nada" };

    expect(() => matchInputFor(career, fixture)).toThrow(RangeError);
  });
});

describe("matchSeed", () => {
  it("is stable for the same career, season and fixture", () => {
    const career = aCareer();
    const fixture = career.season.fixtures[0] as (typeof career.season.fixtures)[number];

    expect(matchSeed(career, fixture)).toBe(matchSeed(aCareer(), fixture));
  });

  it("differs between fixtures, seasons and career seeds", () => {
    const career = aCareer();
    const [a, b] = career.season.fixtures as [
      (typeof career.season.fixtures)[number],
      (typeof career.season.fixtures)[number],
    ];
    const nextSeason = { ...career, season: { ...career.season, number: 2 } };

    expect(matchSeed(career, a)).not.toBe(matchSeed(career, b));
    expect(matchSeed(career, a)).not.toBe(matchSeed(nextSeason, a));
    expect(matchSeed(career, a)).not.toBe(matchSeed({ ...career, seed: 2 }, a));
  });
});
