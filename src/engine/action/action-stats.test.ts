import { describe, expect, it } from "vitest";
import { aMatchInput } from "./action-builders";
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

const playedMatch = (seed: number) => {
  const match = createActionMatch(aMatchInput().build(), seed);
  match.advanceTo(6000);
  match.resume();
  match.advanceTo(12000);
  return match;
};

describe("computeActionStats team stats", () => {
  it("counts shots, shots on target and xG per side", () => {
    const events = [
      shot("home", "h1", "goal", 0.4, "ag", { time: 1 }),
      shot("home", "h1", "saved", 0.1, "ag", { time: 2 }),
      shot("home", "h2", "woodwork", 0.2, "ag", { time: 3 }),
      shot("away", "a1", "blocked", 0.05, "hg", { time: 4 }),
    ];
    const { teams } = computeActionStats(events, 100);
    expect(teams.shots).toEqual({ home: 3, away: 1 });
    expect(teams.shotsOnTarget).toEqual({ home: 2, away: 0 });
    expect(teams.xg.home).toBeCloseTo(0.7);
    expect(teams.xg.away).toBeCloseTo(0.05);
  });

  it("counts restarts by the side taking them and fouls by the side committing them", () => {
    const events = [
      setPiece("home", "h1", "corner", { time: 1 }),
      setPiece("away", "a1", "throwIn", { time: 2 }),
      setPiece("away", "a1", "throwIn", { time: 3 }),
      setPiece("home", "h1", "goalKick", { time: 4 }),
      foul("home", "h2", "a2", { time: 5 }),
    ];
    const { teams } = computeActionStats(events, 100);
    expect(teams.corners).toEqual({ home: 1, away: 0 });
    expect(teams.throwIns).toEqual({ home: 0, away: 2 });
    expect(teams.goalKicks).toEqual({ home: 1, away: 0 });
    expect(teams.fouls).toEqual({ home: 0, away: 1 });
  });

  it("counts passes and pass completion per side", () => {
    const events = [
      pass("home", "h1", "h2", "complete", { time: 1 }),
      pass("home", "h2", "h3", "complete", { time: 2 }),
      pass("home", "h3", "h4", "complete", { time: 3 }),
      pass("home", "h4", "h5", "intercepted", { time: 4 }),
    ];
    const { teams } = computeActionStats(events, 100);
    expect(teams.passes).toEqual({ home: 4, away: 0 });
    expect(teams.completedPasses).toEqual({ home: 3, away: 0 });
    expect(teams.passCompletion).toEqual({ home: 0.75, away: 0 });
  });

  it("splits possession by time on the ball and gives the ball away on an interception", () => {
    const events = [
      pass("home", "h1", "h2", "complete", { time: 0 }),
      pass("home", "h2", "h3", "intercepted", { time: 30 }),
      pass("away", "a1", "a2", "complete", { time: 40 }),
    ];
    const { teams } = computeActionStats(events, 60);
    // home 0-30, away 30-60 (interception hands the ball to away at once)
    expect(teams.possession).toEqual({ home: 0.5, away: 0.5 });
  });

  it("hands the ball to the other side after a lost carry and a lost tackle", () => {
    const lostCarry = [carry("home", "h1", "tackled", { time: 0 })];
    expect(computeActionStats(lostCarry, 10).teams.possession.away).toBe(1);
    const lostTackle = [tackle("home", "h1", "lost", { time: 0 })];
    expect(computeActionStats(lostTackle, 10).teams.possession.away).toBe(1);
    const wonTackle = [tackle("home", "h1", "won", { time: 0 })];
    expect(computeActionStats(wonTackle, 10).teams.possession.home).toBe(1);
  });

  it("stops the clock at half-time and full time", () => {
    const events = [
      pass("home", "h1", "h2", "complete", { time: 0 }),
      periodChange(45, "halfTime"),
      periodChange(50, "secondHalf"),
      pass("away", "a1", "a2", "complete", { time: 50 }),
    ];
    const { teams } = computeActionStats(events, 95);
    // the half-time pause is not possession; home 0-45, away 50-95
    expect(teams.possession.home).toBeCloseTo(0.5);
  });

  it("measures field tilt by where the ball is", () => {
    const events = [
      pass("home", "h1", "h2", "complete", { time: 0, to: { x: 80, y: 34 } }),
      pass("away", "a1", "a2", "complete", { time: 10, to: { x: 20, y: 34 } }),
      pass("away", "a1", "a2", "complete", { time: 40, to: { x: 52.5, y: 34 } }),
    ];
    const { teams } = computeActionStats(events, 50);
    expect(teams.fieldTilt.home).toBeCloseTo(0.25);
    expect(teams.fieldTilt.away).toBeCloseTo(0.75);
  });

  it("is 0.5 each before anything happened", () => {
    const { teams } = computeActionStats([], 0);
    expect(teams.possession).toEqual({ home: 0.5, away: 0.5 });
    expect(teams.fieldTilt).toEqual({ home: 0.5, away: 0.5 });
  });

  it("counts only events up to the given time", () => {
    const events = [
      shot("home", "h1", "goal", 0.4, "ag", { time: 10 }),
      shot("home", "h1", "goal", 0.4, "ag", { time: 20 }),
    ];
    expect(computeActionStats(events, 15).teams.shots.home).toBe(1);
    expect(computeActionStats(events, 20).teams.shots.home).toBe(2);
  });
});

