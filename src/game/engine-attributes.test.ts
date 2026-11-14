import { describe, expect, it } from "vitest";
import { ENGINE_ATTRIBUTE_NAMES, MAX_ENGINE_ATTRIBUTE, MIN_ENGINE_ATTRIBUTE } from "../engine";
import { ATTRIBUTE_NAMES, MAX_ATTRIBUTE, MIN_ATTRIBUTE } from "./player";

describe("engine player attributes", () => {
  it("use the same names, in the same order, as the game's player attributes", () => {
    expect([...ENGINE_ATTRIBUTE_NAMES]).toEqual([...ATTRIBUTE_NAMES]);
  });

  it("use the same value range as the game's player attributes", () => {
    expect(MIN_ENGINE_ATTRIBUTE).toBe(MIN_ATTRIBUTE);
    expect(MAX_ENGINE_ATTRIBUTE).toBe(MAX_ATTRIBUTE);
  });
});
