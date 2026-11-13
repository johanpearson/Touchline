import { describe, expect, it } from "vitest";
import { parseHexColour, territoryMix, vertexColour } from "./terrain-colour";

const red = { r: 1, g: 0, b: 0 };
const blue = { r: 0, g: 0, b: 1 };

describe("terrain colour", () => {
  it("parses a hex colour into 0..1 channels", () => {
    expect(parseHexColour("#ff8000")).toEqual({ r: 1, g: 128 / 255, b: 0 });
  });

  it("falls back to grey for an invalid colour", () => {
    expect(parseHexColour("red")).toEqual({ r: 0.5, g: 0.5, b: 0.5 });
  });

  it("is fully home below the lower threshold and fully away above the upper", () => {
    expect(territoryMix(0.1)).toBe(0);
    expect(territoryMix(0.9)).toBe(1);
    expect(territoryMix(0.5)).toBeCloseTo(0.5, 10);
  });

  it("shows the home colour where home dominates", () => {
    const colour = vertexColour(red, blue, 0, 0);
    expect(colour.r).toBeGreaterThan(colour.b);
  });

  it("shows the away colour where away dominates", () => {
    const colour = vertexColour(red, blue, 1, 0);
    expect(colour.b).toBeGreaterThan(colour.r);
  });

  it("is brighter on higher ground", () => {
    expect(vertexColour(red, blue, 0, 2.5).r).toBeGreaterThan(vertexColour(red, blue, 0, 0).r);
  });
});
