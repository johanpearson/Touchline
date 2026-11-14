import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { anEnginePlayer } from "./action-builders";
import { PENALTY_XG } from "./decision-constants";
import type { Challenger } from "./open-play-types";
import { goalChance, resolveShot, type ShotInput } from "./resolve-shot";

const scripted = (...values: number[]) => {
  let i = 0;
  return { ...createRng(1), next: () => values[i++] ?? 0.99 };
};
const at = (x: number, y = 34) => ({ x, y });
const challenger = (
  slot: number,
  point: { x: number; y: number },
  positioning = 10,
): Challenger => ({
  slot,
  point,
  player: anEnginePlayer(`c${slot}`).withAttribute("positioning", positioning).build(),
});
const keeperAt = challenger(0, at(104.5));
const input = (extra: Partial<ShotInput> = {}): ShotInput => ({
  side: "home",
  shooter: anEnginePlayer("s").build(),
  shooterSlot: 9,
  from: at(94),
  keeper: keeperAt,
  blockers: [],
  xg: 0.2,
  pressure: 0,
  ...extra,
});

describe("goalChance", () => {
  it("equals the xG for average finishing and an average keeper", () => {
    expect(goalChance(input())).toBeCloseTo(0.2, 10);
  });

  it("rises with finishing and falls with keeper handling and reflexes", () => {
    const finisher = anEnginePlayer("s").withAttribute("finishing", 20).build();
    expect(goalChance(input({ shooter: finisher }))).toBeCloseTo(0.26, 10);
    const poor = anEnginePlayer("s").withAttribute("finishing", 1).build();
    expect(goalChance(input({ shooter: poor }))).toBeLessThan(0.2);
    const great = anEnginePlayer("k")
      .withAttribute("handling", 20)
      .withAttribute("reflexes", 20)
      .build();
    expect(goalChance(input({ keeper: { ...keeperAt, player: great } }))).toBeCloseTo(0.14, 10);
    const bad = anEnginePlayer("k")
      .withAttribute("handling", 1)
      .withAttribute("reflexes", 1)
      .build();
    expect(goalChance(input({ keeper: { ...keeperAt, player: bad } }))).toBeGreaterThan(0.2);
  });

  it("is clamped below certainty", () => {
    expect(goalChance(input({ xg: 5 }))).toBeLessThan(1);
  });
});

describe("resolveShot", () => {
  it("scores when the draw is below the goal chance and gives the kickoff side the ball", () => {
    const r = resolveShot(input(), scripted(0.1));
    expect(r.outcome).toBe("goal");
    expect(r.ball).toEqual(at(105));
    expect(r.possession).toEqual({ side: "away" });
    expect(r.restart).toBeUndefined();
  });

  it("puts the ball in the home goal when the away side scores", () => {
    const r = resolveShot(input({ side: "away", from: at(11) }), scripted(0.1));
    expect(r.ball).toEqual(at(0));
    expect(r.possession).toEqual({ side: "home" });
  });

  it("gives a goal kick for a miss", () => {
    const r = resolveShot(input(), scripted(0.99));
    expect(r.outcome).toBe("missed");
    expect(r.restart).toEqual({ team: "away", variant: "goalKick", position: at(99.5) });
    expect(r.possession).toEqual({ side: "away" });
  });

  it("hits the woodwork in a thin band after the goal band and leaves a loose ball", () => {
    const r = resolveShot(input(), scripted(0.21));
    expect(r.outcome).toBe("woodwork");
    expect(r.restart).toBeUndefined();
    expect(r.ball.x).toBeLessThan(105);
  });

  it("lets the keeper save, then gives a corner, a catch or a rebound", () => {
    const corner = resolveShot(input(), scripted(0.4, 0.1));
    expect(corner.outcome).toBe("saved");
    expect(corner.restart).toEqual({ team: "home", variant: "corner", position: at(105, 68) });
    expect(corner.possession).toEqual({ side: "home" });

    const catches = resolveShot(input(), scripted(0.4, 0.4));
    expect(catches.outcome).toBe("saved");
    expect(catches.possession).toEqual({ side: "away", slot: 0 });
    expect(catches.ball).toEqual(keeperAt.point);
    expect(catches.restart).toBeUndefined();

    const rebound = resolveShot(input(), scripted(0.4, 0.9));
    expect(rebound.outcome).toBe("saved");
    expect(rebound.restart).toBeUndefined();
    expect(rebound.ball.x).toBeCloseTo(99, 6);
  });

  it("gives a rebound to the nearest player: a defender or the shooter", () => {
    const near = challenger(3, at(98, 34));
    const r = resolveShot(input({ blockers: [near] }), scripted(0.4, 0.9));
    expect(r.possession).toEqual({ side: "away", slot: 3 });
    const shooterNear = resolveShot(input({ from: at(98, 34) }), scripted(0.4, 0.9));
    expect(shooterNear.possession).toEqual({ side: "home", slot: 9 });
  });

  it("can be blocked by a defender on the lane: a corner or a loose ball for the blocker", () => {
    const blocker = challenger(4, at(98, 34));
    const corner = resolveShot(input({ blockers: [blocker] }), scripted(0.3, 0.1));
    expect(corner.outcome).toBe("blocked");
    expect(corner.restart?.variant).toBe("corner");
    expect(corner.possession).toEqual({ side: "home" });
    const loose = resolveShot(input({ blockers: [blocker] }), scripted(0.3, 0.9));
    expect(loose.outcome).toBe("blocked");
    expect(loose.ball).toEqual(blocker.point);
    expect(loose.possession).toEqual({ side: "away", slot: 4 });
  });

  it("is never blocked without a defender near the lane", () => {
    const wide = challenger(4, at(98, 10));
    for (const u of [0.25, 0.3, 0.5, 0.7, 0.9, 0.99]) {
      expect(resolveShot(input({ blockers: [wide] }), scripted(u, 0.5)).outcome).not.toBe(
        "blocked",
      );
    }
  });

  it("gives every outcome a next possessor", () => {
    for (const u of [0.05, 0.21, 0.3, 0.4, 0.7, 0.99]) {
      const r = resolveShot(input({ blockers: [challenger(4, at(98, 34))] }), scripted(u, 0.6));
      expect(["home", "away"]).toContain(r.possession.side);
    }
  });

  it("scores close to the finishing-adjusted xG over many draws", () => {
    const rng = createRng(42);
    const finisher = anEnginePlayer("s").withAttribute("finishing", 16).build();
    const shot = input({ shooter: finisher, blockers: [challenger(4, at(98, 34))] });
    const n = 20000;
    const goals = Array.from({ length: n }, () => resolveShot(shot, rng).outcome).filter(
      (o) => o === "goal",
    ).length;
    expect(goals / n).toBeCloseTo(goalChance(shot), 1);
    expect(Math.abs(goals / n - goalChance(shot))).toBeLessThan(0.015);
  });

  it("resolves penalties with the fixed xG, ignoring blockers", () => {
    const blocker = challenger(4, at(98, 34));
    const shot = input({ xg: PENALTY_XG, from: at(94), blockers: [blocker], penalty: true });
    expect(goalChance(shot)).toBeCloseTo(0.76, 10);
    const rng = createRng(7);
    const outcomes = Array.from({ length: 2000 }, () => resolveShot(shot, rng).outcome);
    expect(outcomes).not.toContain("blocked");
    const share = outcomes.filter((o) => o === "goal").length / outcomes.length;
    expect(share).toBeGreaterThan(0.72);
    expect(share).toBeLessThan(0.8);
  });
});
