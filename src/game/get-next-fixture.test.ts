import { describe, expect, it } from "vitest";
import { aCareer } from "./career-builders";
import { getNextFixture } from "./get-next-fixture";

describe("getNextFixture", () => {
  it("returns the club's fixture on the current matchday", () => {
    const { season, userClubId } = aCareer();

    const fixture = getNextFixture(season, userClubId);

    expect(fixture?.matchday).toBe(1);
    expect([fixture?.homeClubId, fixture?.awayClubId]).toContain(userClubId);
  });

  it("follows the current matchday", () => {
    const { season, userClubId } = aCareer();

    expect(getNextFixture({ ...season, currentMatchday: 9 }, userClubId)?.matchday).toBe(9);
  });

  it("returns undefined when the season is over", () => {
    const { season, userClubId } = aCareer();

    expect(getNextFixture({ ...season, currentMatchday: 27 }, userClubId)).toBeUndefined();
  });
});
