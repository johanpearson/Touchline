import { describe, expect, it } from "vitest";
import { changePeriod } from "./change-period";
import { aStartedLoop } from "./loop-builders";

describe("changePeriod", () => {
  it("appends a periodChange event at the given time, with the ball and the possession of the play", () => {
    const { state, context } = aStartedLoop();
    const before = context.events.length;

    changePeriod(state, 2745, "halfTime", context);

    expect(context.events).toHaveLength(before + 1);
    expect(context.events.at(-1)).toMatchObject({
      type: "periodChange",
      period: "halfTime",
      time: 2745,
      team: state.play.possession,
      from: state.play.ball,
      to: state.play.ball,
      pressure: 0,
    });
  });

  it("returns the state in the new period and leaves the given state as it was", () => {
    const { state, context } = aStartedLoop();

    const next = changePeriod(state, 2745, "halfTime", context);

    expect(next).toEqual({ ...state, period: "halfTime" });
    expect(state.period).toBe("firstHalf");
  });

  it("gives the event a snapshot on the full path and none on the fast path", () => {
    const full = aStartedLoop(7, true);
    const fast = aStartedLoop(7, false);

    changePeriod(full.state, 10, "halfTime", full.context);
    changePeriod(fast.state, 10, "halfTime", fast.context);

    expect(full.context.events.at(-1)?.snapshot).toBeDefined();
    expect(fast.context.events.at(-1)?.snapshot).toBeUndefined();
  });
});
