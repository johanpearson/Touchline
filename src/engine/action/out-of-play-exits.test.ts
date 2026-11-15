import { describe, expect, it } from "vitest";
import { exitPoint } from "./out-of-play";
import type { Point } from "./pitch-metres";

const at = (x: number, y: number): Point => ({ x, y });

describe("exitPoint in every direction", () => {
  it.each([
    ["to the left along the pitch", at(60, 34), at(50, 34), "endLine", at(0, 34)],
    ["to the right along the pitch", at(60, 34), at(70, 34), "endLine", at(105, 34)],
    ["towards the lower touchline", at(50, 20), at(50, 10), "sideLine", at(50, 0)],
    ["towards the upper touchline", at(50, 40), at(50, 50), "sideLine", at(50, 68)],
    [
      "steeply up and right, over the touchline",
      at(50, 34),
      at(60, 64),
      "sideLine",
      at(60 + 10 * (4 / 30), 68),
    ],
    [
      "steeply down and left, over the touchline",
      at(50, 34),
      at(40, 4),
      "sideLine",
      at(40 - 10 * (4 / 30), 0),
    ],
    [
      "shallow down and left, over the goal line",
      at(50, 34),
      at(10, 30),
      "endLine",
      at(0, 30 - 4 * 0.25),
    ],
    [
      "shallow down and right, over the goal line",
      at(50, 34),
      at(90, 30),
      "endLine",
      at(105, 30 - 4 * 0.375),
    ],
    [
      "shallow up and left, over the goal line",
      at(50, 34),
      at(10, 38),
      "endLine",
      at(0, 38 + 4 * 0.25),
    ],
    [
      "shallow up and right, over the goal line",
      at(50, 34),
      at(90, 38),
      "endLine",
      at(105, 38 + 4 * 0.375),
    ],
  ] as const)("leaves %s", (_label, from, to, boundary, point) => {
    const exit = exitPoint(from, to);
    expect(exit.boundary).toBe(boundary);
    expect(exit.point.x).toBeCloseTo(point.x, 9);
    expect(exit.point.y).toBeCloseTo(point.y, 9);
  });

  it("calls an exit exactly through the corner a goal-line exit", () => {
    const exit = exitPoint(at(95, 58), at(100, 63));
    expect(exit.boundary).toBe("endLine");
    expect(exit.point).toEqual(at(105, 68));
  });

  it("treats a ball that does not move in one axis as moving only in the other", () => {
    expect(exitPoint(at(60, 34), at(70, 34)).point.y).toBe(34);
    expect(exitPoint(at(50, 20), at(50, 10)).point.x).toBe(50);
  });

  it("heads for the attacking goal line when the ball does not move at all", () => {
    const exit = exitPoint(at(60, 20), at(60, 20));
    expect(exit.boundary).toBe("endLine");
    expect(exit.point).toEqual(at(105, 20));
  });

  it("falls back to the same direction when only one coordinate is unchanged from the start", () => {
    const sideways = exitPoint(at(60, 20), at(60, 30));
    expect(sideways.boundary).toBe("sideLine");
    const along = exitPoint(at(60, 20), at(70, 20));
    expect(along.boundary).toBe("endLine");
  });
});
