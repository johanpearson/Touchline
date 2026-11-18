import { describe, expect, it } from "vitest";
import { type Career, createCareer, finishSeason, generateLeague } from "../../game";
import { playMatchdays } from "../../game/season-test-helpers";
import { headerActionFor } from "./header-action";

const newCareer = (): Career => {
  const generated = generateLeague({ seed: 11 });
  if (!generated.ok) throw new Error("league");
  const result = createCareer({ seed: 11, userClubId: generated.league.clubs[0]?.id ?? "" });
  if (!result.ok) throw new Error("career");
  return result.career;
};

const finishedOf = (career: Career): Career => {
  const result = finishSeason(career);
  if (!result.ok) throw new Error(result.error);
  return result.career;
};

describe("headerActionFor", () => {
  it("continues to the match flow while fixtures remain", () => {
    expect(headerActionFor(newCareer())).toEqual({ kind: "continue", route: { name: "match" } });
  });

  it("offers the season summary once every matchday is played", () => {
    const career = newCareer();
    const lastMatchday = Math.max(...career.season.fixtures.map((f) => f.matchday));
    const done = playMatchdays(career, lastMatchday);
    expect(headerActionFor(done)).toEqual({
      kind: "season-complete",
      route: { name: "season-end" },
    });
  });

  it("offers the off-season once the season is finished and the window is open", () => {
    const career = newCareer();
    const lastMatchday = Math.max(...career.season.fixtures.map((f) => f.matchday));
    const done = finishedOf(playMatchdays(career, lastMatchday));
    expect(headerActionFor(done)).toEqual({ kind: "off-season", route: { name: "off-season" } });
  });
});
