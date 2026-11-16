import { describe, expect, it } from "vitest";
import { actInLoop } from "./act-in-loop";
import { aStartedLoop } from "./loop-builders";

describe("actInLoop", () => {
  it("appends the events of the action to the log", () => {
    const { state, context } = aStartedLoop();
    const before = context.events.length;

    actInLoop(state, state.nextActionAt, context);

    expect(context.events.length).toBeGreaterThan(before);
    expect(context.events.at(-1)?.time).toBe(state.nextActionAt);
  });

  it("schedules the next action 2 to 4 seconds after this one, rounded to a tenth", () => {
    const { state, context } = aStartedLoop();

    const next = actInLoop(state, state.nextActionAt, context);

    const gap = next.nextActionAt - state.nextActionAt;
    expect(gap).toBeGreaterThanOrEqual(1.95);
    expect(gap).toBeLessThanOrEqual(4.05);
    expect(next.nextActionAt).toBe(Math.round(next.nextActionAt * 10) / 10);
  });

  it("does not change the state it was given", () => {
    const { state, context } = aStartedLoop();
    const before = { ...state };

    actInLoop(state, state.nextActionAt, context);

    expect(state).toEqual(before);
  });

  it("keeps the period, the time and the input of the state", () => {
    const { state, context } = aStartedLoop();

    const next = actInLoop(state, state.nextActionAt, context);

    expect(next).toMatchObject({
      period: state.period,
      time: state.time,
      input: state.input,
      periodEnd: state.periodEnd,
    });
  });
});
