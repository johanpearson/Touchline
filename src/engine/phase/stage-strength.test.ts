import { describe, expect, it } from "vitest";
import { aTeamSheet } from "../action/action-builders";
import { NEUTRAL_TACTICS } from "../tactics";
import type { PhaseStart } from "./phase-step";
import { stageChance } from "./stage-strength";

const sheets = (home = aTeamSheet("Home", "h"), away = aTeamSheet("Away", "a")) => ({
  home: home.build(),
  away: away.build(),
});
const chance = (s: ReturnType<typeof sheets>, stage: 0 | 1 | 2, start: PhaseStart = "kickoff") =>
  stageChance(s, "home", stage, start);

describe("stageChance", () => {
  it("is higher for a stronger attack and lower for a stronger defence", () => {
    const base = chance(sheets(), 1);

    expect(chance(sheets(aTeamSheet("Home", "h").withAllAttributes(14)), 1)).toBeGreaterThan(base);
    expect(
      chance(sheets(undefined, aTeamSheet("Away", "a").withAllAttributes(14)), 1),
    ).toBeLessThan(base);
  });

  it("favours the home side by a small edge", () => {
    const even = sheets();

    expect(stageChance(even, "home", 1, "kickoff")).toBeGreaterThan(
      stageChance(even, "away", 1, "kickoff"),
    );
  });

  it("makes an attacking mentality riskier in build-up and more dangerous in the final third", () => {
    const attacking = sheets(
      aTeamSheet("Home", "h").withTactics({ ...NEUTRAL_TACTICS, mentality: "attacking" }),
    );

    expect(chance(attacking, 0)).toBeLessThan(chance(sheets(), 0));
    expect(chance(attacking, 2)).toBeGreaterThan(chance(sheets(), 2));
  });

  it("makes a high press win the ball more often in build-up", () => {
    const pressed = sheets(
      undefined,
      aTeamSheet("Away", "a").withTactics({ ...NEUTRAL_TACTICS, pressing: "high" }),
    );

    expect(chance(pressed, 0)).toBeLessThan(chance(sheets(), 0));
  });

  it("gives a counter more space against a high press, but not an ordinary possession", () => {
    const pressed = sheets(
      undefined,
      aTeamSheet("Away", "a").withTactics({ ...NEUTRAL_TACTICS, pressing: "high" }),
    );

    expect(chance(pressed, 2, "tackle")).toBeGreaterThan(chance(sheets(), 2, "tackle"));
    expect(chance(pressed, 2)).toBe(chance(sheets(), 2));
  });

  it("gives a set piece an edge in the final third", () => {
    expect(chance(sheets(), 2, "corner")).toBeGreaterThan(chance(sheets(), 2));
  });
});
