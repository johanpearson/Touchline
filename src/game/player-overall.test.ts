import { describe, expect, it } from "vitest";
import { aPlayer } from "./game-builders";
import { playerOverall } from "./player-overall";

describe("playerOverall", () => {
  it("is the mean of a goalkeeper's handling and reflexes", () => {
    const keeper = aPlayer().withPosition("GK").withHandling(18).withReflexes(12).build();
    expect(playerOverall(keeper)).toBe(15);
  });

  it("is the mean of a forward's finishing, pace and dribbling", () => {
    const forward = aPlayer()
      .withPosition("FWD")
      .withFinishing(15)
      .withPace(12)
      .withDribbling(9)
      .build();
    expect(playerOverall(forward)).toBe(12);
  });

  it("ignores attributes that are not key for the position", () => {
    const base = aPlayer().withPosition("DEF").withAllAttributes(10);
    expect(playerOverall(base.withFinishing(20).build())).toBe(playerOverall(base.build()));
  });
});
