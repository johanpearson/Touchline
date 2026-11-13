/** World size of the pitch surface in scene units. */
export const PITCH_WIDTH = 10.5;
export const PITCH_DEPTH = 6.8;
/** Grid cells along the length and across the width of the pitch. */
export const GRID_X = 96;
export const GRID_Y = 62;
export const VERTEX_COUNT = (GRID_X + 1) * (GRID_Y + 1);
/** Converts a normalised y distance to the same scale as x, so bumps stay round. */
export const ASPECT = PITCH_DEPTH / PITCH_WIDTH;

export type Grid = {
  /** Normalised position of each vertex along the pitch length, 0..1. */
  u: Float32Array;
  /** Normalised position of each vertex across the pitch width, 0..1. */
  v: Float32Array;
};

/** Reads a typed array entry; indexes are always in range inside this module. */
export const read = (values: Float32Array, index: number): number => values[index] as number;

export const createGrid = (): Grid => {
  const u = new Float32Array(VERTEX_COUNT);
  const v = new Float32Array(VERTEX_COUNT);
  for (let iy = 0; iy <= GRID_Y; iy++) {
    for (let ix = 0; ix <= GRID_X; ix++) {
      const i = iy * (GRID_X + 1) + ix;
      u[i] = ix / GRID_X;
      v[i] = iy / GRID_Y;
    }
  }
  return { u, v };
};

/** Index of the vertex nearest to a normalised pitch position. */
export const vertexIndexAt = (x: number, y: number): number => {
  const ix = Math.round(Math.min(1, Math.max(0, x)) * GRID_X);
  const iy = Math.round(Math.min(1, Math.max(0, y)) * GRID_Y);
  return iy * (GRID_X + 1) + ix;
};
