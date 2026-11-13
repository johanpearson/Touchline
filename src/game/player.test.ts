import { describe, expect, it } from "vitest";
import { aClub, aPlayer } from "./game-builders";

describe("player and club model", () => {
  it("round-trips through JSON unchanged", () => {
    const data = { player: aPlayer().build(), club: aClub().withPlayerIds(["p1"]).build() };
    expect(JSON.parse(JSON.stringify(data))).toEqual(data);
  });
});
