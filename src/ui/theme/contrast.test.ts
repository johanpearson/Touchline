import { describe, expect, it } from "vitest";
import { contrastRatio, parseHexColour, relativeLuminance } from "./contrast";

describe("parseHexColour", () => {
  it("reads a six digit hex colour", () => {
    expect(parseHexColour("#FFB547")).toEqual([255, 181, 71]);
  });

  it("reads a three digit hex colour", () => {
    expect(parseHexColour("#fa0")).toEqual([255, 170, 0]);
  });

  it("returns null for anything that is not an opaque hex colour", () => {
    expect(parseHexColour("rgba(0,0,0,0.25)")).toBeNull();
    expect(parseHexColour("#12345")).toBeNull();
    expect(parseHexColour("red")).toBeNull();
  });
});

describe("relativeLuminance", () => {
  it("is 0 for black and 1 for white", () => {
    expect(relativeLuminance([0, 0, 0])).toBe(0);
    expect(relativeLuminance([255, 255, 255])).toBeCloseTo(1, 10);
  });
});

describe("contrastRatio", () => {
  it("is 21 for black on white, in either order", () => {
    expect(contrastRatio([0, 0, 0], [255, 255, 255])).toBeCloseTo(21, 5);
    expect(contrastRatio([255, 255, 255], [0, 0, 0])).toBeCloseTo(21, 5);
  });

  it("is 1 for identical colours", () => {
    expect(contrastRatio([10, 20, 30], [10, 20, 30])).toBeCloseTo(1, 10);
  });

  it("matches the value documented in docs/design.md for amber text on white", () => {
    expect(contrastRatio([255, 181, 71], [255, 255, 255])).toBeCloseTo(1.76, 1);
  });
});
