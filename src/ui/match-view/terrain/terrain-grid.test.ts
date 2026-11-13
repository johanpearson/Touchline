import { describe, expect, it } from "vitest";
import { createGrid, GRID_X, GRID_Y, read, VERTEX_COUNT, vertexIndexAt } from "./terrain-grid";

describe("terrain grid", () => {
  it("has one vertex per grid corner", () => {
    const grid = createGrid();
    expect(grid.u).toHaveLength(VERTEX_COUNT);
    expect(grid.v).toHaveLength(VERTEX_COUNT);
  });

  it("maps the first and last vertex to opposite pitch corners", () => {
    const grid = createGrid();
    expect([read(grid.u, 0), read(grid.v, 0)]).toEqual([0, 0]);
    expect([read(grid.u, VERTEX_COUNT - 1), read(grid.v, VERTEX_COUNT - 1)]).toEqual([1, 1]);
  });

  it("finds the vertex nearest to a pitch position", () => {
    expect(vertexIndexAt(0, 0)).toBe(0);
    expect(vertexIndexAt(1, 1)).toBe(VERTEX_COUNT - 1);
    expect(vertexIndexAt(0.5, 0.5)).toBe((GRID_Y / 2) * (GRID_X + 1) + GRID_X / 2);
  });

  it("clamps positions outside the pitch", () => {
    expect(vertexIndexAt(-3, 7)).toBe(GRID_Y * (GRID_X + 1));
  });
});
