import { describe, expect, it } from "vitest";
import { deriveLineRatings, getNextFixture, LINE_RATINGS } from "../../game";
import { matchSetupFor } from "../match-setup";
import { careerAfter } from "../test-career";
import { lineRatingsOf, preMatchLineup, userSideOf } from "./pre-match-model";

const career = careerAfter(0);
const fixture = (() => {
  const next = getNextFixture(career.season, career.userClubId);
  if (!next) throw new Error("fixture");
  return next;
})();
const setup = matchSetupFor(career, fixture);

describe("preMatchLineup", () => {
  it("lists the eleven and the bench of the match input", () => {
    const sheet = setup.input[userSideOf(career, fixture)];
    const lineup = preMatchLineup(career, fixture, setup);

    expect(lineup.starters.map((e) => e.player.id)).toEqual(sheet.starters.map((p) => p.id));
    expect(lineup.bench.map((e) => e.player.id)).toEqual(sheet.bench.map((p) => p.id));
  });

  it("lists the same players as the saved squad plan", () => {
    const lineup = preMatchLineup(career, fixture, setup);

    expect(new Set(lineup.starters.map((e) => e.player.id))).toEqual(
      new Set(career.squadPlan.starters),
    );
    expect(lineup.bench.map((e) => e.player.id)).toEqual(career.squadPlan.bench);
  });

  it("flags a player below the low-fitness threshold", () => {
    const tired = career.squadPlan.starters[3] as string;
    const worn = {
      ...career,
      condition: { ...career.condition, [tired]: { fitness: 30, form: 7 } },
    };
    const lineup = preMatchLineup(worn, fixture, matchSetupFor(worn, fixture));
    const entry = lineup.starters.find((e) => e.player.id === tired);

    expect(entry).toMatchObject({ fitness: 30, form: 7, lowFitness: true });
    expect(lineup.starters.filter((e) => e.lowFitness)).toHaveLength(1);
  });
});

describe("userSideOf", () => {
  it("is home when the user's club hosts the fixture", () => {
    const home = { ...fixture, homeClubId: career.userClubId };
    expect(userSideOf(career, home)).toBe("home");
    expect(
      userSideOf(career, { ...fixture, homeClubId: "other", awayClubId: career.userClubId }),
    ).toBe("away");
  });
});

describe("lineRatingsOf", () => {
  it("follows the saved plan for the user's club", () => {
    const club = career.league.clubs.find((c) => c.id === career.userClubId);
    const players = career.league.players.filter((p) => club?.playerIds.includes(p.id));

    expect(lineRatingsOf(career, career.userClubId)).toEqual(
      deriveLineRatings(players, career.squadPlan, career.condition),
    );
  });

  it("rates every line of an opponent", () => {
    const opponent = career.league.clubs.find((c) => c.id !== career.userClubId);
    const ratings = lineRatingsOf(career, opponent?.id ?? "");

    for (const line of LINE_RATINGS) expect(ratings[line]).toBeGreaterThan(0);
  });
});
