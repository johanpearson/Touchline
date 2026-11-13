import { describe, expect, it } from "vitest";
import type { MatchEvent } from "../../../engine";
import { bumpsForEvent } from "./event-bump";

const base = { time: 10, team: "home", position: { x: 0.8, y: 0.4 }, intensity: 0.5 } as const;

describe("bumpsForEvent", () => {
  it("adds a bump for the team and position of a progress event", () => {
    const [bump] = bumpsForEvent({ ...base, type: "progress" });
    expect(bump).toMatchObject({ side: "home", x: 0.8, y: 0.4 });
  });

  it("makes advanced progress taller and narrower than deep progress", () => {
    const high = bumpsForEvent({ ...base, type: "progress" })[0];
    const deep = bumpsForEvent({ ...base, position: { x: 0.2, y: 0.4 }, type: "progress" })[0];
    expect(high?.amplitude).toBeGreaterThan(deep?.amplitude ?? 0);
    expect(high?.sigma).toBeLessThan(deep?.sigma ?? 0);
  });

  it("measures progress from the attacking direction of the away team", () => {
    const away = bumpsForEvent({
      ...base,
      team: "away",
      position: { x: 0.2, y: 0.4 },
      type: "progress",
    })[0];
    const home = bumpsForEvent({ ...base, position: { x: 0.8, y: 0.4 }, type: "progress" })[0];
    expect(away?.amplitude).toBeCloseTo(home?.amplitude ?? 0, 10);
  });

  it("scales a shot with its expected goals", () => {
    const small = bumpsForEvent({ ...base, type: "shot", xg: 0.05, outcome: "saved" })[0];
    const big = bumpsForEvent({ ...base, type: "shot", xg: 0.4, outcome: "saved" })[0];
    expect(big?.amplitude).toBeGreaterThan(small?.amplitude ?? 0);
  });

  it("makes a goal the tallest bump", () => {
    const goal = bumpsForEvent({ ...base, type: "goal", xg: 0.1 })[0]?.amplitude ?? 0;
    const shot =
      bumpsForEvent({ ...base, type: "shot", xg: 0.1, outcome: "saved" })[0]?.amplitude ?? 0;
    expect(goal).toBeGreaterThan(shot);
  });

  it.each<MatchEvent["type"]>(["lateral", "turnover", "corner", "foul"])(
    "adds one bump for a %s",
    (type) => {
      expect(bumpsForEvent({ ...base, type } as MatchEvent)).toHaveLength(1);
    },
  );

  it("adds nothing for a kick-off or period change", () => {
    expect(bumpsForEvent({ ...base, type: "kickoff" })).toEqual([]);
    expect(bumpsForEvent({ ...base, type: "periodChange", period: "halfTime" })).toEqual([]);
  });
});
