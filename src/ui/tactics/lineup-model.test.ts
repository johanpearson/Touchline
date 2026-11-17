import { describe, expect, it } from "vitest";
import type { Player, SquadPlan } from "../../game";
import {
  benchCandidates,
  benchEdit,
  orderedStarters,
  starterCandidates,
  starterEdit,
} from "./lineup-model";

const player = (id: string, position: Player["position"]): Player =>
  ({ id, name: id.toUpperCase(), position }) as Player;

const PLAYERS = [
  player("g1", "GK"),
  player("g2", "GK"),
  player("d1", "DEF"),
  player("d2", "DEF"),
  player("d3", "DEF"),
  player("m1", "MID"),
  player("m2", "MID"),
  player("f1", "FWD"),
  player("f2", "FWD"),
];
const BY_ID = new Map(PLAYERS.map((p) => [p.id, p]));

const plan = (starters: string[], bench: string[]): SquadPlan =>
  ({ formation: "4-4-2", starters, bench }) as SquadPlan;

describe("orderedStarters", () => {
  it("orders goalkeeper, defence, midfield, attack and keeps the plan order inside a line", () => {
    expect(orderedStarters(["f1", "d2", "m1", "g1", "d1"], BY_ID)).toEqual([
      "g1",
      "d2",
      "d1",
      "m1",
      "f1",
    ]);
  });
});

describe("starterEdit", () => {
  const base = plan(["g1", "d1", "d2", "m1"], ["g2", "d3", "m2", "f1"]);

  it("puts a player who is not in the plan in the starter's place", () => {
    expect(starterEdit(base, "d1", "f2")).toEqual({ starters: ["g1", "f2", "d2", "m1"] });
  });

  it("sends the starter to the bench slot of the bench player who comes on", () => {
    expect(starterEdit(base, "d1", "d3")).toEqual({
      starters: ["g1", "d3", "d2", "m1"],
      bench: ["g2", "d1", "m2", "f1"],
    });
  });
});

describe("benchEdit", () => {
  it("swaps two bench players", () => {
    const base = plan(["g1"], ["g2", "d3", "m2"]);
    expect(benchEdit(base, "d3", "m2")).toEqual({ bench: ["g2", "m2", "d3"] });
  });

  it("puts a player from outside the squad plan on the bench", () => {
    const base = plan(["g1"], ["g2", "d3", "m2"]);
    expect(benchEdit(base, "m2", "f2")).toEqual({ bench: ["g2", "d3", "f2"] });
  });
});

describe("starterCandidates", () => {
  const base = plan(["g1", "d1", "d2"], ["g2", "d3", "m2"]);

  it("lists only players of the slot's position", () => {
    const list = starterCandidates(PLAYERS, base, "d1", "DEF");
    expect(list.map((c) => c.player.id)).toEqual(["d1", "d2", "d3"]);
  });

  it("disables other starters but not the current player, the bench or players outside the plan", () => {
    const list = starterCandidates(PLAYERS, base, "d1", "DEF");
    expect(Object.fromEntries(list.map((c) => [c.player.id, c.disabled]))).toEqual({
      d1: false,
      d2: true,
      d3: false,
    });
  });
});

describe("benchCandidates", () => {
  it("lists every player and disables starters", () => {
    const base = plan(["g1", "d1"], ["g2", "d3", "m2"]);
    const list = benchCandidates(PLAYERS, base, "d3", BY_ID);
    expect(list).toHaveLength(PLAYERS.length);
    expect(list.find((c) => c.player.id === "g1")?.disabled).toBe(true);
    expect(list.find((c) => c.player.id === "d1")?.disabled).toBe(true);
    expect(list.find((c) => c.player.id === "m1")?.disabled).toBe(false);
  });

  it("only allows goalkeepers in the slot of the bench's only goalkeeper", () => {
    const base = plan(["g1", "d1"], ["g2", "d3", "m2"]);
    const list = benchCandidates(PLAYERS, base, "g2", BY_ID);
    expect(list.find((c) => c.player.id === "m1")?.disabled).toBe(true);
    expect(list.find((c) => c.player.id === "g2")?.disabled).toBe(false);
  });

  it("allows any player in a keeper's slot when the bench has two goalkeepers", () => {
    const base = plan(["g1"], ["g2", "d3", "g3"]);
    const players = [...PLAYERS, player("g3", "GK")];
    const list = benchCandidates(players, base, "g2", new Map(players.map((p) => [p.id, p])));
    expect(list.find((c) => c.player.id === "m1")?.disabled).toBe(false);
  });
});
