import { describe, expect, it } from "vitest";
import {
  addBump,
  clearField,
  createField,
  decayField,
  FAST_DECAY_SECONDS,
  SLOW_DECAY_SECONDS,
} from "./terrain-field";
import { createGrid, read, vertexIndexAt } from "./terrain-grid";

const grid = createGrid();
const centre = vertexIndexAt(0.5, 0.5);

describe("terrain field", () => {
  it("raises the field most at the centre of a bump", () => {
    const field = createField();
    addBump(field, grid, { side: "home", x: 0.5, y: 0.5, amplitude: 1, sigma: 0.1 });
    expect(read(field.fast.home, centre)).toBeCloseTo(1, 5);
    expect(read(field.fast.home, vertexIndexAt(0.6, 0.5))).toBeLessThan(0.7);
  });

  it("leaves the opposing team and distant vertices untouched", () => {
    const field = createField();
    addBump(field, grid, { side: "home", x: 0.2, y: 0.5, amplitude: 1, sigma: 0.05 });
    expect(read(field.fast.away, vertexIndexAt(0.2, 0.5))).toBe(0);
    expect(read(field.fast.home, vertexIndexAt(0.9, 0.5))).toBe(0);
  });

  it("leaves a small lasting trace in the slow layer", () => {
    const field = createField();
    addBump(field, grid, { side: "away", x: 0.5, y: 0.5, amplitude: 1, sigma: 0.05 });
    expect(read(field.slow.away, centre)).toBeCloseTo(0.12, 5);
  });

  it("fades the fast layer faster than the slow layer", () => {
    const field = createField();
    addBump(field, grid, { side: "home", x: 0.5, y: 0.5, amplitude: 1, sigma: 0.1 });
    const fastBefore = read(field.fast.home, centre);
    const slowBefore = read(field.slow.home, centre);
    decayField(field, FAST_DECAY_SECONDS);
    expect(read(field.fast.home, centre)).toBeCloseTo(fastBefore / Math.E, 5);
    expect(read(field.slow.home, centre) / slowBefore).toBeCloseTo(
      Math.exp(-FAST_DECAY_SECONDS / SLOW_DECAY_SECONDS),
      5,
    );
  });

  it("clears every layer", () => {
    const field = createField();
    addBump(field, grid, { side: "home", x: 0.5, y: 0.5, amplitude: 1, sigma: 0.1 });
    clearField(field);
    expect(read(field.fast.home, centre)).toBe(0);
    expect(read(field.slow.home, centre)).toBe(0);
  });
});
