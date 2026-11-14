import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../match-event";
import { computeMatchStats } from "../match-stats";
import { aMatchInputV2 } from "./action-builders";
import {
  carry,
  clearance,
  foul,
  interception,
  pass,
  periodChange,
  setPiece,
  shot,
  tackle,
} from "./action-event-builders";
import { computeActionStats } from "./action-stats";
import { createActionMatch } from "./create-action-match";
import { toZoneEvents } from "./to-zone-events";

const only = (events: Parameters<typeof toZoneEvents>[0]): MatchEvent[] => toZoneEvents(events);

const ball = (x: number, y: number) => ({ from: { x: 50, y: 34 }, to: { x, y } });

describe("toZoneEvents", () => {
  it("maps a completed forward pass of the home side to progress at the pass end", () => {
    const [event] = only([pass("home", "h1", "h2", "complete", { time: 4.2, ...ball(63, 17) })]);
    expect(event).toMatchObject({
      type: "progress",
      team: "home",
      time: 4.2,
      position: { x: 63 / 105, y: 0.25 },
    });
  });

  it("treats forward as towards the goal the side attacks, so away passes towards x = 0 progress", () => {
    const events = only([
      pass("away", "a1", "a2", "complete", { time: 1, ...ball(40, 34) }),
      pass("away", "a2", "a3", "complete", {
        time: 2,
        from: { x: 40, y: 34 },
        to: { x: 55, y: 34 },
      }),
    ]);
    expect(events.map((e) => e.type)).toEqual(["progress", "lateral"]);
  });

  it("maps a sideways or backwards completed pass to lateral", () => {
    const events = only([
      pass("home", "h1", "h2", "complete", {
        time: 1,
        from: { x: 50, y: 10 },
        to: { x: 50, y: 40 },
      }),
      pass("home", "h2", "h3", "complete", {
        time: 2,
        from: { x: 50, y: 40 },
        to: { x: 40, y: 40 },
      }),
    ]);
    expect(events.map((e) => e.type)).toEqual(["lateral", "lateral"]);
  });

  it("maps a kept forward carry to progress", () => {
    const [event] = only([carry("home", "h1", "kept", { time: 3, ...ball(60, 34) })]);
    expect(event?.type).toBe("progress");
  });

  it("gives a turnover to the side that wins the ball, at the place it is won", () => {
    const events = only([
      pass("home", "h1", "h2", "complete", { time: 1, ...ball(55, 34) }),
      pass("home", "h2", "h3", "intercepted", { time: 2, ...ball(60, 34) }),
      pass("away", "a1", "a2", "complete", {
        time: 3,
        from: { x: 60, y: 34 },
        to: { x: 50, y: 34 },
      }),
    ]);
    expect(events[1]).toMatchObject({ type: "turnover", team: "away", time: 2 });
    expect(events[2]?.team).toBe("away");
  });

  it.each([
    ["a lost carry", carry("home", "h1", "tackled", { time: 2 }), "away"],
    ["a won tackle", tackle("away", "a1", "won", { time: 2 }), "away"],
    ["an interception", interception("away", "a1", { time: 2 }), "away"],
  ] as const)("gives %s a turnover for the side that now has the ball", (_name, event, team) => {
    const events = only([pass("home", "h1", "h2", "complete", { time: 1 }), event]);
    expect(events[1]).toMatchObject({ type: "turnover", team });
  });

  it("keeps possession with the dribbler after a lost tackle", () => {
    const events = only([
      carry("home", "h1", "kept", { time: 1 }),
      tackle("away", "a1", "lost", { time: 2, from: { x: 55, y: 34 }, to: { x: 55, y: 34 } }),
    ]);
    expect(events[1]).toMatchObject({ type: "lateral", team: "home" });
  });

  it("maps shots one to one with their xG and a goal to a shot plus a goal event", () => {
    const events = only([
      shot("home", "h1", "saved", 0.31, "ag", { time: 5, ...ball(100, 30) }),
      shot("home", "h1", "goal", 0.4, "ag", { time: 9, ...ball(105, 34) }),
    ]);
    expect(events).toMatchObject([
      { type: "shot", outcome: "saved", xg: 0.31, team: "home", time: 5 },
      { type: "shot", outcome: "goal", xg: 0.4, team: "home", time: 9 },
      { type: "goal", xg: 0.4, team: "home", time: 9, intensity: 1 },
    ]);
  });

  it.each([
    ["blocked", "blocked"],
    ["missed", "missed"],
    ["woodwork", "missed"],
  ] as const)("maps a %s shot to the zone outcome %s", (outcome, expected) => {
    const [event] = only([shot("away", "a1", outcome, 0.1, "hg", { time: 1 })]);
    expect(event).toMatchObject({ type: "shot", outcome: expected });
  });

  it("maps kickoffs and corners to kickoff and corner events of the taking side", () => {
    const events = only([
      setPiece("away", "a1", "kickoff", { time: 0 }),
      setPiece("home", "h1", "corner", { time: 8 }),
    ]);
    expect(events).toMatchObject([
      { type: "kickoff", team: "away", intensity: 0.3 },
      { type: "corner", team: "home", intensity: 0.45 },
    ]);
  });

  it("maps a throw-in, goal kick, free kick or penalty to a turnover when possession changes and lateral otherwise", () => {
    const events = only([
      pass("home", "h1", "h2", "outOfPlay", {
        time: 1,
        from: { x: 50, y: 34 },
        to: { x: 50, y: 68 },
      }),
      setPiece("away", "a1", "throwIn", { time: 2 }),
      setPiece("away", "a1", "goalKick", { time: 3, from: { x: 5, y: 34 }, to: { x: 5, y: 34 } }),
    ]);
    expect(events.map((e) => e.type)).toEqual(["lateral", "turnover", "lateral"]);
  });

  it("maps a foul to a foul event of the fouled side", () => {
    const [event] = only([foul("home", "h1", "a1", { time: 6 })]);
    expect(event).toMatchObject({ type: "foul", team: "home", time: 6 });
  });

  it("passes period changes through with the period that starts", () => {
    const events = only([
      periodChange(2700, "halfTime"),
      periodChange(2705, "secondHalf"),
      periodChange(5400, "fullTime"),
    ]);
    expect(events).toMatchObject([
      { type: "periodChange", period: "halfTime", intensity: 0 },
      { type: "periodChange", period: "secondHalf" },
      { type: "periodChange", period: "fullTime" },
    ]);
  });

  it("maps a clearance of the holding side by direction and a won one as a turnover", () => {
    const events = only([
      pass("away", "a1", "a2", "complete", {
        time: 0,
        from: { x: 50, y: 34 },
        to: { x: 50, y: 34 },
      }),
      interception("home", "h1", { time: 1 }),
      clearance("home", "h1", { time: 2, from: { x: 10, y: 34 }, to: { x: 40, y: 34 } }),
    ]);
    expect(events.map((e) => e.type)).toEqual(["lateral", "turnover", "progress"]);
  });

  it("derives intensity from how far the ball has advanced", () => {
    const events = only([
      pass("home", "h1", "h2", "complete", {
        time: 1,
        from: { x: 20, y: 34 },
        to: { x: 31.5, y: 34 },
      }),
      pass("home", "h1", "h2", "complete", {
        time: 2,
        from: { x: 31.5, y: 34 },
        to: { x: 105, y: 34 },
      }),
    ]);
    expect(events[0]?.intensity).toBeCloseTo(0.18 + 0.75 * 0.09);
    expect(events[1]?.intensity).toBeCloseTo(0.93);
  });

  it("returns nothing for no events", () => {
    expect(toZoneEvents([])).toEqual([]);
  });
});

