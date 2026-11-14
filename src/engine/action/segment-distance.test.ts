import { describe, expect, it } from "vitest";
import { distanceToSegment } from "./segment-distance";

describe("distanceToSegment", () => {
  const a = { x: 0, y: 0 };
  const b = { x: 10, y: 0 };

  it("measures the perpendicular distance inside the segment", () => {
    expect(distanceToSegment({ x: 4, y: 3 }, a, b)).toBe(3);
  });

  it("measures the distance to the nearest end beyond the segment", () => {
    expect(distanceToSegment({ x: 13, y: 4 }, a, b)).toBe(5);
    expect(distanceToSegment({ x: -3, y: 4 }, a, b)).toBe(5);
  });

  it("handles a zero-length segment", () => {
    expect(distanceToSegment({ x: 3, y: 4 }, a, a)).toBe(5);
  });
});
