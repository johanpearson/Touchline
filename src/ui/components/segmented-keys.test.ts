import { describe, expect, it } from "vitest";
import { targetIndex } from "./segmented-keys";

const all = [true, true, true];

describe("targetIndex", () => {
  it("moves right and wraps around", () => {
    expect(targetIndex("ArrowRight", 0, all)).toBe(1);
    expect(targetIndex("ArrowRight", 2, all)).toBe(0);
  });

  it("moves left and wraps around", () => {
    expect(targetIndex("ArrowLeft", 1, all)).toBe(0);
    expect(targetIndex("ArrowLeft", 0, all)).toBe(2);
  });

  it("treats down like right and up like left", () => {
    expect(targetIndex("ArrowDown", 0, all)).toBe(1);
    expect(targetIndex("ArrowUp", 0, all)).toBe(2);
  });

  it("skips disabled options", () => {
    expect(targetIndex("ArrowRight", 0, [true, false, true])).toBe(2);
    expect(targetIndex("ArrowLeft", 0, [true, false, true])).toBe(2);
  });

  it("jumps to the first and last enabled option with Home and End", () => {
    expect(targetIndex("Home", 2, [false, true, true])).toBe(1);
    expect(targetIndex("End", 0, [true, true, false])).toBe(1);
  });

  it("ignores other keys", () => {
    expect(targetIndex("a", 0, all)).toBe(-1);
    expect(targetIndex("Enter", 0, all)).toBe(-1);
  });

  it("finds nothing when every option is disabled", () => {
    expect(targetIndex("ArrowRight", 0, [false, false])).toBe(-1);
    expect(targetIndex("Home", 0, [false, false])).toBe(-1);
  });

  it("stays on the only enabled option", () => {
    expect(targetIndex("ArrowRight", 1, [false, true, false])).toBe(1);
  });
});
