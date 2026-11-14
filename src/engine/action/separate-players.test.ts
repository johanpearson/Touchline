import { describe, expect, it } from "vitest";
import { separate } from "./separate-players";
import { MIN_PLAYER_DISTANCE } from "./shape-constants";

const free = (p: { x: number; y: number }) => p;

describe("separate", () => {
  it("leaves players that are far enough apart where they are", () => {
    const points = [
      { x: 10, y: 10 },
      { x: 20, y: 10 },
    ];

    expect(separate(points, [], free)).toEqual(points);
  });

  it("moves only the free player away from a fixed one", () => {
    const [a, b] = separate(
      [
        { x: 10, y: 10 },
        { x: 11, y: 10 },
      ],
      [0],
      free,
    );

    expect(a).toEqual({ x: 10, y: 10 });
    expect(Math.hypot((b?.x ?? 0) - 10, (b?.y ?? 0) - 10)).toBeGreaterThanOrEqual(
      MIN_PLAYER_DISTANCE,
    );
  });

  it("splits coincident players along y by slot order", () => {
    const [a, b] = separate(
      [
        { x: 10, y: 10 },
        { x: 10, y: 10 },
      ],
      [],
      free,
    );

    expect(a?.y).toBeLessThan(10);
    expect(b?.y).toBeGreaterThan(10);
  });

  it("leaves two fixed players and pairs with the exempt slot alone", () => {
    const close = [
      { x: 10, y: 10 },
      { x: 11, y: 10 },
      { x: 10, y: 11 },
    ];

    expect(separate(close, [0, 1, 2], free)).toEqual(close);
    expect(separate(close, [], free, 0).slice(0, 1)).toEqual([close[0]]);
  });

  it("applies the limit to a moved player", () => {
    const [, b] = separate(
      [
        { x: 10, y: 10 },
        { x: 11, y: 10 },
      ],
      [0],
      (p) => ({ x: Math.min(p.x, 11), y: p.y }),
    );

    expect(b?.x).toBeLessThanOrEqual(11);
  });
});
