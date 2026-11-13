import { describe, expect, it } from "vitest";
import { createMatch } from "./create-match";
import { aMatchInput, aTeamProfile } from "./match-builders";
import type { MatchEvent } from "./match-event";
import type { Side } from "./match-state";

const MATCH_SECONDS = 5400;
const input = aMatchInput().build();

const playFull = (seed: number, matchInput = input) => {
  const match = createMatch(matchInput, seed);
  match.advanceTo(MATCH_SECONDS);
  return match;
};

const ofType = <T extends MatchEvent["type"]>(events: readonly MatchEvent[], type: T) =>
  events.filter((e): e is Extract<MatchEvent, { type: T }> => e.type === type);

describe("createMatch", () => {
  it("starts with a kickoff from the centre spot", () => {
    const { events, state } = createMatch(input, 1);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ type: "kickoff", time: 0, position: { x: 0.5, y: 0.5 } });
    expect(state.ball).toEqual({ x: 0.5, y: 0.5 });
    expect(state.score).toEqual({ home: 0, away: 0 });
    expect(state.possession).toBe(events[0]?.team);
  });

  it("gives the same event log for the same seed and input", () => {
    expect(playFull(42).events).toEqual(playFull(42).events);
  });

  it("gives a different event log for a different seed", () => {
    expect(playFull(42).events).not.toEqual(playFull(43).events);
  });

  it("gives the same event log whether time is advanced in one go or in pieces", () => {
    const pieces = createMatch(input, 7);
    for (let t = 100; t <= MATCH_SECONDS; t += 100) pieces.advanceTo(t);

    expect(pieces.events).toEqual(playFull(7).events);
  });

  it("only produces events up to the requested time", () => {
    const match = createMatch(input, 3);
    match.advanceTo(600);

    expect(match.state.time).toBe(600);
    expect(match.events.every((e) => e.time <= 600)).toBe(true);
    expect(match.events.length).toBeGreaterThan(10);
  });

  it("keeps the event log ordered by time", () => {
    const times = playFull(5).events.map((e) => e.time);

    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("ignores a request to go back in time", () => {
    const match = createMatch(input, 3);
    match.advanceTo(600);
    const count = match.events.length;
    match.advanceTo(300);

    expect(match.state.time).toBe(600);
    expect(match.events).toHaveLength(count);
  });

  it("throws on a non-finite target time", () => {
    expect(() => createMatch(input, 1).advanceTo(Number.NaN)).toThrow(RangeError);
  });

  it("produces every transition type over a match", () => {
    const types = new Set(playFull(11).events.map((e) => e.type));

    for (const type of ["progress", "lateral", "turnover", "shot", "corner"]) {
      expect(types).toContain(type);
    }
  });

  it("keeps events on the pitch with intensity between 0 and 1", () => {
    for (const { position, intensity } of playFull(9).events) {
      expect(position.x).toBeGreaterThanOrEqual(0);
      expect(position.x).toBeLessThanOrEqual(1);
      expect(position.y).toBeGreaterThanOrEqual(0);
      expect(position.y).toBeLessThanOrEqual(1);
      expect(intensity).toBeGreaterThanOrEqual(0);
      expect(intensity).toBeLessThanOrEqual(1);
    }
  });

  it("records a shot with an xG value for every goal", () => {
    const { events } = playFull(21);
    const goals = ofType(events, "goal");

    expect(goals.length).toBeGreaterThan(0);
    for (const goal of goals) {
      const shot = ofType(events, "shot").find((s) => s.time === goal.time && s.team === goal.team);
      expect(shot?.outcome).toBe("goal");
      expect(shot?.xg).toBe(goal.xg);
    }
  });

  it("counts goals in the score", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const match = playFull(seed);
      const goals = ofType(match.events, "goal");
      const count = (side: Side) => goals.filter((g) => g.team === side).length;

      expect(match.state.score).toEqual({ home: count("home"), away: count("away") });
    }
  });

  it("restarts with a kickoff for the conceding team from the centre after a goal", () => {
    let checked = 0;
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const { events, state } = playFull(seed);
      events.forEach((event, i) => {
        if (event.type !== "goal") return;
        const next = events[i + 1];
        expect(next).toMatchObject({
          type: "kickoff",
          time: event.time,
          team: event.team === "home" ? "away" : "home",
          position: { x: 0.5, y: 0.5 },
        });
        checked++;
      });
      expect(state.ball).toBeDefined();
    }
    expect(checked).toBeGreaterThan(0);
  });

  it("only shoots from the final third", () => {
    const shots = ofType(playFull(13).events, "shot");

    expect(shots.length).toBeGreaterThan(5);
    for (const shot of shots) {
      const attackProgress = shot.team === "home" ? shot.position.x : 1 - shot.position.x;
      expect(attackProgress).toBeGreaterThan(0.76);
    }
  });

  it("lets a stronger team win more often than a weaker one", () => {
    const strong = aTeamProfile("Strong").withAllRatings(0.7).build();
    const weak = aTeamProfile("Weak").withAllRatings(0.3).build();
    const wins = { strong: 0, weak: 0 };

    for (let seed = 1; seed <= 100; seed++) {
      for (const strongIsHome of [true, false]) {
        const matchInput = strongIsHome
          ? aMatchInput().withHome(strong).withAway(weak).build()
          : aMatchInput().withHome(weak).withAway(strong).build();
        const { home, away } = playFull(seed, matchInput).state.score;
        const strongGoals = strongIsHome ? home : away;
        const weakGoals = strongIsHome ? away : home;
        if (strongGoals > weakGoals) wins.strong++;
        if (weakGoals > strongGoals) wins.weak++;
      }
    }

    expect(wins.strong).toBeGreaterThan(wins.weak * 2);
  });
});
