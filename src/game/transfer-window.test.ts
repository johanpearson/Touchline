import { describe, expect, it } from "vitest";
import { aCareer } from "./career-builders";
import { isWindowOpen } from "./transfer-window";

describe("isWindowOpen", () => {
  it("is closed during the season and open in the off-season", () => {
    const career = aCareer();
    expect(isWindowOpen(career)).toBe(false);
    expect(isWindowOpen({ ...career, window: "open" })).toBe(true);
  });
});
