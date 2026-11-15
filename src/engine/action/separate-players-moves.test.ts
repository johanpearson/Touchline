import { describe, expect, it } from "vitest";
import type { Point } from "./pitch-metres";
import { separate } from "./separate-players";
import { MIN_PLAYER_DISTANCE } from "./shape-constants";

const free = (p: Point) => p;
const at = (x: number, y: number): Point => ({ x, y });
/** The first pass pushes a pair at distance d by this much in total (the margin keeps them clear). */
const push = (d: number) => MIN_PLAYER_DISTANCE - d + 0.01;

describe("separate displacements", () => {
  it("moves two free players half the push each, along the line between them", () => {
    const [a, b] = separate([at(10, 10), at(11, 10)], [], free) as [Point, Point];
    expect(a.x).toBeCloseTo(10 - push(1) / 2, 9);
    expect(b.x).toBeCloseTo(11 + push(1) / 2, 9);
    expect(a.y).toBe(10);
    expect(b.y).toBe(10);
  });

  it("moves two free players apart along y when they stand one above the other", () => {
    const [a, b] = separate([at(10, 10), at(10, 12)], [], free) as [Point, Point];
    expect(a.y).toBeCloseTo(10 - push(2) / 2, 9);
    expect(b.y).toBeCloseTo(12 + push(2) / 2, 9);
    expect(a.x).toBe(10);
    expect(b.x).toBe(10);
  });

  it("uses the unit vector of a diagonal pair", () => {
    const d = Math.SQRT2;
    const [a, b] = separate([at(10, 10), at(11, 11)], [], free) as [Point, Point];
    const step = push(d) / 2 / Math.SQRT2;
    expect(a.x).toBeCloseTo(10 - step, 9);
    expect(a.y).toBeCloseTo(10 - step, 9);
    expect(b.x).toBeCloseTo(11 + step, 9);
    expect(b.y).toBeCloseTo(11 + step, 9);
  });

  it("gives the whole push to a free player next to a fixed one, whichever of the pair is fixed", () => {
    const afterFirstFixed = separate([at(10, 10), at(11, 10)], [0], free);
    expect(afterFirstFixed[0]).toEqual(at(10, 10));
    expect((afterFirstFixed[1] as Point).x).toBeCloseTo(11 + push(1), 9);
    const afterSecondFixed = separate([at(11, 10), at(10, 10)], [1], free);
    expect(afterSecondFixed[1]).toEqual(at(10, 10));
    expect((afterSecondFixed[0] as Point).x).toBeCloseTo(11 + push(1), 9);
  });

  it("splits coincident free players along y, the lower slot towards lower y, x unchanged", () => {
    const [a, b] = separate([at(10, 10), at(10, 10)], [], free) as [Point, Point];
    expect(a.x).toBe(10);
    expect(b.x).toBe(10);
    expect(a.y).toBeCloseTo(10 - push(0) / 2, 9);
    expect(b.y).toBeCloseTo(10 + push(0) / 2, 9);
  });

  it("moves a free player the whole push along y away from a coincident fixed player", () => {
    const [a, b] = separate([at(10, 10), at(10, 10)], [0], free) as [Point, Point];
    expect(a).toEqual(at(10, 10));
    expect(b.x).toBe(10);
    expect(b.y).toBeCloseTo(10 + push(0), 9);
  });

  it("does not move a pair at exactly the minimum distance", () => {
    const points = [at(10, 10), at(10 + MIN_PLAYER_DISTANCE, 10)];
    expect(separate(points, [], free)).toEqual(points);
  });

  it("moves a pair just inside the minimum distance", () => {
    const [a, b] = separate([at(10, 10), at(10 + MIN_PLAYER_DISTANCE - 0.001, 10)], [], free) as [
      Point,
      Point,
    ];
    expect(b.x - a.x).toBeGreaterThanOrEqual(MIN_PLAYER_DISTANCE);
  });

  it("repeats passes until a crowd of free players is clear", () => {
    const crowd = [at(10, 10), at(10.5, 10), at(11, 10), at(10.5, 10.5)];
    const result = separate(crowd, [], free);
    for (let i = 0; i < result.length; i++) {
      for (let j = i + 1; j < result.length; j++) {
        const a = result[i] as Point;
        const b = result[j] as Point;
        expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeGreaterThanOrEqual(MIN_PLAYER_DISTANCE - 1e-9);
      }
    }
  });

  it("leaves a pair with the exempt slot alone even when it is the lower or the higher slot", () => {
    const points = [at(10, 10), at(11, 10)];
    expect(separate(points, [], free, 0)).toEqual(points);
    expect(separate(points, [], free, 1)).toEqual(points);
  });

  it("does not change the points it was given", () => {
    const points = [at(10, 10), at(11, 10)];
    separate(points, [], free);
    expect(points).toEqual([at(10, 10), at(11, 10)]);
  });

  it("applies the limit to every moved player, and only to moved players", () => {
    const calls: Point[] = [];
    const spy = (p: Point) => {
      calls.push(p);
      return p;
    };
    separate([at(10, 10), at(11, 10), at(40, 40)], [], spy);
    expect(calls).toHaveLength(2);
  });
});
