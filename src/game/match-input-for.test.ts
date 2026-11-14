import { describe, expect, it } from "vitest";
import { isMatchInputV2, NEUTRAL_TACTICS, validateMatchInputV2 } from "../engine";
import { aCareer } from "./career-builders";
import { deriveTeamProfile } from "./derive-team-profile";
import { autoPickUserLineup, setTactics } from "./edit-squad-plan";
import { matchInputFor, matchInputV1For, matchInputV2For, matchSeed } from "./match-input-for";

const userFixture = (career: ReturnType<typeof aCareer>) =>
  career.season.fixtures.find(
    (f) => f.homeClubId === career.userClubId || f.awayClubId === career.userClubId,
  ) as (typeof career.season.fixtures)[number];

describe("matchInputFor", () => {
  const sideOf = (career: ReturnType<typeof aCareer>, fixture: { homeClubId: string }) =>
    fixture.homeClubId === career.userClubId ? "home" : "away";

  it("gives a v1 input for an engine 1 career", () => {
    const career = aCareer(1, 1);
    const fixture = userFixture(career);

    expect(matchInputFor(career, fixture)).toEqual(matchInputV1For(career, fixture));
    expect(isMatchInputV2(matchInputFor(career, fixture))).toBe(false);
  });

  it("gives a v2 input with sheets for an engine 2 career", () => {
    const career = aCareer(1, 2);
    const fixture = userFixture(career);

    const input = matchInputFor(career, fixture);

    expect(isMatchInputV2(input)).toBe(true);
    if (!isMatchInputV2(input)) return;
    expect(validateMatchInputV2(input)).toEqual({ ok: true });
    const user = input[sideOf(career, fixture)];
    expect(user.formation).toEqual({ defenders: 4, midfielders: 4, forwards: 2 });
    expect(user.starters.map((p) => p.id)).toEqual(
      expect.arrayContaining(career.squadPlan.starters),
    );
    expect(user.bench.map((p) => p.id)).toEqual(career.squadPlan.bench);
  });

  it("uses the user's formation and tactics on the user's side only, AI clubs 4-4-2 neutral", () => {
    const attacking = { ...NEUTRAL_TACTICS, mentality: "attacking" as const };
    const career = setTactics(autoPickUserLineup(aCareer(1, 2), "3-4-3"), attacking);
    const fixture = userFixture(career);

    const input = matchInputV2For(career, fixture);

    const user = sideOf(career, fixture);
    const other = user === "home" ? "away" : "home";
    expect(input[user].formation).toEqual({ defenders: 3, midfielders: 4, forwards: 3 });
    expect(input[user].tactics).toEqual(attacking);
    expect(input[other].formation).toEqual({ defenders: 4, midfielders: 4, forwards: 2 });
    expect(input[other].tactics).toEqual(NEUTRAL_TACTICS);
  });

  it("builds valid v2 inputs for every fixture of the first matchday", () => {
    const career = aCareer(3, 2);
    for (const fixture of career.season.fixtures.filter((f) => f.matchday === 1)) {
      expect(validateMatchInputV2(matchInputV2For(career, fixture))).toEqual({ ok: true });
    }
  });
});

describe("matchInputV1For", () => {
  it("uses both clubs' derived profiles, home first", () => {
    const career = aCareer();
    const fixture = career.season.fixtures[0] as (typeof career.season.fixtures)[number];
    const club = (id: string) => career.league.clubs.find((c) => c.id === id) as never;

    const input = matchInputV1For(career, fixture);

    expect(input.home).toEqual(deriveTeamProfile(club(fixture.homeClubId), career.league.players));
    expect(input.away).toEqual(deriveTeamProfile(club(fixture.awayClubId), career.league.players));
  });

  it("equals the old best-eleven 4-4-2 input for a new career (neutral plan, full condition)", () => {
    const career = aCareer();
    const fixture = userFixture(career);
    const club = (id: string) => career.league.clubs.find((c) => c.id === id) as never;

    const input = matchInputV1For(career, fixture);

    expect(input.home).toEqual(deriveTeamProfile(club(fixture.homeClubId), career.league.players));
    expect(input.homeTactics).toEqual(NEUTRAL_TACTICS);
    expect(input.awayTactics).toEqual(NEUTRAL_TACTICS);
  });

  it("uses the user's tactics on the user's side only", () => {
    const career = aCareer();
    const fixture = userFixture(career);
    const attacking = { ...NEUTRAL_TACTICS, mentality: "attacking" as const };
    const userIsHome = fixture.homeClubId === career.userClubId;

    const input = matchInputV1For(setTactics(career, attacking), fixture);

    expect(userIsHome ? input.homeTactics : input.awayTactics).toEqual(attacking);
    expect(userIsHome ? input.awayTactics : input.homeTactics).toEqual(NEUTRAL_TACTICS);
  });

  it("changes the user's profile but not the opponent's when the formation changes", () => {
    const career = aCareer();
    const fixture = userFixture(career);
    const userIsHome = fixture.homeClubId === career.userClubId;
    const before = matchInputV1For(career, fixture);

    const after = matchInputV1For(autoPickUserLineup(career, "3-4-3"), fixture);

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

    const rested = matchInputV1For(career, fixture);
    const exhausted = matchInputV1For(tired, fixture);
    const side = fixture.homeClubId === aiId ? "home" : "away";

    expect(exhausted[side].buildUp).toBeLessThan(rested[side].buildUp);
  });

  it("throws for a fixture with an unknown club", () => {
    const career = aCareer();
    const fixture = { id: "x", matchday: 1, homeClubId: "nope", awayClubId: "nada" };

    expect(() => matchInputV1For(career, fixture)).toThrow(RangeError);
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
