import { describe, expect, it } from "vitest";
import { createMatch, type Match } from "./create-match";
import { aMatchInput, aTeamProfile } from "./match-builders";
import type { MatchChange } from "./match-change";
import type { MatchInput } from "./match-input";
import type { TeamTactics } from "./tactics";

const HALF = 2700;
const PLAY_ON = 1_000_000;
const input = aMatchInput().build();
const strong = aTeamProfile("Strong").withAllRatings(0.9).build();
const attacking: TeamTactics = {
  mentality: "attacking",
  pressing: "high",
  width: "wide",
  tempo: "fast",
};

const playWithChange = (
  matchInput: MatchInput,
  seed: number,
  change?: MatchChange,
  step = PLAY_ON,
) => {
  const match = createMatch(matchInput, seed);
  advanceInPieces(match, PLAY_ON, step);
  if (change) match.applyChange(change);
  match.resume();
  advanceInPieces(match, PLAY_ON, step);
  return match;
};

const advanceInPieces = (match: Match, to: number, step: number) => {
  for (let t = step; t < to && step < to; t += step) match.advanceTo(t);
  match.advanceTo(to);
};

describe("Match.applyChange", () => {
  it("starts with no changes", () => {
    expect(createMatch(input, 1).changes).toEqual([]);
  });

  it("records a change with the time it was applied", () => {
    const match = createMatch(input, 1);
    match.advanceTo(600);
    const change = { side: "home", profile: strong } as const;
    match.applyChange(change);

    expect(match.changes).toEqual([{ time: 600, change }]);
  });

  it("records changes in the order they were applied", () => {
    const match = createMatch(input, 1);
    match.advanceTo(100);
    match.applyChange({ side: "home", tactics: attacking });
    match.advanceTo(200);
    match.applyChange({ side: "away", tactics: attacking });

    expect(match.changes.map((c) => [c.time, c.change.side])).toEqual([
      [100, "home"],
      [200, "away"],
    ]);
  });

  it("records an empty change but leaves the match unchanged", () => {
    const plain = playWithChange(input, 5);
    const withEmpty = playWithChange(input, 5, { side: "home" });

    expect(withEmpty.changes).toHaveLength(1);
    expect(withEmpty.events).toEqual(plain.events);
  });

  it("ignores a change after full time", () => {
    const match = playWithChange(input, 5);
    match.applyChange({ side: "home", profile: strong });

    expect(match.state.period).toBe("fullTime");
    expect(match.changes).toEqual([]);
  });

  it("equals the match without changes when the change sets the same values", () => {
    const plain = playWithChange(input, 9);
    const same = playWithChange(input, 9, {
      side: "away",
      profile: input.away,
      tactics: input.awayTactics,
    });

    expect(same.events).toEqual(plain.events);
  });

  it("keeps the first half identical and changes the second half", () => {
    const plain = playWithChange(input, 3);
    const changed = playWithChange(input, 3, { side: "home", profile: strong, tactics: attacking });
    const firstHalf = (m: Match) => m.events.filter((e) => e.time <= HALF);

    expect(firstHalf(changed)).toEqual(firstHalf(plain));
    expect(changed.events).not.toEqual(plain.events);
  });

  it("gives the same event log however time is split across advanceTo calls", () => {
    const change: MatchChange = { side: "home", profile: strong, tactics: attacking };
    const whole = playWithChange(input, 11, change);
    const pieces = playWithChange(input, 11, change, 97);

    expect(pieces.events).toEqual(whole.events);
  });

  it("is reproducible by replaying the recorded changes at the same moments", () => {
    const original = playWithChange(input, 21, { side: "away", tactics: attacking });
    const replay = createMatch(input, 21);
    replay.advanceTo(PLAY_ON);
    for (const { change } of original.changes) replay.applyChange(change);
    replay.resume();
    replay.advanceTo(PLAY_ON);

    expect(replay.events).toEqual(original.events);
  });

  it("applies a change made mid-half to the following steps", () => {
    const plain = createMatch(input, 4);
    plain.advanceTo(PLAY_ON);
    const changed = createMatch(input, 4);
    changed.advanceTo(1200);
    changed.applyChange({ side: "home", profile: strong });
    changed.advanceTo(PLAY_ON);

    const early = (m: Match) => m.events.filter((e) => e.time <= 1200);
    expect(early(changed)).toEqual(early(plain));
    expect(changed.events).not.toEqual(plain.events);
  });
});