describe("computeActionStats player lines", () => {
  it("fills every counter of a player", () => {
    const events = [
      pass("home", "h1", "h2", "complete", { time: 1 }),
      shot("home", "h2", "goal", 0.4, "ag", { time: 2 }),
      pass("home", "h1", "h3", "incomplete", { time: 3 }),
      shot("home", "h3", "saved", 0.1, "ag", { time: 4 }),
      tackle("away", "a1", "won", { time: 5 }),
      tackle("away", "a1", "lost", { time: 6 }),
      interception("away", "a1", { time: 7 }),
      clearance("away", "a1", { time: 8 }),
      foul("home", "h1", "a1", { time: 9 }),
    ];
    const { players } = computeActionStats(events, 100);
    expect(players.h1).toMatchObject({
      passes: 2,
      completedPasses: 1,
      passCompletion: 0.5,
      keyPasses: 1,
    });
    expect(players.h2).toMatchObject({ shots: 1, shotsOnTarget: 1, goals: 1, xg: 0.4 });
    expect(players.h3).toMatchObject({ shots: 1, shotsOnTarget: 1, goals: 0 });
    expect(players.a1).toMatchObject({
      tacklesWon: 1,
      interceptions: 1,
      clearances: 1,
      foulsCommitted: 1,
    });
  });

  it("counts a key pass only when the very next action is a shot by the receiver", () => {
    const events = [
      pass("home", "h1", "h2", "complete", { time: 1 }),
      carry("home", "h2", "kept", { time: 2 }),
      shot("home", "h2", "missed", 0.1, "ag", { time: 3 }),
    ];
    expect(computeActionStats(events, 100).players.h1?.keyPasses).toBe(0);
  });

  it("does not count a key pass whose shot lies after the cut-off", () => {
    const events = [
      pass("home", "h1", "h2", "complete", { time: 1 }),
      shot("home", "h2", "missed", 0.1, "ag", { time: 3 }),
    ];
    expect(computeActionStats(events, 2).players.h1?.keyPasses).toBe(0);
    expect(computeActionStats(events, 3).players.h1?.keyPasses).toBe(1);
  });

  it("gives players without passes a completion of 0", () => {
    const { players } = computeActionStats([clearance("home", "h1")], 10);
    expect(players.h1?.passCompletion).toBe(0);
  });

  it("matches the log truncated at the same time", () => {
    const match = playedMatch(7);
    const all = match.events;
    const cut = all.filter((e) => e.time <= 1500);
    expect(computeActionStats(all, 1500)).toEqual(computeActionStats(cut, 1500));
  });

  it("player totals equal team totals in simulated matches", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const match = playedMatch(seed);
      const { teams, players } = computeActionStats(match.events, 6000);
      const sum = (key: "passes" | "completedPasses" | "shots" | "shotsOnTarget" | "xg") =>
        Object.values(players).reduce((total, line) => total + line[key], 0);
      expect(sum("passes")).toBe(teams.passes.home + teams.passes.away);
      expect(sum("completedPasses")).toBe(teams.completedPasses.home + teams.completedPasses.away);
      expect(sum("shots")).toBe(teams.shots.home + teams.shots.away);
      expect(sum("shotsOnTarget")).toBe(teams.shotsOnTarget.home + teams.shotsOnTarget.away);
      expect(sum("xg")).toBeCloseTo(teams.xg.home + teams.xg.away);
      const fouls = Object.values(players).reduce((total, line) => total + line.foulsCommitted, 0);
      expect(fouls).toBe(teams.fouls.home + teams.fouls.away);
    }
  });
});