const playedMatch = (seed: number) => {
  const match = createActionMatch(aMatchInputV2().build(), seed);
  match.advanceTo(6000);
  match.resume();
  match.advanceTo(12000);
  return match.events;
};

describe("toZoneEvents over played matches", () => {
  const seeds = Array.from({ length: 20 }, (_, i) => i + 1);

  it("keeps the times monotonic", () => {
    for (const seed of seeds) {
      const times = toZoneEvents(playedMatch(seed)).map((e) => e.time);
      expect(times).toEqual([...times].sort((a, b) => a - b));
    }
  });

  it("keeps goals, shots, corners and fouls equal to the source", () => {
    for (const seed of seeds) {
      const source = playedMatch(seed);
      const adapted = toZoneEvents(source);
      const count = (type: MatchEvent["type"]) => adapted.filter((e) => e.type === type).length;
      expect(count("goal")).toBe(
        source.filter((e) => e.type === "shot" && e.outcome === "goal").length,
      );
      expect(count("shot")).toBe(source.filter((e) => e.type === "shot").length);
      expect(count("corner")).toBe(
        source.filter((e) => e.type === "setPiece" && e.variant === "corner").length,
      );
      expect(count("foul")).toBe(source.filter((e) => e.type === "foul").length);
    }
  });

  it("keeps every position on the normalised pitch and every intensity within 0..1", () => {
    for (const event of toZoneEvents(playedMatch(3))) {
      expect(event.position.x).toBeGreaterThanOrEqual(0);
      expect(event.position.x).toBeLessThanOrEqual(1);
      expect(event.position.y).toBeGreaterThanOrEqual(0);
      expect(event.position.y).toBeLessThanOrEqual(1);
      expect(event.intensity).toBeGreaterThanOrEqual(0);
      expect(event.intensity).toBeLessThanOrEqual(1);
    }
  });

  it("gives zone stats that agree with the action stats on shots and possession", () => {
    for (const seed of seeds) {
      const source = playedMatch(seed);
      const zone = computeMatchStats(toZoneEvents(source), 12000);
      const action = computeActionStats(source, 12000).teams;
      expect(zone.shots).toEqual(action.shots);
      expect(zone.shotsOnTarget).toEqual(action.shotsOnTarget);
      expect(zone.corners).toEqual(action.corners);
      expect(Math.abs(zone.possession.home - action.possession.home)).toBeLessThan(0.03);
    }
  });
});
