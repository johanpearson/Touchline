import { describe, expect, it } from "vitest";
import type { Chance } from "./chance";
import { bigChanceStats, chancesOf } from "./chances-of";
import type { PhaseStep } from "./phase-step";

const aChance = (changes: Partial<Chance> = {}): Chance => ({
  kind: "openPlay",
  creator: "h2",
  shooter: "h9",
  situation: "box",
  xg: 0.1,
  result: "saved",
  keeper: "a1",
  aftermath: "corner",
  from: { x: 90, y: 34 },
  ...changes,
});

const aStep = (team: "home" | "away", chance: Chance, startTime = 100): PhaseStep => ({
  team,
  period: "firstHalf",
  startTime,
  endTime: startTime + 15,
  start: "interception",
  chain: [
    { player: chance.creator, at: { x: 70, y: 30 } },
    { player: chance.shooter, at: { x: 90, y: 34 } },
  ],
  outcome: "chance",
  chance,
});

const aLostStep = (): PhaseStep => ({
  team: "home",
  period: "firstHalf",
  startTime: 0,
  endTime: 12,
  start: "kickoff",
  chain: [
    { player: "h4", at: { x: 50, y: 34 } },
    { player: "h8", at: { x: 60, y: 34 } },
  ],
  outcome: "lost",
  how: "tackle",
  challenger: "a5",
});

describe("chancesOf", () => {
  it("lists the chance of every chance step in order and skips other steps", () => {
    const steps = [
      aLostStep(),
      aStep("home", aChance(), 100),
      aStep("away", aChance({ shooter: "a9" }), 200),
    ];

    const chances = chancesOf(steps);

    expect(chances.map((c) => [c.team, c.shooter, c.time])).toEqual([
      ["home", "h9", 115],
      ["away", "a9", 215],
    ]);
  });

  it("names creator, taker, result and the keeper who faced the shot", () => {
    const [chance] = chancesOf([aStep("home", aChance({ result: "woodwork" }))]);

    expect(chance).toMatchObject({
      creator: "h2",
      shooter: "h9",
      result: "woodwork",
      keeper: "a1",
      period: "firstHalf",
    });
  });

  it("marks a chance of 0.25 xG or more as clear", () => {
    const flags = chancesOf([
      aStep("home", aChance({ xg: 0.24 })),
      aStep("home", aChance({ xg: 0.25 })),
    ]).map((c) => c.clear);

    expect(flags).toEqual([false, true]);
  });

  it("gives nothing for no steps", () => {
    expect(chancesOf([])).toEqual([]);
  });
});

describe("bigChanceStats", () => {
  const steps = [
    aStep("home", aChance({ xg: 0.4, result: "saved" })),
    aStep("home", aChance({ xg: 0.5, result: "goal" })),
    aStep("home", aChance({ xg: 0.3, result: "wide", creator: "h3", shooter: "h10" })),
    aStep("home", aChance({ xg: 0.05, result: "over" })),
    aStep("away", aChance({ xg: 0.6, result: "woodwork", creator: "a2", shooter: "a9" })),
  ];

  it("counts per player the clear chances created and the ones taken and missed", () => {
    const { players } = bigChanceStats(steps);

    expect(players.h2).toEqual({ created: 2, taken: 0, missed: 0 });
    expect(players.h9).toEqual({ created: 0, taken: 2, missed: 1 });
    expect(players.h3).toEqual({ created: 1, taken: 0, missed: 0 });
    expect(players.h10).toEqual({ created: 0, taken: 1, missed: 1 });
    expect(players.a9).toEqual({ created: 0, taken: 1, missed: 1 });
  });

  it("leaves a small chance out of every count", () => {
    const { players } = bigChanceStats([aStep("home", aChance({ xg: 0.05, result: "over" }))]);

    expect(players).toEqual({});
  });

  it("sums created and missed per team", () => {
    const { teams } = bigChanceStats(steps);

    expect(teams.home).toEqual({ created: 3, missed: 2 });
    expect(teams.away).toEqual({ created: 1, missed: 1 });
  });
});
