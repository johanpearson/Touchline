import { describe, expect, it } from "vitest";
import type { ActionEvent } from "../../engine";
import { buildTimeline } from "./director";
import { aCarry, aPass, aPeriodChange, aShot } from "./director/director-test-support";
import { advancePresented, INITIAL_PRESENTED } from "./presented-state";

const log = (): ActionEvent[] => [
  aPass({ time: 0 }),
  aCarry({ time: 10 }),
  aShot({ time: 20, outcome: "goal", team: "away" }),
  aPass({ time: 30 }),
  aPeriodChange(40, "halfTime"),
];

describe("advancePresented", () => {
  it("presents only the events the match clock has reached", () => {
    const events = log();
    const timeline = buildTimeline(events, "full");
    const state = advancePresented(INITIAL_PRESENTED, events, timeline, 10, 0);
    expect(state.eventCount).toBe(2);
    expect(state.score).toEqual({ home: 0, away: 0 });
  });

  it("counts a goal for the side that shot when its time is reached, not before", () => {
    const events = log();
    const timeline = buildTimeline(events, "full");
    const before = advancePresented(INITIAL_PRESENTED, events, timeline, 19.9, 0);
    expect(before.score).toEqual({ home: 0, away: 0 });
    const after = advancePresented(before, events, timeline, 20, 0);
    expect(after.score).toEqual({ home: 0, away: 1 });
  });

  it("returns the same object when nothing new is reached", () => {
    const events = log();
    const timeline = buildTimeline(events, "full");
    const state = advancePresented(INITIAL_PRESENTED, events, timeline, 10, 0);
    expect(advancePresented(state, events, timeline, 10, 0)).toBe(state);
  });

  it("holds the period change back until the actions before it, holds included, are over", () => {
    const events = log();
    const timeline = buildTimeline(events, "full");
    const end = timeline.duration;
    const early = advancePresented(INITIAL_PRESENTED, events, timeline, 40, end - 0.01);
    expect(early.period).toBe("firstHalf");
    expect(early.eventCount).toBe(4);
    const done = advancePresented(early, events, timeline, 40, end);
    expect(done.period).toBe("halfTime");
    expect(done.eventCount).toBe(5);
  });

  it("presents a period change at once when no action precedes it", () => {
    const events = [aPeriodChange(0, "halfTime")];
    const timeline = buildTimeline(events, "full");
    expect(advancePresented(INITIAL_PRESENTED, events, timeline, 0, 0).eventCount).toBe(1);
  });
});
