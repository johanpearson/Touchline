import { describe, expect, it } from "vitest";
import { aStartedLoop } from "./loop-builders";
import { isPlaying, matchStateOf } from "./loop-state";

describe("isPlaying", () => {
  it.each([
    ["firstHalf", true],
    ["secondHalf", true],
    ["halfTime", false],
    ["fullTime", false],
  ] as const)("is %s: %s", (period, expected) => {
    expect(isPlaying(period)).toBe(expected);
  });
});

describe("matchStateOf", () => {
  it("reports the time, period, possession, ball, score and fouls of the loop state", () => {
    const { state } = aStartedLoop();

    expect(matchStateOf(state)).toEqual({
      time: 0,
      period: "firstHalf",
      possession: state.play.possession,
      ball: state.play.ball,
      score: { home: 0, away: 0 },
      fouls: { home: 0, away: 0 },
    });
  });

  it("gives copies of the score and the fouls, so a caller cannot change the match through them", () => {
    const { state } = aStartedLoop();

    const reported = matchStateOf(state);
    reported.score.home = 9;
    reported.fouls.away = 9;

    expect(state.play.score).toEqual({ home: 0, away: 0 });
    expect(state.play.fouls).toEqual({ home: 0, away: 0 });
  });
});
