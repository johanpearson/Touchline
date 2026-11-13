import { burstColourShare, burstHeight } from "./goal-burst";
import { read, VERTEX_COUNT } from "./terrain-grid";
import type { TerrainState } from "./terrain-state";

const smoothstep = (value: number): number => {
  const t = Math.min(1, Math.max(0, value));
  return t * t * (3 - 2 * t);
};

/** Height the surface settles at for a given amount of pressure. */
export const targetHeight = (pressure: number): number => 0.06 + 2.5 * (1 - Math.exp(-pressure));

/**
 * Updates the displayed `height` and `awayShare` of every vertex from the field,
 * the territorial front. `time` is wall-clock seconds, used for the front's sideways wobble.
 */
export const updateSurface = (state: TerrainState, wallSeconds: number, time: number): void => {
  const { field, grid } = state;
  const follow = 1 - Math.exp(-wallSeconds * 7);
  for (let i = 0; i < VERTEX_COUNT; i++) {
    const u = read(grid.u, i);
    const v = read(grid.v, i);
    const fastHome = read(field.fast.home, i);
    const fastAway = read(field.fast.away, i);
    const slowHome = read(field.slow.home, i);
    const slowAway = read(field.slow.away, i);

    const pressure = fastHome + fastAway + (slowHome + slowAway) * 1.3;
    const wobble = 0.035 * Math.sin(v * 9 + time * 1.3) + 0.02 * Math.sin(v * 23 - time * 2.1);
    const pull = (state.pull - state.front) * Math.exp(-((v - state.ball.y) ** 2) / 0.05);
    const ownHalf = smoothstep((u - (state.front + wobble + pull) + 0.05) / 0.1);
    const homePower = fastHome * 1.3 + slowHome * 0.25 + (1 - ownHalf) * 0.6 + 1e-3;
    const awayPower = fastAway * 1.3 + slowAway * 0.25 + ownHalf * 0.6 + 1e-3;

    const height =
      read(state.height, i) + (targetHeight(pressure) - read(state.height, i)) * follow;
    const share =
      read(state.awayShare, i) +
      (awayPower / (homePower + awayPower) - read(state.awayShare, i)) * follow;
    state.height[i] = height;
    state.awayShare[i] = share;
  }
};

/** Per-vertex values as shown, including idle ripple and goal bursts, written into the output arrays. */
export const composeSurface = (
  state: TerrainState,
  time: number,
  reducedMotion: boolean,
  heightOut: Float32Array,
  shareOut: Float32Array,
): void => {
  const noise = reducedMotion ? 0.012 : 0.06;
  for (let i = 0; i < VERTEX_COUNT; i++) {
    const u = read(state.grid.u, i);
    const v = read(state.grid.v, i);
    const base = read(state.height, i);
    const ripple =
      noise *
      (Math.sin(u * 6 + time * 0.9) * Math.cos(v * 5 - time * 0.7) +
        0.6 * Math.sin((u + v) * 11 - time * 1.7) +
        0.4 * Math.sin(u * 17 - v * 9 + time * 2.3)) *
      (1 + base * 0.8);
    let height = base + ripple;
    let share = read(state.awayShare, i);
    for (const burst of state.bursts) {
      height += burstHeight(burst, u, v);
      share = burstColourShare(burst, u, v, share);
    }
    heightOut[i] = height;
    shareOut[i] = share;
  }
};
