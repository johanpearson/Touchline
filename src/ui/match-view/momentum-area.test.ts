import { describe, expect, it } from "vitest";
import { type MomentumAreaOptions, momentumArea } from "./momentum-area";

const options = (overrides: Partial<MomentumAreaOptions> = {}): MomentumAreaOptions => ({
  width: 300,
  height: 80,
  minScale: 1,
  bucketSeconds: 30,
  duration: 5400,
  matchTime: 300,
  halfTime: 2700,
  goals: [],
  ...overrides,
});

/** Every y coordinate in a path made of `M x,y`, `L x,y` and `C x,y x,y x,y` commands. */
const ys = (path: string): number[] =>
  [...path.matchAll(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g)].map((m) => Number(m[2]));

describe("momentumArea", () => {
  it("draws nothing for an empty series but still places the centre line and the playhead", () => {
    const area = momentumArea([], options({ matchTime: 0 }));
    expect(area.home.area).toBe("");
    expect(area.away.area).toBe("");
    expect(area.centreY).toBe(40);
    expect(area.playheadX).toBe(0);
  });

  it("draws one bucket as a flat area on its own side only", () => {
    const area = momentumArea([1], options({ matchTime: 30 }));
    expect(area.home.area).not.toBe("");
    expect(Math.min(...ys(area.home.area))).toBe(0);
    expect(Math.max(...ys(area.home.area))).toBe(40);
    expect(Math.min(...ys(area.away.area))).toBeGreaterThanOrEqual(40);
    expect(Math.max(...ys(area.away.area))).toBe(40);
  });

  it("mirrors a symmetric series around the centre line", () => {
    const area = momentumArea([1, -1, 1, -1], options({ matchTime: 120 }));
    const up = ys(area.home.line).map((y) => 40 - y);
    const down = ys(area.away.line).map((y) => y - 40);
    expect(up.length).toBeGreaterThan(0);
    expect(down.map((n) => Math.round(n * 100))).not.toEqual([]);
    expect(Math.max(...up)).toBeCloseTo(Math.max(...down), 1);
  });

  it("never lets smoothing draw a swing larger than the data", () => {
    const area = momentumArea([0, 0, 4, 0, 0], options({ matchTime: 150, minScale: 1 }));
    const heights = ys(area.home.area).map((y) => 40 - y);
    expect(Math.max(...heights)).toBeLessThanOrEqual(40);
    expect(Math.max(...heights)).toBeGreaterThan(0);
    expect(Math.min(...ys(area.home.area))).toBeGreaterThanOrEqual(0);
    expect(Math.min(...ys(area.away.area))).toBeGreaterThanOrEqual(40);
  });

  it("does not overshoot below the centre line next to a spike", () => {
    const area = momentumArea([0, 0, 4, 0, 0], options({ matchTime: 150 }));
    expect(Math.max(...ys(area.home.area))).toBeLessThanOrEqual(40);
  });

  it("keeps the minimum scale so a quiet match is not inflated", () => {
    const quiet = momentumArea([0.1, 0.1, 0.1], options({ matchTime: 90, minScale: 2 }));
    const peak = 40 - Math.min(...ys(quiet.home.line));
    expect(peak).toBeCloseTo(2, 1);
  });

  it("places one goal marker per goal on the centre line at the goal's time", () => {
    const area = momentumArea(
      [1, 0],
      options({
        matchTime: 3000,
        goals: [
          { time: 540, side: "home" },
          { time: 2700, side: "away" },
        ],
      }),
    );
    expect(area.goals).toEqual([
      { side: "home", time: 540, x: 30, y: 40 },
      { side: "away", time: 2700, x: 150, y: 40 },
    ]);
  });

  it("leaves out goals that have not happened yet", () => {
    const area = momentumArea(
      [],
      options({ matchTime: 100, goals: [{ time: 500, side: "home" }] }),
    );
    expect(area.goals).toEqual([]);
  });

  it.each([
    [0, 0],
    [2700, 150],
    [5400, 300],
  ])("puts the playhead for %i seconds at x=%i", (matchTime, x) => {
    expect(momentumArea([], options({ matchTime })).playheadX).toBe(x);
  });

  it("stretches the time axis when added time runs past the nominal length", () => {
    const area = momentumArea([], options({ matchTime: 6000 }));
    expect(area.playheadX).toBe(300);
    expect(area.halfTimeX).toBeCloseTo((2700 / 6000) * 300, 5);
  });

  it("draws only as far as the match has been played", () => {
    const area = momentumArea([1, 1, 1], options({ matchTime: 90 }));
    const xs = [...area.home.area.matchAll(/(-?\d+(?:\.\d+)?),/g)].map((m) => Number(m[1]));
    expect(Math.max(...xs)).toBeCloseTo(area.playheadX, 1);
  });

  it("places a thin marker for every change the clock has reached", () => {
    const area = momentumArea([1, 1], options({ matchTime: 600, changeTimes: [150, 900] }));
    expect(area.changes).toEqual([{ time: 150, x: 8.33 }]);
  });

  it("has no change markers without changes", () => {
    expect(momentumArea([1], options()).changes).toEqual([]);
  });
});
