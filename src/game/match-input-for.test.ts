import { describe, expect, it } from "vitest";
import { NEUTRAL_TACTICS } from "../engine";
import { aCareer } from "./career-builders";
import { deriveTeamProfile } from "./derive-team-profile";
import { autoPickUserLineup, setTactics } from "./edit-squad-plan";
import { matchInputFor, matchSeed } from "./match-input-for";

const userFixture = (career: ReturnType<typeof aCareer>) =>
  career.season.fixtures.find(
    (f) => f.homeClubId === career.userClubId || f.awayClubId === career.userClubId,
  ) as (typeof career.season.fixtures)[number];

describe("matchInputFor", () => {
  it("uses both clubs' derived profiles, home first", () => {
    const career = aCareer();
    const fixture = career.season.fixtures[0] as (typeof career.season.fixtures)[number];
    const club = (id: string) => career.league.clubs.find((c) => c.id === id) as never;

    const input = matchInputFor(career, fixture);

    expect(input.home).toEqual(deriveTeamProfile(club(fixture.homeClubId), career.league.players));
    expect(input.away).toEqual(deriveTeamProfile(club(fixture.awayClubId), career.league.players));
  });

  it("equals the old best-eleven 4-4-2 input for a new career (neutral plan, full condition)", () => {
    const career = aCareer();
    const fixture = userFixture(career);
    const club = (id: string) => career.league.clubs.find((c) => c.id === id) as never;

    const input = matchInputFor(career, fixture);

    expect(input.home).toEqual(deriveTeamProfile(club(fixture.homeClubId), career.league.players));
    expect(input.homeTactics).toEqual(NEUTRAL_TACTICS);
    expect(input.awayTactics).toEqual(NEUTRAL_TACTICS);
  });

  it("uses the user's tactics on the user's side only", () => {
    const career = aCareer();
    const fixture = userFixture(career);
    const attacking = { ...NEUTRAL_TACTICS, mentality: "attacking" as const };
    const userIsHome = fixture.homeClubId === career.userClubId;

    const input = matchInputFor(setTactics(career, attacking), fixture);

    expect(userIsHome ? input.homeTactics : input.awayTactics).toEqual(attacking);
    expect(userIsHome ? input.awayTactics : input.homeTactics).toEqual(NEUTRAL_TACTICS);
  });

  it("changes the user's profile but not the opponent's when the formation changes", () => {
    const career = aCareer();
    const fixture = userFixture(career);
    const userIsHome = fixture.homeClubId === career.userClubId;
    const before = matchInputFor(career, fixture);

    const after = matchInputFor(autoPickUserLineup(career, "3-4-3"), fixture);

    expect(userIsHome ? after.home : after.away).not.toEqual(
      userIsHome ? before.home : before.away,
    );
    expect(userIsHome ? after.away : after.home).toEqual(userIsHome ? before.away : before.home);
  });

  it("plays AI clubs in a 4-4-2 from their current condition", () => {
    const career = aCareer();
    const fixture = userFixture(career);
    const aiId = fixture.homeClubId === career.userClubId ? fixture.awayClubId : fixture.homeClubId;
    const ai = career.league.clubs.find((c) => c.id === aiId) as { playerIds: string[] };
    const tired = {
      ...career,
      condition: {
        ...career.condition,
        ...Object.fromEntries(ai.playerIds.map((id) => [id, { fitness: 20, form: 5 }])),
      },
    };

    const rested = matchInputFor(career, fixture);
    const exhausted = matchInputFor(tired, fixture);
    const side = fixture.homeClubId === aiId ? "home" : "away";

    expect(exhausted[side].buildUp).toBeLessThan(rested[side].buildUp);
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
