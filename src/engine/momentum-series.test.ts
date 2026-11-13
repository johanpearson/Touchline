import { describe, expect, it } from "vitest";
import type { MatchEvent } from "./match-event";
import type { Side } from "./match-state";
import { momentumSeries } from "./momentum-series";

const ev = (time: number, team: Side, type: MatchEvent["type"], intensity: number): MatchEvent =>
  ({ type, time, team, position: { x: 0.5, y: 0.5 }, intensity }) as MatchEvent;

describe("momentumSeries", () => {
  it("returns one value per time bucket up to the requested time", () => {
    expect(momentumSeries([], 600, 60)).toHaveLength(10);
  });

  it("returns an empty series at time zero", () => {
    expect(momentumSeries([], 0, 60)).toEqual([]);
  });

  it("counts home danger as positive and away danger as negative", () => {
    const events = [ev(10, "home", "progress", 0.4), ev(70, "away", "progress", 0.3)];

    const series = momentumSeries(events, 120, 60);

    expect(series[0]).toBeCloseTo(0.4);
    expect(series[1]).toBeCloseTo(-0.3);
  });

  it("sums the danger of several events in one bucket", () => {
    const events = [ev(10, "home", "progress", 0.4), ev(20, "away", "corner", 0.1)];

    expect(momentumSeries(events, 60, 60)[0]).toBeCloseTo(0.3);
  });

  it("ignores events that create no danger", () => {
    const events = [ev(0, "home", "kickoff", 0.3), ev(10, "away", "turnover", 0.2)];

    expect(momentumSeries(events, 60, 60)).toEqual([0]);
  });

  it("ignores events after the requested time", () => {
    const events = [ev(100, "home", "progress", 0.5)];

    expect(momentumSeries(events, 60, 60)).toEqual([0]);
  });

  it("rejects a non-positive bucket size", () => {
    expect(() => momentumSeries([], 60, 0)).toThrow(RangeError);
  });
});
