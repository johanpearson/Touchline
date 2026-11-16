import { describe, expect, it } from "vitest";
import { clubStarPlayer } from "./club-star-player";
import { aClub, aPlayer } from "./game-builders";

describe("clubStarPlayer", () => {
  it("returns the club's player with the highest overall", () => {
    const weak = aPlayer().withId("a").withPosition("DEF").withAllAttributes(8).build();
    const star = aPlayer().withId("b").withPosition("FWD").withAllAttributes(17).build();
    const other = aPlayer().withId("c").withAllAttributes(5).build();
    const club = aClub().withPlayerIds(["a", "b"]).build();
    expect(clubStarPlayer(club, [weak, star, other])?.id).toBe("b");
  });

  it("ignores players of other clubs", () => {
    const mine = aPlayer().withId("a").withAllAttributes(8).build();
    const foreign = aPlayer().withId("z").withAllAttributes(19).build();
    const club = aClub().withPlayerIds(["a"]).build();
    expect(clubStarPlayer(club, [mine, foreign])?.id).toBe("a");
  });

  it("breaks a tie by the lower player id so the choice is deterministic", () => {
    const a = aPlayer().withId("b").withAllAttributes(12).build();
    const b = aPlayer().withId("a").withAllAttributes(12).build();
    const club = aClub().withPlayerIds(["a", "b"]).build();
    expect(clubStarPlayer(club, [a, b])?.id).toBe("a");
  });

  it("returns undefined for a club without players", () => {
    expect(clubStarPlayer(aClub().withPlayerIds([]).build(), [])).toBeUndefined();
  });
});
