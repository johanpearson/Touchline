import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../../../engine";
import { createTerrainDriver } from "./terrain-driver";

const goal: MatchEvent = {
  type: "goal",
  time: 5,
  team: "home",
  position: { x: 0.95, y: 0.5 },
  intensity: 1,
  xg: 0.3,
};
const input = { events: [goal], matchTime: 10, wallSeconds: 0.016, time: 1, reducedMotion: false };

describe("terrain driver", () => {
  it("flashes in the scorer's side when a goal is consumed", () => {
    const frame = createTerrainDriver().frame(input);
    expect(frame.flash?.side).toBe("home");
    expect(frame.shake).toBeGreaterThan(0);
  });

  it("does not flash with reduced motion", () => {
    expect(createTerrainDriver().frame({ ...input, reducedMotion: true }).flash).toBeNull();
  });

  it("does not flash before any goal", () => {
    expect(createTerrainDriver().frame({ ...input, events: [] }).flash).toBeNull();
  });

  it("starts over when match time goes backwards", () => {
    const driver = createTerrainDriver();
    driver.frame(input);
    const frame = driver.frame({ ...input, matchTime: 0, events: [] });
    expect(frame.flash).toBeNull();
  });
});
