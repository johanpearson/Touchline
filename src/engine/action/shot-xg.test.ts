import { describe, expect, it } from "vitest";
import { MAX_SHOT_XG, PENALTY_XG } from "./decision-constants";
import { shotXg, toAttackingFrame } from "./shot-xg";

const at = (x: number, y = 34) => ({ x, y });

describe("shotXg (v2)", () => {
  it("gives exact values for a few central points", () => {
    expect(shotXg(at(99.5), 0)).toBeCloseTo(0.18598, 4);
    expect(shotXg(at(94), 0)).toBeCloseTo(0.0334, 4);
    expect(shotXg(at(87), 0)).toBeCloseTo(0.00741, 4);
    expect(shotXg(at(75), 0)).toBeCloseTo(0.0009, 4);
  });

  it("is worth more closer, more central and less pressured", () => {
    expect(shotXg(at(94), 0)).toBeGreaterThan(shotXg(at(87), 0));
    expect(shotXg(at(94, 34), 0)).toBeGreaterThan(shotXg(at(94, 10), 0));
    expect(shotXg(at(94), 0)).toBeGreaterThan(shotXg(at(94), 1));
    expect(shotXg(at(94), 1)).toBeCloseTo(0.0167, 4);
  });

  it("is mirrored left and right of the goal", () => {
    expect(shotXg(at(94, 20), 0)).toBeCloseTo(shotXg(at(94, 48), 0), 10);
  });

  it("is worth less with the head", () => {
    expect(shotXg(at(94), 0, "head")).toBeCloseTo(0.02004, 4);
    expect(shotXg(at(94), 0, "foot")).toBeCloseTo(shotXg(at(94), 0), 10);
  });

  it("is capped at the named maximum, also on the goal line", () => {
    expect(shotXg(at(105), 0)).toBe(MAX_SHOT_XG);
    expect(MAX_SHOT_XG).toBe(0.6);
  });

  it("is practically zero from the own half", () => {
    expect(shotXg(at(40), 0)).toBeLessThan(0.001);
  });

  it("names the penalty xG", () => {
    expect(PENALTY_XG).toBe(0.76);
  });
});

describe("toAttackingFrame", () => {
  it("keeps home points and mirrors away points so both attack towards x = 105", () => {
    expect(toAttackingFrame("home", at(90, 10))).toEqual(at(90, 10));
    expect(toAttackingFrame("away", at(15, 10))).toEqual(at(90, 10));
  });
});
