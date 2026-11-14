import { describe, expect, it } from "vitest";
import { FORMATION_SHAPE, FORMATIONS } from "./formation";

describe("FORMATION_SHAPE", () => {
  it.each(FORMATIONS)("fills eleven places with one goalkeeper in %s", (formation) => {
    const shape = FORMATION_SHAPE[formation];
    expect(shape.GK + shape.DEF + shape.MID + shape.FWD).toBe(11);
    expect(shape.GK).toBe(1);
  });

  it("matches the DEF-MID-FWD name of each formation", () => {
    for (const formation of FORMATIONS) {
      const [def, mid, fwd] = formation.split("-").map(Number);
      expect(FORMATION_SHAPE[formation]).toEqual({ GK: 1, DEF: def, MID: mid, FWD: fwd });
    }
  });

  it("lists the six formations", () => {
    expect(FORMATIONS).toHaveLength(6);
  });
});
