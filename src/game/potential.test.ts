import { describe, expect, it } from "vitest";
import { createRng } from "../engine";
import { potentialFor } from "./potential";

const range = (age: number, overall: number): { min: number; max: number } => {
  const values = Array.from({ length: 300 }, (_, i) => potentialFor(age, overall, createRng(i)));
  return { min: Math.min(...values), max: Math.max(...values) };
};

describe("potentialFor", () => {
  it("adds 3 to 7 points at age 16 to 20", () => {
    expect(range(16, 8)).toEqual({ min: 11, max: 15 });
    expect(range(20, 8)).toEqual({ min: 11, max: 15 });
  });

  it("adds 1 to 4 points at age 21 to 24", () => {
    expect(range(21, 8)).toEqual({ min: 9, max: 12 });
    expect(range(24, 8)).toEqual({ min: 9, max: 12 });
  });

  it("adds 0 to 1 point from age 25", () => {
    expect(range(25, 8)).toEqual({ min: 8, max: 9 });
    expect(range(35, 8)).toEqual({ min: 8, max: 9 });
  });

  it("is never below a fractional overall", () => {
    expect(range(30, 8.25).min).toBe(9);
  });

  it("is at most 20", () => {
    expect(range(17, 19).max).toBe(20);
    expect(range(30, 20).max).toBe(20);
  });

  it("is deterministic for a seed", () => {
    expect(potentialFor(18, 9, createRng(4))).toBe(potentialFor(18, 9, createRng(4)));
  });
});
