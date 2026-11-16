import { describe, expect, it } from "vitest";
import { NEUTRAL_TACTICS } from "../tactics";
import { advanceLoop } from "./advance-loop";
import { changeLoop } from "./change-loop";
import { aLoopAtHalfTime, aStartedLoop } from "./loop-builders";

const attacking = { ...NEUTRAL_TACTICS, mentality: "attacking" } as const;

describe("changeLoop", () => {
  it("rejects a side that is not home or away, as a programmer error", () => {
    const { state } = aStartedLoop();

    expect(() => changeLoop(state, { side: "left" as never })).toThrow(RangeError);
    expect(() => changeLoop(state, { side: "left" as never })).toThrow("Invalid side: left");
  });

  it("applies new tactics to one side and records the change", () => {
    const { state } = aStartedLoop();

    const changed = changeLoop(state, { side: "home", tactics: attacking });

    expect(changed).toMatchObject({ result: { ok: true }, recorded: true });
    expect(changed.state.input.home.tactics).toEqual(attacking);
    expect(changed.state.input.away.tactics).toEqual(NEUTRAL_TACTICS);
  });

  it("leaves the state it was given unchanged", () => {
    const { state } = aStartedLoop();

    changeLoop(state, { side: "home", tactics: attacking });

    expect(state.input.home.tactics).toEqual(NEUTRAL_TACTICS);
  });

  it("returns an invalid lineup as an error and leaves the match as it was", () => {
    const { state } = aStartedLoop();

    const changed = changeLoop(state, { side: "home", lineup: [] });

    expect(changed.result.ok).toBe(false);
    expect(changed.recorded).toBe(false);
    expect(changed.state).toBe(state);
  });

  it("accepts a change after full time and ignores it", () => {
    const { halfTime, state } = (() => {
      const started = aLoopAtHalfTime(4, advanceLoop);
      return { halfTime: started.halfTime, state: started };
    })();
    const fullTime = { ...halfTime, period: "fullTime" as const };

    const changed = changeLoop(fullTime, { side: "home", tactics: attacking });

    expect(changed).toEqual({ result: { ok: true }, state: fullTime, recorded: false });
    expect(state).toBeDefined();
  });

  it("applies a change at half-time", () => {
    const { halfTime } = aLoopAtHalfTime(4, advanceLoop);

    const changed = changeLoop(halfTime, { side: "away", tactics: attacking });

    expect(changed.recorded).toBe(true);
    expect(changed.state.input.away.tactics).toEqual(attacking);
    expect(changed.state.period).toBe("halfTime");
  });
});
