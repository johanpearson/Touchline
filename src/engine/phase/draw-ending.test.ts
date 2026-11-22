import { describe, expect, it } from "vitest";
import { aTeamSheet } from "../action/action-builders";
import type { Rng } from "../rng";
import { drawFailure, onExitLine, overEndLine } from "./draw-ending";

const defending = aTeamSheet("Away", "a").build();
const defenderIds = new Set(defending.starters.map((p) => p.id));

/** An Rng that returns `values` from `next` in order and 0.5 afterwards, counting the draws. */
const scripted = (...values: number[]): Rng & { draws: () => number } => {
  let index = 0;
  const next = (): number => values[index++] ?? 0.5;
  const rng: Rng & { draws: () => number } = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (list) => list[Math.floor(next() * list.length)] as never,
    chance: (p) => next() < p,
    fork: () => rng,
    draws: () => index,
  };
  return rng;
};

describe("drawFailure", () => {
  it.each([
    [0, "foul"],
    [0.0899, "foul"],
    [0.09, "outOfPlay"],
    [0.2149, "outOfPlay"],
    [0.215, "lost"],
    [0.999, "lost"],
  ] as const)("ends a possession with draw %s as %s", (draw, outcome) => {
    expect(drawFailure(1, defending, scripted(draw)).outcome).toBe(outcome);
  });

  it.each([
    [0, "tackle"],
    [0.3999, "tackle"],
    [0.4, "interception"],
    [0.7499, "interception"],
    [0.75, "badPass"],
    [0.999, "badPass"],
  ] as const)("loses the ball by a %s for the second draw %s", (draw, how) => {
    expect(drawFailure(1, defending, scripted(0.5, draw))).toMatchObject({ outcome: "lost", how });
  });

  it("names a defender as the challenger of a lost ball and the offender of a foul", () => {
    const lost = drawFailure(1, defending, scripted(0.5, 0.1)) as { challenger: string };
    const foul = drawFailure(1, defending, scripted(0.01)) as { offender: string };

    expect(defenderIds.has(lost.challenger)).toBe(true);
    expect(defenderIds.has(foul.offender)).toBe(true);
    expect(lost.challenger).not.toBe("a-1");
  });

  it("draws a penalty only in the final third, in 2% of the fouls", () => {
    expect(drawFailure(2, defending, scripted(0.01, 0.5, 0.019))).toMatchObject({ penalty: true });
    expect(drawFailure(2, defending, scripted(0.01, 0.5, 0.02))).toMatchObject({ penalty: false });
    const rng = scripted(0.01, 0.5, 0.0);
    expect(drawFailure(1, defending, rng)).toMatchObject({ outcome: "foul", penalty: false });
    expect(rng.draws()).toBe(2);
  });

  it("draws nothing more for an out-of-play ending", () => {
    const rng = scripted(0.15);

    expect(drawFailure(2, defending, rng)).toEqual({ outcome: "outOfPlay" });
    expect(rng.draws()).toBe(1);
  });
});

describe("overEndLine", () => {
  it.each([
    ["home", 99, true],
    ["home", 98.9, false],
    ["home", 104, true],
    ["away", 6, true],
    ["away", 6.1, false],
    ["away", 1, true],
  ] as const)("says %s at x = %s is over the end line: %s", (team, x, expected) => {
    expect(overEndLine(team, { x, y: 20 })).toBe(expected);
  });
});

describe("onExitLine", () => {
  it("puts a ball over the attacker's end line on the end line, keeping the y", () => {
    expect(onExitLine("home", { x: 100, y: 20 })).toEqual({ x: 105, y: 20 });
    expect(onExitLine("away", { x: 4, y: 50 })).toEqual({ x: 0, y: 50 });
  });

  it("puts any other ball on the nearer touchline, keeping the x", () => {
    expect(onExitLine("home", { x: 50, y: 10 })).toEqual({ x: 50, y: 0 });
    expect(onExitLine("home", { x: 50, y: 33.9 })).toEqual({ x: 50, y: 0 });
    expect(onExitLine("home", { x: 50, y: 34 })).toEqual({ x: 50, y: 68 });
    expect(onExitLine("away", { x: 50, y: 60 })).toEqual({ x: 50, y: 68 });
  });
});
