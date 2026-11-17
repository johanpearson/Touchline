import { describe, expect, it } from "vitest";
import { FORMATION_SHAPE, FORMATIONS } from "../../game";
import { pitchSlots } from "./pitch-layout";

describe("pitchSlots", () => {
  it("gives eleven slots for every formation, in goalkeeper, defence, midfield, attack order", () => {
    for (const formation of FORMATIONS) {
      const slots = pitchSlots(formation);
      expect(slots).toHaveLength(11);
      const shape = FORMATION_SHAPE[formation];
      const count = (line: string) => slots.filter((s) => s.line === line).length;
      expect([count("GK"), count("DEF"), count("MID"), count("FWD")]).toEqual([
        shape.GK,
        shape.DEF,
        shape.MID,
        shape.FWD,
      ]);
      expect(slots.map((s) => s.line)).toEqual(
        [...slots.map((s) => s.line)].sort(
          (a, b) => ["GK", "DEF", "MID", "FWD"].indexOf(a) - ["GK", "DEF", "MID", "FWD"].indexOf(b),
        ),
      );
    }
  });

  it("puts the goalkeeper at the bottom and the forwards at the top, centred in each line", () => {
    const slots = pitchSlots("4-4-2");
    const [keeper] = slots;
    expect(keeper?.y).toBeGreaterThan(80);
    expect(keeper?.x).toBe(50);
    const forwards = slots.filter((s) => s.line === "FWD");
    expect(forwards.map((s) => s.x)).toEqual([33.3, 66.7]);
    expect(forwards.every((s) => s.y < 30)).toBe(true);
  });

  it("keeps every slot inside the pitch with room for a 44 px target", () => {
    for (const formation of FORMATIONS) {
      for (const slot of pitchSlots(formation)) {
        expect(slot.x).toBeGreaterThanOrEqual(10);
        expect(slot.x).toBeLessThanOrEqual(90);
        expect(slot.y).toBeGreaterThanOrEqual(8);
        expect(slot.y).toBeLessThanOrEqual(92);
      }
    }
  });

  it("names left to right: a back four is left back, two centre backs, right back", () => {
    expect(
      pitchSlots("4-4-2")
        .filter((s) => s.line === "DEF")
        .map((s) => s.role),
    ).toEqual(["leftBack", "leftCentreBack", "rightCentreBack", "rightBack"]);
  });

  it("gives every slot of a formation a different role", () => {
    for (const formation of FORMATIONS) {
      const roles = pitchSlots(formation).map((s) => s.role);
      expect(new Set(roles).size).toBe(11);
    }
  });
});
