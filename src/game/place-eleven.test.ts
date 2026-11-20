import { describe, expect, it } from "vitest";
import { placeEleven } from "./place-eleven";
import type { PlayerPosition } from "./squad-player";

/** Ids carry the natural position: "d1" is a defender. */
const naturalOf = (id: string): PlayerPosition => {
  const kind = id.slice(0, 1);
  return ({ g: "GK", d: "DEF", m: "MID", f: "FWD" } as const)[kind as "g" | "d" | "m" | "f"];
};
const eleven442 = ["g1", "d1", "d2", "d3", "d4", "m1", "m2", "m3", "m4", "f1", "f2"];

describe("placeEleven", () => {
  it("keeps everyone in the own position when the formation is the one they already fill", () => {
    const placed = placeEleven(eleven442, "4-4-2", naturalOf, naturalOf);

    expect(placed).toEqual(Object.fromEntries(eleven442.map((id) => [id, naturalOf(id)])));
  });

  it("moves the fewest players, one line only, from 4-4-2 to 4-3-3", () => {
    const placed = placeEleven(eleven442, "4-3-3", naturalOf, naturalOf);

    const moved = eleven442.filter((id) => placed?.[id] !== naturalOf(id));
    expect(moved).toHaveLength(1);
    expect(moved[0]?.startsWith("m")).toBe(true);
    expect(placed?.[moved[0] as string]).toBe("FWD");
  });

  it("fills every line of the new formation", () => {
    const placed = placeEleven(eleven442, "3-5-2", naturalOf, naturalOf);

    const count = (p: PlayerPosition) => Object.values(placed ?? {}).filter((x) => x === p).length;
    expect([count("GK"), count("DEF"), count("MID"), count("FWD")]).toEqual([1, 3, 5, 2]);
  });

  it("keeps the goalkeeper in goal", () => {
    expect(placeEleven(eleven442, "5-3-2", naturalOf, naturalOf)?.g1).toBe("GK");
  });

  it("prefers the position a player plays now when the rating loss is the same", () => {
    const playedNow = (id: string): PlayerPosition => (id === "f2" ? "MID" : naturalOf(id));

    const placed = placeEleven(eleven442, "4-5-1", playedNow, naturalOf);

    expect(placed?.f2).toBe("MID");
    expect(placed?.f1).toBe("FWD");
  });

  it("places by the rating loss against the natural position, so a defender stays a defender", () => {
    const playedNow = (id: string): PlayerPosition => (id === "d1" ? "MID" : naturalOf(id));

    const placed = placeEleven(eleven442, "4-4-2", playedNow, naturalOf);

    expect(placed?.d1).toBe("DEF");
  });

  it("is the same every time", () => {
    expect(placeEleven(eleven442, "3-4-3", naturalOf, naturalOf)).toEqual(
      placeEleven(eleven442, "3-4-3", naturalOf, naturalOf),
    );
  });

  it("returns undefined without exactly one goalkeeper", () => {
    const noKeeper = ["d0", ...eleven442.slice(1)];

    expect(placeEleven(noKeeper, "4-4-2", naturalOf, naturalOf)).toBeUndefined();
  });
});
