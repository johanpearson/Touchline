import { describe, expect, it } from "vitest";
import { describeMovement, positionBefore } from "./matchday-view";

describe("describeMovement", () => {
  it("is up when the position number fell", () => {
    expect(describeMovement(5, 3)).toEqual({ direction: "up", places: 2 });
  });

  it("is down when the position number rose", () => {
    expect(describeMovement(3, 4)).toEqual({ direction: "down", places: 1 });
  });

  it("is unchanged when the position is the same", () => {
    expect(describeMovement(7, 7)).toEqual({ direction: "same", places: 0 });
  });

  it("is unknown without a position before", () => {
    expect(describeMovement(undefined, 7)).toBeNull();
  });
});

describe("positionBefore", () => {
  const clubIds = ["a", "b", "c"];
  const result = (id: string, home: string, away: string, score: [number, number]) => ({
    fixtureId: id,
    homeClubId: home,
    awayClubId: away,
    homeGoals: score[0],
    awayGoals: score[1],
    engineVersion: "action-v1" as never,
  });

  it("ranks the club from the results of the fixtures before the round", () => {
    const earlier = [result("f1", "a", "b", [1, 0])];
    expect(positionBefore(clubIds, earlier, "a")).toBe(1);
    expect(positionBefore(clubIds, earlier, "b")).toBe(3);
  });

  it("is undefined when nothing was played before the round", () => {
    expect(positionBefore(clubIds, [], "a")).toBeUndefined();
  });
});
