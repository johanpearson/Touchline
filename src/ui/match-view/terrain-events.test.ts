import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../../engine";
import { terrainEvents } from "./terrain-events";

const at = (time: number, type: "progress" | "periodChange", period?: string): MatchEvent =>
  ({
    type,
    time,
    team: "home",
    position: { x: 0.5, y: 0.5 },
    intensity: 0.5,
    ...(period ? { period } : {}),
  }) as MatchEvent;

const firstHalf = [at(10, "progress"), at(2700, "periodChange", "halfTime")];
const secondHalf = [at(2700, "periodChange", "secondHalf"), at(2800, "progress")];

describe("terrainEvents", () => {
  it("passes the whole log through during the first half", () => {
    expect(terrainEvents(firstHalf, "firstHalf")).toEqual(firstHalf);
  });

  it("gives an empty log at half-time so the pitch resets while paused", () => {
    expect(terrainEvents(firstHalf, "halfTime")).toEqual([]);
  });

  it("gives only second-half events once the second half has started", () => {
    const log = [...firstHalf, ...secondHalf];
    expect(terrainEvents(log, "secondHalf")).toEqual(secondHalf);
    expect(terrainEvents(log, "fullTime")).toEqual(secondHalf);
  });
});
