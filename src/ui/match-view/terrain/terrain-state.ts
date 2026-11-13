import type { MatchEvent, Side } from "../../../engine";
import { attackProgress } from "./attack-progress";
import { bumpsForEvent } from "./event-bump";
import { GOAL_HOLD_SECONDS, type GoalBurst } from "./goal-burst";
import {
  addBump,
  addGaussian,
  clearField,
  createField,
  decayField,
  type TerrainField,
} from "./terrain-field";
import { createGrid, type Grid, VERTEX_COUNT } from "./terrain-grid";

/** Everything the terrain needs between frames. Mutable on purpose: it is updated every frame. */
export type TerrainState = {
  grid: Grid;
  field: TerrainField;
  /** Smoothed displayed height per vertex. */
  height: Float32Array;
  /** Smoothed away share of pressure per vertex, 0 (home) to 1 (away). */
  awayShare: Float32Array;
  bursts: GoalBurst[];
  /** Ball position the pulse follows, eased towards the latest event. */
  ball: { x: number; y: number };
  /** Index of the next event to consume. */
  cursor: number;
  /** Last team to act, which is the team in possession. */
  possession: Side;
  /** Latest event position, the target the ball eases to. */
  target: { x: number; y: number };
  /** The moving front between the two teams' territory (x), and the point it is pulled towards. */
  front: number;
  pull: number;
  /** Seconds left of the pause after a goal. */
  hold: number;
  /** Seconds since the latest goal, or null when there is none to show. */
  sinceGoal: number | null;
  /** Side that scored the latest goal. */
  scorer: Side | null;
  /** Remaining camera shake in seconds. */
  shake: number;
};

export const createTerrainState = (): TerrainState => ({
  grid: createGrid(),
  field: createField(),
  height: new Float32Array(VERTEX_COUNT).fill(0.1),
  awayShare: new Float32Array(VERTEX_COUNT).fill(0.5),
  bursts: [],
  ball: { x: 0.5, y: 0.5 },
  cursor: 0,
  possession: "home",
  target: { x: 0.5, y: 0.5 },
  front: 0.5,
  pull: 0.5,
  hold: 0,
  sinceGoal: null,
  scorer: null,
  shake: 0,
});

const recentre = (state: TerrainState): void => {
  clearField(state.field);
  state.target = { x: 0.5, y: 0.5 };
};

const applyEvent = (state: TerrainState, event: MatchEvent, reducedMotion: boolean): void => {
  for (const bump of bumpsForEvent(event)) addBump(state.field, state.grid, bump);
  state.possession = event.team;
  state.target = { x: event.position.x, y: event.position.y };
  if (event.type === "periodChange" && event.period === "halfTime") recentre(state);
  if (event.type === "goal") {
    state.hold = GOAL_HOLD_SECONDS;
    state.sinceGoal = 0;
    state.scorer = event.team;
    state.shake = reducedMotion ? 0 : 0.5;
    state.bursts.push({ side: event.team, x: event.position.x, y: event.position.y, age: 0 });
    addGaussian(
      state.field.slow[event.team],
      state.grid,
      event.position.x,
      event.position.y,
      1.2,
      0.35,
    );
  }
};

/**
 * Consumes the events up to `matchTime`. A goal stops consumption until its pause is over,
 * so later events wait and are shown after the reset.
 */
export const consumeEvents = (
  state: TerrainState,
  events: readonly MatchEvent[],
  matchTime: number,
  reducedMotion: boolean,
): void => {
  if (state.cursor > events.length) resetTerrain(state);
  while (state.hold <= 0) {
    const event = events[state.cursor];
    if (!event || event.time > matchTime) return;
    state.cursor += 1;
    applyEvent(state, event, reducedMotion);
  }
};

/** Back to a blank pitch, for a new match. */
export const resetTerrain = (state: TerrainState): void => {
  const fresh = createTerrainState();
  Object.assign(state, {
    ...fresh,
    grid: state.grid,
    field: state.field,
    height: state.height,
    awayShare: state.awayShare,
  });
  clearField(state.field);
  state.height.fill(0.1);
  state.awayShare.fill(0.5);
};

const ease = (current: number, target: number, rate: number, seconds: number): number =>
  current + (target - current) * (1 - Math.exp(-seconds * rate));

/** Moves the ball, front and decay forward by one frame. */
export const stepDynamics = (
  state: TerrainState,
  wallSeconds: number,
  matchSeconds: number,
): void => {
  decayField(state.field, matchSeconds);
  for (const burst of state.bursts) burst.age += wallSeconds;
  state.bursts = state.bursts.filter((burst) => burst.age <= 3.4);
  state.shake = Math.max(0, state.shake - wallSeconds);
  if (state.sinceGoal !== null) state.sinceGoal += wallSeconds;

  if (state.hold > 0) {
    state.hold -= wallSeconds;
    state.front = ease(state.front, 0.5, 2.5, wallSeconds);
    state.pull = ease(state.pull, 0.5, 2.5, wallSeconds);
    state.ball.x = ease(state.ball.x, 0.5, 2.5, wallSeconds);
    state.ball.y = ease(state.ball.y, 0.5, 2.5, wallSeconds);
    if (state.hold <= 0) recentre(state);
    return;
  }
  state.ball.x = ease(state.ball.x, state.target.x, 4, wallSeconds);
  state.ball.y = ease(state.ball.y, state.target.y, 4, wallSeconds);
  const attack = attackProgress(state.possession, state.ball.x);
  addGaussian(
    state.field.fast[state.possession],
    state.grid,
    state.ball.x,
    state.ball.y,
    matchSeconds * 0.04 * (0.3 + 0.45 * attack),
    0.07,
  );
  state.front = ease(state.front, 0.5 + (state.ball.x - 0.5) * 0.9, 0.36, wallSeconds);
  const pullTarget =
    state.possession === "home"
      ? Math.max(state.front, state.ball.x + 0.06)
      : Math.min(state.front, state.ball.x - 0.06);
  state.pull = ease(state.pull, pullTarget, 5, wallSeconds);
};
