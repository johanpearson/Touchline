import { describe, expect, it } from "vitest";
import { createMatch } from "./create-match";
import { aMatchInput } from "./match-builders";
import type { MatchEvent } from "./match-event";
import type { PitchPosition, Side } from "./match-state";
import { computeMatchStats } from "./match-stats";

const centre: PitchPosition = { x: 0.5, y: 0.5 };
const ev = (
  time: number,
  team: Side,
  type: "kickoff" | "progress" | "turnover" | "corner",
  position: PitchPosition = centre,
): MatchEvent => ({ type, time, team, position, intensity: 0.5 });
const shot = (
  time: number,
  team: Side,
  outcome: "goal" | "saved" | "missed" | "blocked",
  xg: number,
): MatchEvent => ({ type: "shot", time, team, position: centre, intensity: 0.8, xg, outcome });
const goal = (time: number, team: Side, xg: number): MatchEvent => ({
  type: "goal",
  time,
  team,
  position: centre,
  intensity: 1,
  xg,
});
const periodChange = (time: number, period: "halfTime" | "fullTime"): MatchEvent => ({
  type: "periodChange",
  time,
  team: "home",
  position: centre,
  intensity: 0,
  period,
});

describe("computeMatchStats", () => {
  it("returns zeroed stats and even shares for an empty event log", () => {
    const stats = computeMatchStats([], 600);

    expect(stats.possession).toEqual({ home: 0.5, away: 0.5 });
    expect(stats.fieldTilt).toEqual({ home: 0.5, away: 0.5 });
    expect(stats.shots).toEqual({ home: 0, away: 0 });
    expect(stats.corners).toEqual({ home: 0, away: 0 });
  });

  it("measures possession as the share of time each team held the ball", () => {
    const events = [ev(0, "home", "kickoff"), ev(300, "away", "turnover")];

    const stats = computeMatchStats(events, 400);

    expect(stats.possession.home).toBeCloseTo(0.75);
    expect(stats.possession.away).toBeCloseTo(0.25);
  });

  it("counts time up to the requested moment only", () => {
    const events = [ev(0, "home", "kickoff"), ev(300, "away", "turnover")];

    const stats = computeMatchStats(events, 100);

    expect(stats.possession).toEqual({ home: 1, away: 0 });
  });

  it("ignores events after the requested moment", () => {
    const events = [
      ev(0, "home", "kickoff"),
      shot(200, "home", "saved", 0.1),
      ev(300, "home", "corner"),
    ];

    const stats = computeMatchStats(events, 100);

    expect(stats.shots.home).toBe(0);
    expect(stats.corners.home).toBe(0);
  });

  it("does not credit possession during half-time", () => {
    const events = [
      ev(0, "home", "kickoff"),
      periodChange(100, "halfTime"),
      ev(100, "away", "kickoff"),
    ];

    const stats = computeMatchStats(events, 200);

    expect(stats.possession.home).toBeCloseTo(0.5);
    expect(stats.possession.away).toBeCloseTo(0.5);
  });

  it("measures field tilt as time with the ball in each team's attacking half", () => {
    const events = [
      ev(0, "home", "kickoff"),
      ev(100, "home", "progress", { x: 0.8, y: 0.5 }),
      ev(400, "away", "turnover", { x: 0.2, y: 0.5 }),
    ];

    const stats = computeMatchStats(events, 500);

    // home attacking half: 100..400 = 300s, away attacking half: 400..500 = 100s
    expect(stats.fieldTilt.home).toBeCloseTo(0.75);
    expect(stats.fieldTilt.away).toBeCloseTo(0.25);
  });

  it("counts shots, shots on target and xG per team", () => {
    const events = [
      ev(0, "home", "kickoff"),
      shot(10, "home", "saved", 0.1),
      shot(20, "home", "missed", 0.05),
      shot(30, "away", "blocked", 0.2),
      shot(40, "away", "goal", 0.3),
      goal(40, "away", 0.3),
    ];

    const stats = computeMatchStats(events, 60);

    expect(stats.shots).toEqual({ home: 2, away: 2 });
    expect(stats.shotsOnTarget).toEqual({ home: 1, away: 1 });
    expect(stats.xg.home).toBeCloseTo(0.15);
    expect(stats.xg.away).toBeCloseTo(0.5);
  });

  it("counts corners per team", () => {
    const events = [ev(0, "home", "kickoff"), ev(10, "home", "corner"), ev(20, "away", "corner")];

    const stats = computeMatchStats(events, 60);

    expect(stats.corners).toEqual({ home: 1, away: 1 });
  });

  it("can be computed at any time of a simulated match", () => {
    const match = createMatch(aMatchInput().build(), 7);
    match.advanceTo(2700);

    const half = computeMatchStats(match.events, 1350);
    const later = computeMatchStats(match.events, 2700);

    expect(later.shots.home + later.shots.away).toBeGreaterThanOrEqual(
      half.shots.home + half.shots.away,
    );
    expect(half.possession.home + half.possession.away).toBeCloseTo(1);
  });
});
