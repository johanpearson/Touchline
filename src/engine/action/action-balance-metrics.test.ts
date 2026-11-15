import { describe, expect, it } from "vitest";
import { matchMetrics } from "./action-balance-metrics";
import {
  carry,
  foul,
  interception,
  pass,
  periodChange,
  setPiece,
  shot,
} from "./action-event-builders";

describe("matchMetrics", () => {
  it("counts shots, passes and restarts per side", () => {
    const events = [
      pass("home", "h1", "h2", "complete", { time: 1 }),
      pass("home", "h2", "h3", "intercepted", { time: 4 }),
      shot("away", "a1", "saved", 0.2, "gk", { time: 20 }),
      setPiece("home", "h1", "corner", { time: 30 }),
      setPiece("away", "a1", "throwIn", { time: 40 }),
      setPiece("away", "a1", "goalKick", { time: 50 }),
    ];

    const m = matchMetrics(events);

    expect(m.passes).toEqual({ home: 2, away: 0 });
    expect(m.completedPasses).toEqual({ home: 1, away: 0 });
    expect(m.shots).toEqual({ home: 0, away: 1 });
    expect(m.shotsOnTarget).toEqual({ home: 0, away: 1 });
    expect(m.xg.away).toBeCloseTo(0.2);
    expect(m.corners).toEqual({ home: 1, away: 0 });
    expect(m.throwIns).toEqual({ home: 0, away: 1 });
    expect(m.goalKicks).toEqual({ home: 0, away: 1 });
  });

  it("counts fouls by offender and penalties by the fouled side", () => {
    const penalty = { ...foul("home", "h1", "a1", { time: 5 }), outcome: "penalty" as const };

    const m = matchMetrics([foul("home", "h1", "a1", { time: 1 }), penalty]);

    expect(m.fouls).toEqual({ home: 0, away: 2 });
    expect(m.penalties).toEqual({ home: 1, away: 0 });
  });

  it("counts turnovers won in the opponent half as high turnovers", () => {
    const high = interception("home", "h1", { to: { x: 70, y: 34 } });
    const low = interception("home", "h1", { time: 9, to: { x: 30, y: 34 } });
    const awayHigh = carry("home", "h1", "tackled", { time: 20, to: { x: 40, y: 34 } });

    const m = matchMetrics([high, low, awayHigh]);

    expect(m.highTurnovers).toEqual({ home: 1, away: 1 });
  });

  it("counts a shot within 20 s of the opponent's turnover as conceded on a counter", () => {
    const events = [
      interception("home", "h1", { time: 100 }),
      shot("home", "h1", "missed", 0.1, "gk", { time: 115 }),
      shot("home", "h1", "missed", 0.1, "gk", { time: 130 }),
    ];

    const m = matchMetrics(events);

    expect(m.countersConceded).toEqual({ home: 0, away: 1 });
  });

  it("counts crosses, central shots and actions", () => {
    const cross = { ...pass("home", "h1", "h2"), variant: "cross" as const };
    const central = shot("home", "h1", "saved", 0.2, "gk", { from: { x: 90, y: 34 } });
    const wide = shot("home", "h1", "saved", 0.1, "gk", { from: { x: 90, y: 10 } });

    const m = matchMetrics([cross, central, wide, periodChange(2700, "halfTime")]);

    expect(m.crosses.home).toBe(1);
    expect(m.centralShots.home).toBe(1);
    expect(m.actions.home).toBe(3);
  });
});
