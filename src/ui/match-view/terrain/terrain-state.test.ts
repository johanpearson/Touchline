import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../../../engine";
import { GOAL_HOLD_SECONDS } from "./goal-burst";
import { read, vertexIndexAt } from "./terrain-grid";
import { consumeEvents, createTerrainState, resetTerrain, stepDynamics } from "./terrain-state";
import { composeSurface, updateSurface } from "./terrain-surface";

const progress = (time: number, x = 0.7): MatchEvent => ({
  type: "progress",
  time,
  team: "home",
  position: { x, y: 0.5 },
  intensity: 0.5,
});
const goal = (time: number): MatchEvent => ({
  type: "goal",
  time,
  team: "away",
  position: { x: 0.05, y: 0.5 },
  intensity: 1,
  xg: 0.3,
});

describe("terrain state", () => {
  it("only consumes events up to the match time", () => {
    const state = createTerrainState();
    consumeEvents(state, [progress(5), progress(50)], 10, false);
    expect(state.cursor).toBe(1);
  });

  it("raises the terrain where events happen", () => {
    const state = createTerrainState();
    consumeEvents(state, [progress(5)], 10, false);
    for (let i = 0; i < 30; i++) updateSurface(state, 0.1, i * 0.1);
    expect(read(state.height, vertexIndexAt(0.7, 0.5))).toBeGreaterThan(
      read(state.height, vertexIndexAt(0.1, 0.9)) + 0.1,
    );
  });

  it("colours territory by the team that dominates", () => {
    const state = createTerrainState();
    consumeEvents(state, [progress(5)], 10, false);
    for (let i = 0; i < 30; i++) updateSurface(state, 0.1, i * 0.1);
    expect(read(state.awayShare, vertexIndexAt(0.7, 0.5))).toBeLessThan(0.5);
    expect(read(state.awayShare, vertexIndexAt(0.97, 0.5))).toBeGreaterThan(0.5);
  });

  it("starts a goal effect, then holds later events until the pause is over", () => {
    const state = createTerrainState();
    consumeEvents(state, [goal(5), progress(8)], 20, false);
    expect(state.bursts).toHaveLength(1);
    expect(state.scorer).toBe("away");
    expect(state.shake).toBeGreaterThan(0);
    expect(state.cursor).toBe(1);

    stepDynamics(state, GOAL_HOLD_SECONDS + 0.1, 0);
    consumeEvents(state, [goal(5), progress(8)], 20, false);
    expect(state.cursor).toBe(2);
  });

  it("resets the pitch to kick-off after the goal pause", () => {
    const state = createTerrainState();
    consumeEvents(state, [progress(1), goal(5)], 20, false);
    stepDynamics(state, GOAL_HOLD_SECONDS + 0.1, 0);
    expect(state.hold).toBeLessThanOrEqual(0);
    expect(read(state.field.fast.home, vertexIndexAt(0.7, 0.5))).toBe(0);
    expect(state.target).toEqual({ x: 0.5, y: 0.5 });
  });

  it("eases the ball and front back to the centre during the pause", () => {
    const state = createTerrainState();
    consumeEvents(state, [progress(1, 0.9), goal(5)], 20, false);
    state.ball = { x: 0.9, y: 0.5 };
    state.front = 0.9;
    stepDynamics(state, 1, 0);
    expect(state.ball.x).toBeLessThan(0.9);
    expect(state.front).toBeLessThan(0.9);
  });

  it("does not shake with reduced motion", () => {
    const state = createTerrainState();
    consumeEvents(state, [goal(5)], 20, true);
    expect(state.shake).toBe(0);
  });

  it("clears the field at half-time", () => {
    const state = createTerrainState();
    consumeEvents(
      state,
      [progress(1), { ...progress(2700), type: "periodChange", period: "halfTime" }],
      3000,
      false,
    );
    expect(read(state.field.fast.home, vertexIndexAt(0.7, 0.5))).toBe(0);
  });

  it("starts over when the event log is replaced by a shorter one", () => {
    const state = createTerrainState();
    consumeEvents(state, [progress(1), progress(2), progress(3)], 10, false);
    consumeEvents(state, [progress(1)], 10, false);
    expect(state.cursor).toBe(1);
  });

  it("follows the ball with a pulse for the team in possession", () => {
    const state = createTerrainState();
    consumeEvents(state, [progress(1, 0.8)], 5, false);
    stepDynamics(state, 0.5, 20);
    expect(state.ball.x).toBeGreaterThan(0.5);
    expect(state.pull).toBeGreaterThan(0.5);
  });

  it("pulls the front the other way when the away team has the ball", () => {
    const state = createTerrainState();
    consumeEvents(state, [{ ...progress(1, 0.2), team: "away" }], 5, false);
    stepDynamics(state, 0.5, 20);
    expect(state.pull).toBeLessThan(0.5);
  });

  it("adds goal bursts and ripple when composing the surface", () => {
    const state = createTerrainState();
    consumeEvents(state, [goal(5)], 20, false);
    const height = new Float32Array(state.height.length);
    const share = new Float32Array(state.height.length);
    for (const burst of state.bursts) burst.age = 0.35;
    composeSurface(state, 1, false, height, share);
    expect(read(height, vertexIndexAt(0.05, 0.5))).toBeGreaterThan(2);
    expect(read(share, vertexIndexAt(0.05, 0.5))).toBeGreaterThan(0.7);
  });

  it("ripples less with reduced motion", () => {
    const state = createTerrainState();
    const quiet = new Float32Array(state.height.length);
    const lively = new Float32Array(state.height.length);
    const share = new Float32Array(state.height.length);
    composeSurface(state, 1, true, quiet, share);
    composeSurface(state, 1, false, lively, share);
    const spread = (values: Float32Array) => Math.max(...values) - Math.min(...values);
    expect(spread(quiet)).toBeLessThan(spread(lively));
  });

  it("expires goal bursts after their life", () => {
    const state = createTerrainState();
    consumeEvents(state, [goal(5)], 20, false);
    stepDynamics(state, 4, 0);
    expect(state.bursts).toHaveLength(0);
  });

  it("can be reset for a new match", () => {
    const state = createTerrainState();
    consumeEvents(state, [progress(1), goal(5)], 20, false);
    resetTerrain(state);
    expect(state.cursor).toBe(0);
    expect(state.bursts).toHaveLength(0);
    expect(state.hold).toBe(0);
  });
});
