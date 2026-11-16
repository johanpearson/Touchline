import { describe, expect, it } from "vitest";
import { actionIsDue, advanceLoop } from "./advance-loop";
import { aStartedLoop } from "./loop-builders";
import { HALF_SECONDS } from "./loop-constants";

describe("actionIsDue", () => {
  it.each([
    [5, 10, 100, true],
    [9.9, 10, 100, true],
    [10, 10, 100, true],
    [10.1, 10, 100, false],
    [10, 10, 10, false],
    [9.9, 10, 10, true],
  ])(
    "an action at %s, simulating to %s, with the period ending at %s: %s",
    (at, target, end, expected) => {
      expect(actionIsDue(at, target, end)).toBe(expected);
    },
  );
});

describe("advanceLoop", () => {
  it("rejects a time that is not a finite number", () => {
    const { state, context } = aStartedLoop();

    for (const seconds of [Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => advanceLoop(state, seconds, context)).toThrow(RangeError);
    }
    expect(() => advanceLoop(state, Number.NaN, context)).toThrow("Invalid match time: NaN");
  });

  it("plays the actions up to the time asked and no further", () => {
    const { state, context } = aStartedLoop();

    const next = advanceLoop(state, 600, context);

    expect(next.time).toBe(600);
    expect(next.period).toBe("firstHalf");
    expect(next.nextActionAt).toBeGreaterThanOrEqual(600);
    const times = context.events.map((e) => e.time);
    expect(Math.max(...times)).toBeLessThanOrEqual(600);
  });

  it("never goes back in time", () => {
    const { state, context } = aStartedLoop();
    const later = advanceLoop(state, 600, context);
    const count = context.events.length;

    const earlier = advanceLoop(later, 300, context);

    expect(earlier.time).toBe(600);
    expect(context.events).toHaveLength(count);
  });

  it("stops at half-time with a periodChange event at the end of the first half, added time included", () => {
    const { state, context } = aStartedLoop();

    const halfTime = advanceLoop(state, 1_000_000, context);

    expect(halfTime.period).toBe("halfTime");
    expect(halfTime.time).toBe(state.periodEnd);
    expect(halfTime.periodEnd).toBeGreaterThan(HALF_SECONDS);
    expect(context.events.at(-1)).toMatchObject({
      type: "periodChange",
      period: "halfTime",
      time: state.periodEnd,
    });
    expect(context.events.filter((e) => e.time > state.periodEnd)).toEqual([]);
  });

  it("does nothing at half-time: the same state comes back and nothing is appended", () => {
    const { state, context } = aStartedLoop();
    const halfTime = advanceLoop(state, 1_000_000, context);
    const count = context.events.length;

    expect(advanceLoop(halfTime, 5000, context)).toBe(halfTime);
    expect(context.events).toHaveLength(count);
  });

  it("does not change the state it was given", () => {
    const { state, context } = aStartedLoop();
    const before = { ...state };

    advanceLoop(state, 1_000_000, context);

    expect(state).toEqual(before);
  });

  it("gives the same log however the time is split", () => {
    const whole = aStartedLoop(3);
    advanceLoop(whole.state, 1_000_000, whole.context);
    const split = aStartedLoop(3);
    let state = split.state;
    for (let t = 90; state.period === "firstHalf"; t += 211)
      state = advanceLoop(state, t, split.context);

    expect(split.context.events).toEqual(whole.context.events);
  });
});
