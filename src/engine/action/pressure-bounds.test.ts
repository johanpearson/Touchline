import { describe, expect, it } from "vitest";
import { pressureOn } from "./pressure";
import { PRESSURE_RADIUS, PRESSURE_SATURATION } from "./shape-constants";

const at = (x: number, y = 34) => ({ x, y });
const awayOnly = (...points: { x: number; y: number }[]) => ({ home: [], away: points });

describe("pressureOn reach", () => {
  it("gives no pressure from an opponent exactly the radius away along either axis", () => {
    expect(pressureOn(at(50), "home", awayOnly(at(50 + PRESSURE_RADIUS)))).toBe(0);
    expect(pressureOn(at(50), "home", awayOnly(at(50, 34 + PRESSURE_RADIUS)))).toBe(0);
    expect(pressureOn(at(50), "home", awayOnly(at(50 - PRESSURE_RADIUS)))).toBe(0);
    expect(pressureOn(at(50), "home", awayOnly(at(50, 34 - PRESSURE_RADIUS)))).toBe(0);
  });

  it("gives a little pressure from an opponent a hair inside the radius", () => {
    const hair = 0.001;
    const expected = hair / PRESSURE_RADIUS / PRESSURE_SATURATION;
    expect(pressureOn(at(50), "home", awayOnly(at(50 + PRESSURE_RADIUS - hair)))).toBeCloseTo(
      expected,
      9,
    );
    expect(pressureOn(at(50), "home", awayOnly(at(50, 34 + PRESSURE_RADIUS - hair)))).toBeCloseTo(
      expected,
      9,
    );
  });

  it("measures the distance in both axes together", () => {
    const radius = 10;
    expect(pressureOn(at(50), "home", awayOnly(at(53, 38)), radius)).toBeCloseTo(0.25, 10);
  });

  it("gives nothing for an opponent inside the radius on each axis but outside it as the crow flies", () => {
    const side = PRESSURE_RADIUS * 0.8;
    expect(pressureOn(at(50), "home", awayOnly(at(50 + side, 34 + side)))).toBe(0);
  });

  it("uses a given radius instead of the default", () => {
    const opponent = awayOnly(at(56));
    expect(pressureOn(at(50), "home", opponent, 5)).toBe(0);
    expect(pressureOn(at(50), "home", opponent, 12)).toBeCloseTo(0.25, 10);
    expect(pressureOn(at(50), "home", opponent)).toBeCloseTo(
      (1 - 6 / PRESSURE_RADIUS) / PRESSURE_SATURATION,
      10,
    );
  });

  it("is full pressure from the saturation count of opponents on the spot and no more beyond it", () => {
    const crowd = Array.from({ length: PRESSURE_SATURATION }, () => at(50));
    expect(pressureOn(at(50), "home", awayOnly(...crowd))).toBe(1);
    expect(pressureOn(at(50), "home", awayOnly(...crowd, at(50), at(51)))).toBe(1);
  });

  it("counts opponents on either side of the point", () => {
    expect(pressureOn(at(50), "home", awayOnly(at(46), at(54)))).toBeCloseTo(0.25 + 0.25, 10);
  });
});
