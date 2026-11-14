import { describe, expect, it } from "vitest";
import { FORMATIONS } from "./formation";
import { FORMATION_OFFSETS, MAX_FORMATION_OFFSET, PHASE_RATINGS } from "./formation-offsets";

describe("FORMATION_OFFSETS", () => {
  it("has a row for every formation and every phase rating", () => {
    for (const formation of FORMATIONS) {
      expect(Object.keys(FORMATION_OFFSETS[formation]).sort()).toEqual([...PHASE_RATINGS].sort());
    }
  });

  it("keeps every offset within the bound", () => {
    expect(MAX_FORMATION_OFFSET).toBe(0.06);
    for (const formation of FORMATIONS) {
      for (const phase of PHASE_RATINGS) {
        expect(Math.abs(FORMATION_OFFSETS[formation][phase])).toBeLessThanOrEqual(0.06);
      }
    }
  });

  it("leaves 4-4-2 unchanged", () => {
    for (const phase of PHASE_RATINGS) expect(FORMATION_OFFSETS["4-4-2"][phase]).toBe(0);
  });

  it("gives attacking formations more chance creation and less defending", () => {
    expect(FORMATION_OFFSETS["3-5-2"].buildUp).toBeGreaterThan(0);
    expect(FORMATION_OFFSETS["3-5-2"].defending).toBeLessThan(0);
    expect(FORMATION_OFFSETS["5-3-2"].defending).toBeGreaterThan(0);
    expect(FORMATION_OFFSETS["5-3-2"].chanceCreation).toBeLessThan(0);
  });
});
