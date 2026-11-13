import { describe, expect, it } from "vitest";
import type { MatchEvent, PerSide } from "../engine";
import { attributeGoalScorers } from "./attribute-goal-scorers";
import type { SquadPlayer } from "./squad-player";

const goal = (team: "home" | "away", time: number): MatchEvent => ({
  type: "goal",
  team,
  time,
  position: { x: 0.95, y: 0.5 },
  intensity: 1,
  xg: 0.3,
});
const shot = (team: "home" | "away", time: number): MatchEvent => ({
  type: "shot",
  team,
  time,
  position: { x: 0.9, y: 0.5 },
  intensity: 0.5,
  xg: 0.1,
  outcome: "saved",
});

const player = (name: string, position: SquadPlayer["position"], finishing = 0.5): SquadPlayer => ({
  name,
  position,
  finishing,
});

const squads: PerSide<readonly SquadPlayer[]> = {
  home: [
    player("Keeper", "GK"),
    player("Defender", "DEF"),
    player("Midfielder", "MID"),
    player("Striker", "FWD"),
  ],
  away: [player("Away Defender", "DEF"), player("Away Striker", "FWD")],
};

const manyGoals = (n: number, team: "home" | "away" = "home"): MatchEvent[] =>
  Array.from({ length: n }, (_, i) => goal(team, i * 10));

const count = (names: readonly string[]) => {
  const counts: Record<string, number> = {};
  for (const name of names) counts[name] = (counts[name] ?? 0) + 1;
  return counts;
};

describe("attributeGoalScorers", () => {
  it("returns one scorer per goal event and ignores other events", () => {
    const events = [shot("home", 5), goal("home", 10), shot("away", 20), goal("away", 30)];
    expect(attributeGoalScorers(events, squads, 1)).toHaveLength(2);
  });

  it("credits each goal to a player of the scoring team", () => {
    const events = [goal("home", 1), goal("away", 2), goal("home", 3), goal("away", 4)];
    const scorers = attributeGoalScorers(events, squads, 7);
    expect(squads.home.map((p) => p.name)).toContain(scorers[0]);
    expect(squads.away.map((p) => p.name)).toContain(scorers[1]);
    expect(squads.home.map((p) => p.name)).toContain(scorers[2]);
    expect(squads.away.map((p) => p.name)).toContain(scorers[3]);
  });

  it("gives the same scorers for the same seed", () => {
    const events = manyGoals(20);
    expect(attributeGoalScorers(events, squads, 42)).toEqual(
      attributeGoalScorers(events, squads, 42),
    );
  });

  it("gives different scorers for different seeds", () => {
    const events = manyGoals(20);
    expect(attributeGoalScorers(events, squads, 1)).not.toEqual(
      attributeGoalScorers(events, squads, 2),
    );
  });

  it("keeps earlier scorers stable when later goals are added", () => {
    const short = attributeGoalScorers(manyGoals(3), squads, 5);
    const long = attributeGoalScorers(manyGoals(8), squads, 5);
    expect(long.slice(0, 3)).toEqual(short);
  });

  it("makes strikers score more often than midfielders, and those more than defenders", () => {
    const counts = count(attributeGoalScorers(manyGoals(4000), squads, 3));
    expect(counts.Striker).toBeGreaterThan(counts.Midfielder ?? 0);
    expect(counts.Midfielder).toBeGreaterThan(counts.Defender ?? 0);
    expect(counts.Defender ?? 0).toBeGreaterThan(counts.Keeper ?? 0);
  });

  it("makes better finishers score more often within the same position", () => {
    const forwards: PerSide<readonly SquadPlayer[]> = {
      home: [player("Sharp", "FWD", 0.9), player("Blunt", "FWD", 0.3)],
      away: squads.away,
    };
    const counts = count(attributeGoalScorers(manyGoals(4000), forwards, 3));
    expect(counts.Sharp).toBeGreaterThan((counts.Blunt ?? 0) * 2);
  });

  it("still picks a player when every weight is zero", () => {
    const zero: PerSide<readonly SquadPlayer[]> = {
      home: [player("Nobody", "FWD", 0)],
      away: squads.away,
    };
    expect(attributeGoalScorers(manyGoals(1), zero, 1)).toEqual(["Nobody"]);
  });

  it("throws when the scoring team has no players", () => {
    expect(() => attributeGoalScorers(manyGoals(1), { home: [], away: squads.away }, 1)).toThrow();
  });
});
