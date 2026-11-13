import { describe, expect, it } from "vitest";
import { aPlayer, aSquad } from "./game-builders";
import { pickBestEleven } from "./pick-best-eleven";

const count = (players: { position: string }[], position: string) =>
  players.filter((p) => p.position === position).length;

describe("pickBestEleven", () => {
  it("picks one GK, four DEF, four MID and two FWD", () => {
    const eleven = pickBestEleven(aSquad());
    expect([
      count(eleven, "GK"),
      count(eleven, "DEF"),
      count(eleven, "MID"),
      count(eleven, "FWD"),
    ]).toEqual([1, 4, 4, 2]);
  });

  it("prefers the forwards with the best key attributes", () => {
    const squad = [
      ...aSquad(),
      aPlayer()
        .withId("star")
        .withPosition("FWD")
        .withFinishing(20)
        .withPace(20)
        .withDribbling(20)
        .build(),
    ];
    expect(pickBestEleven(squad).map((p) => p.id)).toContain("star");
  });

  it("prefers the better goalkeeper", () => {
    const squad = [
      ...aSquad(),
      aPlayer().withId("wall").withPosition("GK").withHandling(20).withReflexes(20).build(),
    ];
    expect(pickBestEleven(squad)[0]?.id).toBe("wall");
  });

  it("breaks ties by id so the result does not depend on input order", () => {
    const squad = aSquad();
    const reversed = [...squad].reverse();
    expect(pickBestEleven(reversed).map((p) => p.id)).toEqual(
      pickBestEleven(squad).map((p) => p.id),
    );
    expect(
      pickBestEleven(squad)
        .filter((p) => p.position === "FWD")
        .map((p) => p.id),
    ).toEqual(["p-FWD-0", "p-FWD-1"]);
  });

  it("throws when the squad cannot fill the shape", () => {
    const noKeeper = aSquad().filter((p) => p.position !== "GK");
    expect(() => pickBestEleven(noKeeper)).toThrow(RangeError);
    const fewDefenders = aSquad().filter((p) => p.position !== "DEF" || p.id.endsWith("0"));
    expect(() => pickBestEleven(fewDefenders)).toThrow(/DEF/);
  });
});
