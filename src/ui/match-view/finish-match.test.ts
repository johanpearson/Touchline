import { describe, expect, it } from "vitest";
import type { ActionMatchChange, Side, TimedActionMatchChange } from "../../engine";
import { goalScorersOf, playToFullTime } from "../../game";
import { anActionMatchSetup } from "./action-match-fixture";
import { finishedMatchOf, simulateRest } from "./finish-match";

const { setup, fixture, career } = anActionMatchSetup(11);
const userSide: Side = fixture.homeClubId === career.userClubId ? "home" : "away";
const tactics: ActionMatchChange = {
  side: userSide,
  tactics: { mentality: "attacking", pressing: "high", tempo: "fast", width: "wide" },
};
const END = 1_000_000;

/** The match played the way the screen plays it: stops at half-time, applies the change, goes on. */
const watched = (changes: readonly TimedActionMatchChange[]) => {
  const match = setup.createMatch();
  for (const { time, change } of changes) {
    match.advanceTo(time);
    match.applyChange(change);
  }
  match.advanceTo(END);
  if (match.state.period === "halfTime") match.resume();
  match.advanceTo(END);
  return match;
};

describe("finishedMatchOf", () => {
  it("reads the score, scorers, engine version and energy of a match that is over", () => {
    const match = setup.createMatch();
    playToFullTime(match);
    const finished = finishedMatchOf(match, setup.input.engineVersion);
    expect(finished.score).toEqual(match.state.score);
    expect(finished.scorers).toEqual(goalScorersOf(match.events));
    expect(finished.engineVersion).toBe(setup.input.engineVersion);
    expect(finished.energy).toEqual(match.state.energy);
  });
});

describe("simulateRest", () => {
  const request = (changes: readonly TimedActionMatchChange[]) => ({
    createMatch: setup.createMatch,
    changes,
    engineVersion: setup.input.engineVersion,
    userSide,
  });

  it("gives the result of the match played to the end from kick-off", () => {
    const result = simulateRest(request([]));
    const expected = finishedMatchOf(watched([]), setup.input.engineVersion);
    expect(result?.finished).toEqual(expected);
  });

  it("applies the user's changes at the times they were made", () => {
    const halfTime = (() => {
      const m = setup.createMatch();
      m.advanceTo(END);
      return m.state.time;
    })();
    const changes: TimedActionMatchChange[] = [{ time: halfTime, change: tactics }];
    const result = simulateRest(request(changes));
    expect(result?.finished).toEqual(finishedMatchOf(watched(changes), setup.input.engineVersion));
  });

  it("keeps the user's report and adds what the opponent played", () => {
    const report = { minutes: { someone: 90 } };
    const result = simulateRest({ ...request([]), report });
    expect(result?.report?.minutes).toEqual(report.minutes);
    expect(result?.report?.opponent).toBeDefined();
  });

  it("returns null for a change the engine refuses, instead of throwing", () => {
    const bad: TimedActionMatchChange[] = [{ time: 10, change: { side: userSide, lineup: [] } }];
    expect(simulateRest(request(bad))).toBeNull();
  });
});
