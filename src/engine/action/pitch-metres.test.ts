import { describe, expect, it } from "vitest";
import { fromNormalised, inPitch, PITCH_LENGTH, PITCH_WIDTH, toNormalised } from "./pitch-metres";

describe("pitch in metres", () => {
  it("is 105 by 68 metres", () => {
    expect(PITCH_LENGTH).toBe(105);
    expect(PITCH_WIDTH).toBe(68);
  });

  it("accepts points inside the pitch and on its lines", () => {
    expect(inPitch({ x: 52.5, y: 34 })).toBe(true);
    expect(inPitch({ x: 0, y: 0 })).toBe(true);
    expect(inPitch({ x: 105, y: 68 })).toBe(true);
  });

  it.each([
    { x: -0.1, y: 10 },
    { x: 105.1, y: 10 },
    { x: 10, y: -0.1 },
    { x: 10, y: 68.1 },
  ])("rejects the point outside the pitch %o", (point) => {
    expect(inPitch(point)).toBe(false);
  });

  it("converts the centre spot to the normalised centre", () => {
    expect(toNormalised({ x: 52.5, y: 34 })).toEqual({ x: 0.5, y: 0.5 });
  });

  it("converts a normalised position to metres", () => {
    expect(fromNormalised({ x: 0.2, y: 0.25 })).toEqual({ x: 21, y: 17 });
  });

  it("converts the corners exactly", () => {
    expect(toNormalised({ x: 105, y: 68 })).toEqual({ x: 1, y: 1 });
    expect(fromNormalised({ x: 1, y: 1 })).toEqual({ x: 105, y: 68 });
    expect(fromNormalised({ x: 0, y: 0 })).toEqual({ x: 0, y: 0 });
  });

  it("round-trips through normalised coordinates", () => {
    const point = { x: 30.5, y: 12.25 };
    const back = fromNormalised(toNormalised(point));
    expect(back.x).toBeCloseTo(point.x, 10);
    expect(back.y).toBeCloseTo(point.y, 10);
  });
});
