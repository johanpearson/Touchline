import { describe, expect, it } from "vitest";
import type { ActionEvent } from "../engine";
import {
  foul,
  interception,
  pass,
  setPiece,
  shot,
  tackle,
} from "../engine/action/action-event-builders";
import { selectKeyActions } from "./phase-selection";

const at = (time: number, x = 50) => ({ time, from: { x: 40, y: 34 }, to: { x, y: 34 } });

/** `count` completed passes by `team`, one second apart from `start`, ending at `x`. */
const passes = (team: "home" | "away", count: number, start: number, x = 50): ActionEvent[] =>
  Array.from({ length: count }, (_, i) =>
    pass(team, `${team}${i}`, `${team}${i + 1}`, "complete", at(start + i, x)),
  );

describe("selectKeyActions", () => {
  it("picks nothing for a quiet phase that loses the ball far from goal", () => {
    const events = [
      ...passes("home", 4, 1),
      pass("home", "h4", "h5", "intercepted", at(5)),
      interception("away", "a1", at(6)),
      ...passes("away", 3, 7),
    ];
    expect([...selectKeyActions(events)]).toEqual([]);
  });

  it("names the shot that ends a phase, even when the phase is the last one", () => {
    const events = [
      ...passes("home", 3, 1, 90),
      shot("home", "h3", "saved", 0.3, "gk", at(4, 100)),
    ];
    expect([...selectKeyActions(events)]).toEqual([3]);
  });

  it("names the goal that ends a phase", () => {
    const events = [
      ...passes("home", 3, 1, 90),
      shot("home", "h3", "goal", 0.4, "gk", at(4, 104)),
      setPiece("away", "a1", "kickoff", at(34)),
    ];
    expect([...selectKeyActions(events)]).toEqual([3]);
  });

  it("names the foul that ends a phase once the game has gone on", () => {
    const events = [
      ...passes("home", 3, 1),
      foul("home", "h3", "a4", at(4)),
      setPiece("home", "h3", "freeKick", at(5)),
      ...passes("home", 3, 6),
    ];
    expect([...selectKeyActions(events)]).toContain(3);
  });

  it("waits for the next action before naming a foul, because a short phase may still be merged", () => {
    const events = [...passes("home", 3, 1), foul("home", "h3", "a4", at(4))];
    expect([...selectKeyActions(events)]).toEqual([]);
  });

  it("always names a penalty award, whatever phase it was merged into", () => {
    const awarded: ActionEvent = { ...foul("home", "h9", "a4", at(1)), outcome: "penalty" };
    const events = [
      awarded,
      setPiece("home", "h10", "penalty", at(30)),
      shot("home", "h10", "saved", 0.76, "gk", at(31, 100)),
    ];
    expect([...selectKeyActions(events)]).toEqual([0, 2]);
  });

  it("names the tackle that stops a dangerous attack", () => {
    const events = [
      ...passes("home", 3, 1, 92),
      pass("home", "h3", "h4", "intercepted", at(4, 98)),
      tackle("away", "a1", "won", at(5)),
      ...passes("away", 3, 6),
    ];
    expect([...selectKeyActions(events)]).toEqual([4]);
  });

  it("names the interception that stops a dangerous attack", () => {
    const events = [
      ...passes("home", 3, 1, 92),
      pass("home", "h3", "h4", "intercepted", at(4, 98)),
      interception("away", "a1", at(5)),
      ...passes("away", 3, 6),
    ];
    expect([...selectKeyActions(events)]).toEqual([4]);
  });
});
