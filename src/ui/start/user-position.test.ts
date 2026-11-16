import { describe, expect, it } from "vitest";
import { createCareer, generateLeague } from "../../game";
import { playMatchdays } from "../../game/season-test-helpers";
import { userPosition } from "./user-position";

const SEED = 11;

const aCareer = () => {
  const generated = generateLeague({ seed: SEED });
  if (!generated.ok) throw new Error("league");
  const created = createCareer({ seed: SEED, userClubId: generated.league.clubs[0]?.id ?? "" });
  if (!created.ok) throw new Error("career");
  return created.career;
};

describe("userPosition", () => {
  it("is within the table once a round has been played", () => {
    const career = playMatchdays(aCareer(), 1);
    const position = userPosition(career);
    expect(position).toBeGreaterThanOrEqual(1);
    expect(position).toBeLessThanOrEqual(career.league.clubs.length);
  });

  it("is null when the results do not fit the league", () => {
    const career = aCareer();
    const broken = {
      ...career,
      season: {
        ...career.season,
        results: [
          {
            fixtureId: "x",
            homeClubId: "nobody",
            awayClubId: "else",
            homeGoals: 0,
            awayGoals: 0,
            engineVersion: 2 as const,
          },
        ],
      },
    };
    expect(userPosition(broken)).toBeNull();
  });
});
