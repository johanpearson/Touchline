import { describe, expect, it } from "vitest";
import { aMatchInput } from "./action-builders";
import { aStartedLoop } from "./loop-builders";
import {
  FIRST_HALF_ADDED_MINUTES,
  HALF_SECONDS,
  SECOND_HALF_ADDED_MINUTES,
} from "./loop-constants";
import { startLoop } from "./start-loop";

describe("startLoop", () => {
  it("plays the kickoff action at time 0 for the side that kicks off", () => {
    const { state, context, firstKickoff } = aStartedLoop();

    expect(context.events[0]).toMatchObject({
      type: "setPiece",
      variant: "kickoff",
      time: 0,
      team: firstKickoff,
    });
    expect(state.period).toBe("firstHalf");
    expect(state.time).toBe(0);
  });

  it("schedules the next action 2 to 4 seconds later, rounded to a tenth", () => {
    const { state } = aStartedLoop();

    expect(state.nextActionAt).toBeGreaterThanOrEqual(2);
    expect(state.nextActionAt).toBeLessThanOrEqual(4);
    expect(state.nextActionAt).toBe(Math.round(state.nextActionAt * 10) / 10);
  });

  it("draws the added time of both halves from the added-time stream, in whole minutes", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const { state, secondHalfAdded } = aStartedLoop(seed);
      const first = (state.periodEnd - HALF_SECONDS) / 60;
      const second = secondHalfAdded / 60;
      expect(Number.isInteger(first)).toBe(true);
      expect(first).toBeGreaterThanOrEqual(FIRST_HALF_ADDED_MINUTES.min);
      expect(first).toBeLessThanOrEqual(FIRST_HALF_ADDED_MINUTES.max);
      expect(second).toBeGreaterThanOrEqual(SECOND_HALF_ADDED_MINUTES.min);
      expect(second).toBeLessThanOrEqual(SECOND_HALF_ADDED_MINUTES.max);
    }
  });

  it("is deterministic: the same input and seed start the same match", () => {
    const a = startLoop(aMatchInput().build(), 11, true);
    const b = startLoop(aMatchInput().build(), 11, true);

    expect(a.context.events).toEqual(b.context.events);
    expect(a.state).toEqual(b.state);
    expect(a.secondHalfAdded).toBe(b.secondHalfAdded);
  });

  it("lets either side kick off, depending on the seed", () => {
    const sides = new Set(Array.from({ length: 20 }, (_, i) => aStartedLoop(i + 1).firstKickoff));

    expect(sides).toEqual(new Set(["home", "away"]));
  });

  it("builds snapshots and a presentation stream only on the full path", () => {
    const full = aStartedLoop(7, true);
    const fast = aStartedLoop(7, false);

    expect(full.context.presentation).toBeDefined();
    expect(full.context.events[0]?.snapshot).toBeDefined();
    expect(fast.context.presentation).toBeUndefined();
    expect(fast.context.events[0]?.snapshot).toBeUndefined();
  });

  it("gives the same kickoff and score on the fast and the full path", () => {
    const full = aStartedLoop(7, true);
    const fast = aStartedLoop(7, false);

    expect(fast.firstKickoff).toBe(full.firstKickoff);
    expect(fast.state.play.score).toEqual(full.state.play.score);
    expect(fast.state.nextActionAt).toBe(full.state.nextActionAt);
  });
});
