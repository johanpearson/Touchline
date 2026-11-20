import { describe, expect, it } from "vitest";
import type { EnginePlayer } from "../../engine";
import { energyFactor } from "../../engine";
import { buildLineupRows, TIRED_ENERGY, tiredIds } from "./lineup-rows";

const attrs = (value: number): EnginePlayer["attributes"] => ({
  passing: value,
  ballControl: value,
  dribbling: value,
  pace: value,
  vision: value,
  finishing: value,
  workRate: value,
  tackling: value,
  positioning: value,
  strength: value,
  handling: value,
  reflexes: value,
});
const player = (id: string, value = 12): EnginePlayer => ({
  id,
  position: "MID",
  attributes: attrs(value),
});
const names = { h1: "Ek", h2: "Berg", h3: "Lind", h4: "Strand" };
const lineup = {
  onPitch: [player("h1"), player("h2")],
  bench: [player("h3")],
  off: [player("h4")],
};
const rowsOf = (energy: Record<string, number>) =>
  buildLineupRows({ lineup, side: "home", energy, names, goals: {}, matchRatings: {} });

describe("buildLineupRows", () => {
  it("lists the pitch first, then the bench, then those substituted off", () => {
    const rows = rowsOf({});
    expect(rows.map((r) => [r.id, r.status])).toEqual([
      ["h1", "pitch"],
      ["h2", "pitch"],
      ["h3", "bench"],
      ["h4", "off"],
    ]);
  });

  it("gives a player who has not played full energy and the full rating", () => {
    const row = rowsOf({})[0];
    expect(row?.energy).toBe(100);
    expect(row?.rating).toBe(12);
  });

  it("lowers the rating of a tired player by the engine's energy factor", () => {
    const row = rowsOf({ h1: 40 })[0];
    expect(row?.energy).toBe(40);
    expect(row?.rating).toBeCloseTo(12 * energyFactor(40), 6);
  });

  it("flags a pitch player under the tired threshold, and nobody on the bench or off", () => {
    const rows = rowsOf({ h1: TIRED_ENERGY - 1, h2: TIRED_ENERGY, h3: 10, h4: 10 });
    expect(rows.map((r) => r.tired)).toEqual([true, false, false, false]);
  });

  it("rounds energy for display", () => {
    expect(rowsOf({ h1: 63.6 })[0]?.energy).toBe(64);
  });
});

describe("tiredIds", () => {
  it("lists the tired players on the pitch", () => {
    expect(tiredIds(rowsOf({ h1: 10, h2: 90 }))).toEqual(["h1"]);
  });
});
