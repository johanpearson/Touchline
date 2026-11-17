import { describe, expect, it } from "vitest";
import { nextActiveIndex } from "./active-index";

describe("nextActiveIndex", () => {
  it("moves down and up one result", () => {
    expect(nextActiveIndex(0, 5, "ArrowDown")).toBe(1);
    expect(nextActiveIndex(3, 5, "ArrowUp")).toBe(2);
  });

  it("wraps around at both ends", () => {
    expect(nextActiveIndex(4, 5, "ArrowDown")).toBe(0);
    expect(nextActiveIndex(0, 5, "ArrowUp")).toBe(4);
  });

  it("jumps to the first and last result", () => {
    expect(nextActiveIndex(2, 5, "Home")).toBe(0);
    expect(nextActiveIndex(2, 5, "End")).toBe(4);
  });

  it("returns -1 when there is nothing to highlight", () => {
    expect(nextActiveIndex(0, 0, "ArrowDown")).toBe(-1);
    expect(nextActiveIndex(-1, 0, "End")).toBe(-1);
  });

  it("starts at the ends when nothing is highlighted yet", () => {
    expect(nextActiveIndex(-1, 3, "ArrowDown")).toBe(0);
    expect(nextActiveIndex(-1, 3, "ArrowUp")).toBe(2);
  });
});
