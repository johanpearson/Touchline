import { describe, expect, it } from "vitest";
import { createActionMatch } from "../engine";
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
  const match = createActionMatch(setup.input, setup.seed);
  match.advanceTo(1_000_000);
  match.resume();
  match.advanceTo(1_000_000);
  return match.state.score;
};

describe("matchSetupFor", () => {
  it("sets up the match with the names of every player", () => {
    const career = aCareer();
    const fixture = nextFixtureOf(career);
    const setup = matchSetupFor(career, fixture);
    expect(setup.input.engineVersion).toBe(2);
    const sheet = setup.input.home;
    for (const player of [...sheet.starters, ...sheet.bench]) {
      expect(setup.players[player.id]).toBe(
        career.league.players.find((p) => p.id === player.id)?.name,
      );
    }
  });

  it("plays the same score as the quick sim", () => {
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

  const withColours = (career: Career, id: string, primary: string, secondary: string): Career => ({
    ...career,
    league: {
      ...career.league,
      clubs: career.league.clubs.map((c) =>
        c.id === id ? { ...c, colours: { primary, secondary } } : c,
      ),
    },
  });

  it("puts a clashing away side in its away kit", () => {
    const career = aCareer();
    const fixture = nextFixtureOf(career);
    const home = withColours(career, fixture.homeClubId, "#d62828", "#ffffff");
    const clashing = withColours(home, fixture.awayClubId, "#c02020", "#111111");
    const setup = matchSetupFor(clashing, fixture);
    expect(setup.kits.away).toEqual({ body: "#111111", trim: "#c02020" });
    expect(setup.colours).toEqual({ home: "#d62828", away: "#111111" });
  });

  it("keeps the away side in its home kit when the colours do not clash", () => {
    const career = aCareer();
    const fixture = nextFixtureOf(career);
    const home = withColours(career, fixture.homeClubId, "#d62828", "#ffffff");
    const clear = withColours(home, fixture.awayClubId, "#2f9bff", "#111111");
    const setup = matchSetupFor(clear, fixture);
    expect(setup.kits.away.body).toBe("#2f9bff");
    expect(setup.kits.home.body).toBe("#d62828");
  });
});
