import { describe, expect, it } from "vitest";
import type { Lineup } from "./lineup";
import { liveSquadAfter } from "./live-squad";
import type { PlayerPosition } from "./squad-player";

const naturalOf = (id: string): PlayerPosition =>
  (({ g: "GK", d: "DEF", m: "MID", f: "FWD" }) as const)[id.slice(0, 1) as "g" | "d" | "m" | "f"];
const plan: Lineup = {
  formation: "4-4-2",
  starters: ["g1", "d1", "d2", "d3", "d4", "m1", "m2", "m3", "m4", "f1", "f2"],
  bench: ["g2", "d5", "m5", "f3", "f4", "m6", "d6"],
};

describe("liveSquadAfter with formation changes", () => {
  it("plays the eleven in the new formation's lines after a formation change", () => {
    const live = liveSquadAfter(plan, [], naturalOf, [
      { minute: 60, formation: "4-3-3", substitutionsBefore: 0 },
    ]);

    const lines = (p: PlayerPosition) =>
      live.starters.filter((id) => (live.played[id] ?? naturalOf(id)) === p).length;
    expect([lines("GK"), lines("DEF"), lines("MID"), lines("FWD")]).toEqual([1, 4, 3, 3]);
    expect(live.starters).toEqual(plan.starters);
  });

  it("puts a substitute who came on before the change in the line the change gives him", () => {
    const live = liveSquadAfter(
      plan,
      [{ minute: 50, halfTime: false, off: "m4", on: "f3" }],
      naturalOf,
      [{ minute: 60, formation: "3-4-3", substitutionsBefore: 1 }],
    );

    expect(live.starters).toContain("f3");
    const lines = (p: PlayerPosition) =>
      live.starters.filter((id) => (live.played[id] ?? naturalOf(id)) === p).length;
    expect([lines("DEF"), lines("MID"), lines("FWD")]).toEqual([3, 4, 3]);
  });

  it("puts a substitute who came on after the change in the place of the player replaced", () => {
    const live = liveSquadAfter(
      plan,
      [{ minute: 70, halfTime: false, off: "f2", on: "m5" }],
      naturalOf,
      [{ minute: 60, formation: "4-3-3", substitutionsBefore: 0 }],
    );

    const offPosition =
      liveSquadAfter(plan, [], naturalOf, [
        { minute: 60, formation: "4-3-3", substitutionsBefore: 0 },
      ]).played.f2 ?? "FWD";
    expect(live.played.m5).toBe(offPosition);
  });

  it("is the same as before when there is no formation change", () => {
    expect(liveSquadAfter(plan, [], naturalOf, [])).toEqual(liveSquadAfter(plan, [], naturalOf));
  });
});
