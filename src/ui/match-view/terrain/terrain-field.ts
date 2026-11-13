import type { Side } from "../../../engine";
import { ASPECT, type Grid, read, VERTEX_COUNT } from "./terrain-grid";

/** Gaussian pressure bumps per team: a fast layer that fades in seconds and a slow layer for lasting territory. */
export type TerrainField = {
  fast: Record<Side, Float32Array>;
  slow: Record<Side, Float32Array>;
};

export type Bump = { side: Side; x: number; y: number; amplitude: number; sigma: number };

/** Match seconds for a fast bump to fade to 1/e. */
export const FAST_DECAY_SECONDS = 25;
/** Match seconds for the slow layer to fade to 1/e. */
export const SLOW_DECAY_SECONDS = 300;
const SLOW_SHARE = 0.12;
const SLOW_SIGMA = 0.22;

export const createField = (): TerrainField => ({
  fast: { home: new Float32Array(VERTEX_COUNT), away: new Float32Array(VERTEX_COUNT) },
  slow: { home: new Float32Array(VERTEX_COUNT), away: new Float32Array(VERTEX_COUNT) },
});

/** Adds a Gaussian bump centred on (x, y) to one layer. */
export const addGaussian = (
  layer: Float32Array,
  grid: Grid,
  x: number,
  y: number,
  amplitude: number,
  sigma: number,
): void => {
  const twoSigmaSquared = 2 * sigma * sigma;
  const limit = 9 * sigma * sigma;
  for (let i = 0; i < VERTEX_COUNT; i++) {
    const dx = read(grid.u, i) - x;
    const dy = (read(grid.v, i) - y) * ASPECT;
    const distanceSquared = dx * dx + dy * dy;
    if (distanceSquared < limit) {
      layer[i] = read(layer, i) + amplitude * Math.exp(-distanceSquared / twoSigmaSquared);
    }
  }
};

/** Adds a bump to the fast layer and a small, wide trace to the slow layer. */
export const addBump = (field: TerrainField, grid: Grid, bump: Bump): void => {
  addGaussian(field.fast[bump.side], grid, bump.x, bump.y, bump.amplitude, bump.sigma);
  addGaussian(field.slow[bump.side], grid, bump.x, bump.y, bump.amplitude * SLOW_SHARE, SLOW_SIGMA);
};

const scaleLayer = (layer: Float32Array, factor: number): void => {
  for (let i = 0; i < VERTEX_COUNT; i++) layer[i] = read(layer, i) * factor;
};

/** Fades the field over `matchSeconds` of match time. */
export const decayField = (field: TerrainField, matchSeconds: number): void => {
  const fast = Math.exp(-matchSeconds / FAST_DECAY_SECONDS);
  const slow = Math.exp(-matchSeconds / SLOW_DECAY_SECONDS);
  for (const side of ["home", "away"] as const) {
    scaleLayer(field.fast[side], fast);
    scaleLayer(field.slow[side], slow);
  }
};

export const clearField = (field: TerrainField): void => {
  for (const side of ["home", "away"] as const) {
    field.fast[side].fill(0);
    field.slow[side].fill(0);
  }
};
