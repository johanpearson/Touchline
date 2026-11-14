import { describe, expect, it } from "vitest";
import { createMatch } from "../engine";
import {
  type Career,
  createCareer,
  generateLeague,
  getNextFixture,
  simulateFixture,
} from "../game";
import { matchSetupFor } from "./match-setup";

const aCareer = (seed = 5): Career => {
  const league = generateLeague({ seed });
  if (!league.ok) throw new Error("league");
  const created = createCareer({ seed, userClubId: league.league.clubs[0]?.id ?? "" });
  if (!created.ok) throw new Error("career");
  return created.career;
};

const nextFixtureOf = (career: Career) => {
  const fixture = getNextFixture(career.season, career.userClubId);
  if (!fixture) throw new Error("fixture");
  return fixture;
};

const playToFullTime = (setup: ReturnType<typeof matchSetupFor>) => {
  const match = createMatch(setup.input, setup.seed);
  match.advanceTo(1_000_000);
  match.resume();
  match.advanceTo(1_000_000);
  return match.state.score;
};

describe("matchSetupFor", () => {
  it("plays the same score as the quick sim for the same fixture and seed", () => {
    const career = aCareer();
    const fixture = nextFixtureOf(career);
    const quick = simulateFixture(career, fixture);
    const score = playToFullTime(matchSetupFor(career, fixture));
    expect(score).toEqual({ home: quick.homeGoals, away: quick.awayGoals });
  });

  it("uses the real club names and primary colours", () => {
    const career = aCareer();
    const fixture = nextFixtureOf(career);
    const setup = matchSetupFor(career, fixture);
    const home = career.league.clubs.find((c) => c.id === fixture.homeClubId);
    const away = career.league.clubs.find((c) => c.id === fixture.awayClubId);
    expect(setup.input.home.name).toBe(home?.name);
    expect(setup.input.away.name).toBe(away?.name);
    expect(setup.colours.home).toBe(home?.colours.primary);
  });

  it("falls back to the away club's secondary colour when both primaries are equal", () => {
    const career = aCareer();
    const fixture = nextFixtureOf(career);
    const clubs = career.league.clubs.map((c) =>
      c.id === fixture.awayClubId
        ? { ...c, colours: { ...c.colours, primary: "#123456" } }
        : c.id === fixture.homeClubId
          ? { ...c, colours: { ...c.colours, primary: "#123456" } }
          : c,
    );
    const setup = matchSetupFor({ ...career, league: { ...career.league, clubs } }, fixture);
    expect(setup.colours.home).not.toBe(setup.colours.away);
  });

  it("lists every player of the opponent as a potential scorer", () => {
    const career = aCareer();
    const fixture = nextFixtureOf(career);
    const setup = matchSetupFor(career, fixture);
    const opponentId =
      fixture.homeClubId === career.userClubId ? fixture.awayClubId : fixture.homeClubId;
    const side = fixture.homeClubId === career.userClubId ? "away" : "home";
    const size = career.league.clubs.find((c) => c.id === opponentId)?.playerIds.length;
    expect(setup.squads[side]).toHaveLength(size ?? -1);
  });

  it("credits the user's goals to the starters and bench of the squad plan only", () => {
    const career = aCareer();
    const fixture = nextFixtureOf(career);
    const setup = matchSetupFor(career, fixture);
    const side = fixture.homeClubId === career.userClubId ? "home" : "away";
    expect(setup.squads[side]).toHaveLength(
      career.squadPlan.starters.length + career.squadPlan.bench.length,
    );
  });
});
