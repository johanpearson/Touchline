import { describe, expect, it } from "vitest";
import { createMatch } from "./create-match";
import { aMatchInput } from "./match-builders";
import type { MatchEvent } from "./match-event";

const input = aMatchInput().build();
const HALF = 2700;
const MINUTE = 60;
const FAR_FUTURE = 100000;

const periodChanges = (events: readonly MatchEvent[]) =>
  events.filter(
    (e): e is Extract<MatchEvent, { type: "periodChange" }> => e.type === "periodChange",
  );

const toHalfTime = (seed: number) => {
  const match = createMatch(input, seed);
  match.advanceTo(FAR_FUTURE);
  return match;
};

const toFullTime = (seed: number) => {
  const match = toHalfTime(seed);
  match.resume();
  match.advanceTo(FAR_FUTURE);
  return match;
};

describe("match periods", () => {
  it("stops at half-time after the first half and its added time", () => {
    const match = toHalfTime(1);

    expect(match.state.period).toBe("halfTime");
    expect(match.state.time).toBeGreaterThanOrEqual(HALF + MINUTE);
    expect(match.state.time).toBeLessThanOrEqual(HALF + 5 * MINUTE);
    expect(match.state.time % MINUTE).toBe(0);
  });

  it("logs a period change to half-time at the moment the first half ends", () => {
    const match = toHalfTime(1);
    const changes = periodChanges(match.events);

    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ period: "halfTime", time: match.state.time });
    expect(match.events.at(-1)).toBe(changes[0]);
  });

  it("does not simulate anything while paused at half-time", () => {
    const match = toHalfTime(2);
    const count = match.events.length;
    const time = match.state.time;

    match.advanceTo(FAR_FUTURE * 2);

    expect(match.events).toHaveLength(count);
    expect(match.state.time).toBe(time);
    expect(match.state.period).toBe("halfTime");
  });

  it("does not play past the end of the first half within a single advanceTo", () => {
    const match = toHalfTime(3);

    expect(match.events.every((e) => e.time <= match.state.time)).toBe(true);
  });

  it("restarts the second half with a kickoff for the team that did not kick off the first", () => {
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const match = toHalfTime(seed);
      const firstKickoffTeam = match.events[0]?.team;
      const halfTimeAt = match.state.time;
      match.resume();
      const [secondHalfStart, kickoff] = match.events.slice(-2);

      expect(secondHalfStart).toMatchObject({
        type: "periodChange",
        period: "secondHalf",
        time: halfTimeAt,
      });
      expect(kickoff).toMatchObject({
        type: "kickoff",
        time: halfTimeAt,
        position: { x: 0.5, y: 0.5 },
      });
      expect(kickoff?.team).not.toBe(firstKickoffTeam);
      expect(match.state).toMatchObject({
        period: "secondHalf",
        possession: kickoff?.team,
        ball: { x: 0.5, y: 0.5 },
        danger: 0,
        time: halfTimeAt,
      });
    }
  });

  it("ends at full time after a second half of 45 minutes plus added time", () => {
    const match = toFullTime(1);
    const [, secondHalfStart, fullTime] = periodChanges(match.events);

    expect(match.state.period).toBe("fullTime");
    expect(fullTime).toMatchObject({ period: "fullTime", time: match.state.time });
    const secondHalfLength = match.state.time - (secondHalfStart?.time as number);
    expect(secondHalfLength).toBeGreaterThanOrEqual(HALF + 2 * MINUTE);
    expect(secondHalfLength).toBeLessThanOrEqual(HALF + 6 * MINUTE);
    expect(match.events.at(-1)).toBe(fullTime);
  });

  it("logs the period changes in order", () => {
    const periods = periodChanges(toFullTime(4).events).map((e) => e.period);

    expect(periods).toEqual(["halfTime", "secondHalf", "fullTime"]);
  });

  it("stops simulating at full time", () => {
    const match = toFullTime(5);
    const count = match.events.length;

    match.advanceTo(FAR_FUTURE * 2);

    expect(match.events).toHaveLength(count);
    expect(match.state.period).toBe("fullTime");
  });

  it("draws the added time from the rng, giving different lengths for different seeds", () => {
    const lengths = new Set<number>();
    for (let seed = 1; seed <= 30; seed++) lengths.add(toHalfTime(seed).state.time);

    expect(lengths.size).toBeGreaterThan(2);
    for (const length of lengths) {
      expect(length).toBeGreaterThanOrEqual(HALF + MINUTE);
      expect(length).toBeLessThanOrEqual(HALF + 5 * MINUTE);
    }
  });

  it("gives the same event log however time is split across advanceTo calls", () => {
    const pieces = createMatch(input, 9);
    for (let t = 50; t <= 4000; t += 50) pieces.advanceTo(t);
    pieces.resume();
    for (let t = 4000; t <= 9000; t += 50) pieces.advanceTo(t);

    expect(pieces.events).toEqual(toFullTime(9).events);
  });

  it("keeps the event log ordered by time across periods", () => {
    const times = toFullTime(6).events.map((e) => e.time);

    expect(times).toEqual([...times].sort((a, b) => a - b));
  });

  it("starts the second half's play after the restart, not before it", () => {
    const match = toHalfTime(7);
    const halfTimeAt = match.state.time;
    match.resume();
    match.advanceTo(FAR_FUTURE);

    const played = match.events.filter((e) => e.time > halfTimeAt);
    expect(played.length).toBeGreaterThan(50);
    expect(match.events.filter((e) => e.time === halfTimeAt).map((e) => e.type)).toEqual([
      "periodChange",
      "periodChange",
      "kickoff",
    ]);
  });

  it("throws if resume is called when the match is not at half-time", () => {
    expect(() => createMatch(input, 1).resume()).toThrow("Cannot resume");
    expect(() => toFullTime(1).resume()).toThrow("Cannot resume");
  });

  it("does not advance beyond a requested time inside a playing period", () => {
    const match = createMatch(input, 3);
    match.advanceTo(1000);

    expect(match.state).toMatchObject({ time: 1000, period: "firstHalf" });
  });
});
