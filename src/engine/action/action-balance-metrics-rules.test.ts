import { describe, expect, it } from "vitest";
import { COUNTER_WINDOW_SECONDS, matchMetrics } from "./action-balance-metrics";
import {
  carry,
  foul,
  interception,
  pass,
  periodChange,
  shot,
  tackle,
} from "./action-event-builders";
import { CENTRAL_SHOT_CHANNEL } from "./decision-constants";

const at = (x: number, y = 34) => ({ x, y });
const none = { home: 0, away: 0 };

describe("matchMetrics turnovers", () => {
  it.each([
    [
      "a pass intercepted by the other side",
      pass("home", "h", "h2", "intercepted", { to: at(30) }),
      "away",
      30,
    ],
    [
      "a carry tackled by the other side",
      carry("home", "h", "tackled", { to: at(30) }),
      "away",
      30,
    ],
    ["a tackle won by the tackler's side", tackle("home", "h", "won", { to: at(70) }), "home", 70],
    ["an interception", interception("home", "h", { to: at(70) }), "home", 70],
  ] as const)(
    "counts %s as a turnover for the side that wins the ball",
    (_label, event, winner, x) => {
      const m = matchMetrics([event]);
      expect(m.highTurnovers[winner]).toBe(1);
      expect(m.highTurnovers[winner === "home" ? "away" : "home"]).toBe(0);
      expect(x).toBeGreaterThan(0);
    },
  );

  it.each([
    ["a completed pass", pass("home", "h", "h2", "complete", { to: at(70) })],
    ["an incomplete pass", pass("home", "h", "h2", "incomplete", { to: at(70) })],
    ["a pass out of play", pass("home", "h", "h2", "outOfPlay", { to: at(70) })],
    ["a kept carry", carry("home", "h", "kept", { to: at(70) })],
    ["a lost tackle", tackle("home", "h", "lost", { to: at(70) })],
  ] as const)("does not count %s as a turnover", (_label, event) => {
    const m = matchMetrics([event]);
    expect(m.highTurnovers).toEqual(none);
    expect(m.countersConceded).toEqual(none);
  });

  it("only counts a turnover as high when the ball is won strictly in the opponent half", () => {
    const home = (x: number) => matchMetrics([interception("home", "h", { to: at(x) })]);
    expect(home(52.5).highTurnovers).toEqual(none);
    expect(home(52.6).highTurnovers).toEqual({ home: 1, away: 0 });
    const away = (x: number) => matchMetrics([interception("away", "a", { to: at(x) })]);
    expect(away(52.5).highTurnovers).toEqual(none);
    expect(away(52.4).highTurnovers).toEqual({ home: 0, away: 1 });
  });

  it("does not record turnovers or counters for events that win nobody the ball", () => {
    const m = matchMetrics([
      pass("home", "h", "h2", "complete", { time: 1 }),
      shot("home", "h", "missed", 0.1, "gk", { time: 5 }),
    ]);
    expect(m.countersConceded).toEqual(none);
    expect(m.highTurnovers).toEqual(none);
  });
});

describe("matchMetrics counters", () => {
  const won = interception("home", "h", { time: 100, to: at(70) });

  it("counts a shot exactly at the counter window and not a hair later", () => {
    const inside = matchMetrics([
      won,
      shot("home", "h", "missed", 0.1, "gk", { time: 100 + COUNTER_WINDOW_SECONDS }),
    ]);
    expect(inside.countersConceded).toEqual({ home: 0, away: 1 });
    const outside = matchMetrics([
      won,
      shot("home", "h", "missed", 0.1, "gk", { time: 100 + COUNTER_WINDOW_SECONDS + 0.1 }),
    ]);
    expect(outside.countersConceded).toEqual(none);
  });

  it("charges the counter to the side that conceded, whichever side shoots", () => {
    const awayWon = interception("away", "a", { time: 100, to: at(30) });
    const m = matchMetrics([awayWon, shot("away", "a", "saved", 0.2, "gk", { time: 110 })]);
    expect(m.countersConceded).toEqual({ home: 1, away: 0 });
  });

  it("does not count a shot by the side that has not just won the ball", () => {
    const m = matchMetrics([won, shot("away", "a", "missed", 0.1, "gk", { time: 105 })]);
    expect(m.countersConceded).toEqual(none);
  });

  it("measures from the latest turnover of the shooting side", () => {
    const later = interception("home", "h", { time: 200, to: at(70) });
    const m = matchMetrics([won, later, shot("home", "h", "missed", 0.1, "gk", { time: 215 })]);
    expect(m.countersConceded).toEqual({ home: 0, away: 1 });
    const stale = matchMetrics([
      won,
      shot("home", "h", "missed", 0.1, "gk", { time: 115 }),
      shot("home", "h", "missed", 0.1, "gk", { time: 125 }),
    ]);
    expect(stale.countersConceded).toEqual({ home: 0, away: 1 });
  });
});

describe("matchMetrics classification of other events", () => {
  it("counts a penalty only for a foul event that awards one, to the fouled side", () => {
    const penalty = { ...foul("home", "h", "a"), outcome: "penalty" as const };
    const m = matchMetrics([penalty, foul("away", "a", "h")]);
    expect(m.penalties).toEqual({ home: 1, away: 0 });
  });

  it("counts crosses by the side that crosses and no other pass", () => {
    const cross = { ...pass("away", "a", "a2"), variant: "cross" as const };
    const m = matchMetrics([
      cross,
      pass("home", "h", "h2"),
      { ...pass("home", "h", "h2"), variant: "long" as const },
    ]);
    expect(m.crosses).toEqual({ home: 0, away: 1 });
  });

  it("counts a shot as central up to and including the channel edge, on both sides of the middle", () => {
    const from = (y: number) => ({ from: at(90, y) });
    const central = (y: number) =>
      matchMetrics([shot("home", "h", "saved", 0.1, "gk", from(y))]).centralShots.home;
    expect(central(34 + CENTRAL_SHOT_CHANNEL)).toBe(1);
    expect(central(34 - CENTRAL_SHOT_CHANNEL)).toBe(1);
    expect(central(34 + CENTRAL_SHOT_CHANNEL + 0.1)).toBe(0);
    expect(central(34 - CENTRAL_SHOT_CHANNEL - 0.1)).toBe(0);
  });

  it("counts every action by its team but not period changes", () => {
    const m = matchMetrics([
      pass("home", "h", "h2"),
      pass("home", "h", "h2"),
      pass("away", "a", "a2"),
      periodChange(2700, "halfTime"),
    ]);
    expect(m.actions).toEqual({ home: 2, away: 1 });
  });

  it("gives all zeros for an empty log", () => {
    const m = matchMetrics([]);
    expect(m.actions).toEqual(none);
    expect(m.highTurnovers).toEqual(none);
    expect(m.shots).toEqual(none);
  });
});
