import { describe, expect, it } from "vitest";
import { aClub, aFullSquad, aLineup, aPlayer, aSquad } from "./game-builders";
import { validateLineup } from "./lineup";

describe("game builders", () => {
  it("builds a player with overridden fields and leaves the rest default", () => {
    const player = aPlayer().withPosition("FWD").withFinishing(18).build();
    expect(player.position).toBe("FWD");
    expect(player.finishing).toBe(18);
    expect(player.passing).toBe(10);
  });

  it("sets every attribute at once", () => {
    expect(aPlayer().withAllAttributes(3).build()).toMatchObject({ passing: 3, reflexes: 3 });
  });

  it("builds a club with colours and player ids", () => {
    const club = aClub().withPlayerIds(["a", "b"]).withColours("#000", "#fff").build();
    expect(club.playerIds).toEqual(["a", "b"]);
    expect(club.colours).toEqual({ primary: "#000", secondary: "#fff" });
  });

  it("builds a squad with unique ids", () => {
    const squad = aSquad();
    expect(new Set(squad.map((p) => p.id)).size).toBe(squad.length);
  });

  it("sets each single field via its with-method", () => {
    const p = aPlayer()
      .withId("x")
      .withName("N")
      .withAge(30)
      .withPassing(1)
      .withBallControl(2)
      .withDribbling(3)
      .withPace(4)
      .withVision(5)
      .withFinishing(6)
      .withWorkRate(7)
      .withTackling(8)
      .withPositioning(9)
      .withStrength(11)
      .withHandling(12)
      .withReflexes(13)
      .build();
    expect(p).toMatchObject({
      id: "x",
      name: "N",
      age: 30,
      passing: 1,
      ballControl: 2,
      dribbling: 3,
      pace: 4,
      vision: 5,
      finishing: 6,
      workRate: 7,
      tackling: 8,
      positioning: 9,
      strength: 11,
      handling: 12,
      reflexes: 13,
    });
    const c = aClub().withId("i").withName("n").withShortName("s").build();
    expect(c).toMatchObject({ id: "i", name: "n", shortName: "s" });
  });
});

describe("aLineup", () => {
  it("builds a valid lineup over aFullSquad", () => {
    expect(validateLineup(aLineup().build(), aFullSquad())).toEqual({ ok: true });
  });

  it("overrides formation, starters and bench", () => {
    const lineup = aLineup().withFormation("3-5-2").withStarters(["a"]).withBench(["b"]).build();
    expect(lineup).toEqual({ formation: "3-5-2", starters: ["a"], bench: ["b"] });
  });
});
