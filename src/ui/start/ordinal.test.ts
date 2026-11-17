import { describe, expect, it } from "vitest";
import { formatOrdinal } from "./ordinal";

describe("formatOrdinal", () => {
  it.each([
    [1, "1st"],
    [2, "2nd"],
    [3, "3rd"],
    [4, "4th"],
    [11, "11th"],
    [12, "12th"],
    [13, "13th"],
    [21, "21st"],
    [22, "22nd"],
  ])("writes %i as %s in English", (n, expected) => {
    expect(formatOrdinal(n, "en")).toBe(expected);
  });

  it.each([
    [1, "1:a"],
    [2, "2:a"],
    [3, "3:e"],
    [4, "4:e"],
    [11, "11:e"],
    [12, "12:e"],
    [14, "14:e"],
    [21, "21:a"],
    [22, "22:a"],
    [23, "23:e"],
  ])("writes %i as %s in Swedish", (n, expected) => {
    expect(formatOrdinal(n, "sv")).toBe(expected);
  });
});
