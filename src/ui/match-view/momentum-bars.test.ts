import { describe, expect, it } from "vitest";
import { momentumBars } from "./momentum-bars";

describe("momentumBars", () => {
  it("draws home pressure above the centre line and away pressure below", () => {
    const [home, away] = momentumBars([1, -1], { width: 100, height: 40, minScale: 1 });
    expect(home?.side).toBe("home");
    expect(home?.y).toBeLessThan(20);
    expect(away?.side).toBe("away");
    expect(away?.y).toBe(20);
  });

  it("scales the tallest bucket to half the height", () => {
    const [bar] = momentumBars([4], { width: 100, height: 40, minScale: 1 });
    expect(bar?.height).toBe(20);
  });

  it("keeps small values small by never scaling below the minimum", () => {
    const [bar] = momentumBars([0.5], { width: 100, height: 40, minScale: 2 });
    expect(bar?.height).toBe(5);
  });

  it("gives every bucket an equal slice of the width", () => {
    const bars = momentumBars([1, 1, 1, 1], { width: 100, height: 40, minScale: 1 });
    expect(bars.map((b) => b.x)).toEqual([0, 25, 50, 75]);
    expect(bars.every((b) => b.width === 25)).toBe(true);
  });

  it("returns nothing for an empty series", () => {
    expect(momentumBars([], { width: 100, height: 40, minScale: 1 })).toEqual([]);
  });

  it("leaves empty buckets without a visible bar", () => {
    const [bar] = momentumBars([0], { width: 100, height: 40, minScale: 1 });
    expect(bar?.height).toBe(0);
  });
});
