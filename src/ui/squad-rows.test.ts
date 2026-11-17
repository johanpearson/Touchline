import { describe, expect, it } from "vitest";
import type { AttributeChange } from "../game";
import {
  developmentOf,
  potentialStars,
  type SquadRow,
  squadFinance,
  squadRows,
} from "./squad-rows";
import { careerAfter } from "./test-career";

describe("potentialStars", () => {
  it.each([
    [1, 1],
    [4, 1],
    [5, 2],
    [8, 2],
    [9, 3],
    [12, 3],
    [13, 4],
    [16, 4],
    [17, 5],
    [20, 5],
  ])("maps potential %i to %i stars", (potential, stars) => {
    expect(potentialStars(potential)).toBe(stars);
  });
});

describe("squadRows", () => {
  const career = careerAfter(0);
  const rows = squadRows(career);

  it("has one row per player of the user's club", () => {
    const club = career.league.clubs.find((c) => c.id === career.userClubId);
    expect(rows.map((r) => r.player.id).sort()).toEqual([...(club?.playerIds ?? [])].sort());
  });

  const first = rows[0] as SquadRow;
  const contract = career.contracts[first.player.id];

  it("carries age and potential stars", () => {
    expect(first.age).toBe(first.player.age);
    expect(first.potentialStars).toBe(potentialStars(first.player.potential));
  });

  it("carries the contract end and the wage", () => {
    expect(first.contractEnd).toBe(contract?.expiresSeason);
    expect(first.wage).toBe(contract?.wage);
  });

  it("carries a positive value and no minutes before the first match", () => {
    expect(first.value).toBeGreaterThan(0);
    expect(first.minutes).toBe(0);
  });

  it("reads season minutes from the career", () => {
    const id = career.squadPlan.starters[0] ?? "";
    const played = squadRows({ ...career, minutes: { [id]: 270 } });
    expect(played.find((r) => r.player.id === id)?.minutes).toBe(270);
  });
});

describe("developmentOf", () => {
  const changes: AttributeChange[] = [
    { playerId: "a", attribute: "pace", before: 10, after: 12 },
    { playerId: "a", attribute: "passing", before: 9, after: 8 },
    { playerId: "b", attribute: "pace", before: 5, after: 6 },
  ];

  it("lists the change of each attribute of one player", () => {
    expect(developmentOf(changes, "a")).toEqual({ pace: 2, passing: -1 });
  });

  it("is empty for a player without changes or without a list", () => {
    expect(developmentOf(changes, "c")).toEqual({});
    expect(developmentOf(undefined, "a")).toEqual({});
  });
});

describe("squadFinance", () => {
  it("reports balance, wage bill and wage budget, with no warnings for a fresh career", () => {
    const finance = squadFinance(careerAfter(0));
    expect(finance.wageBill).toBeGreaterThan(0);
    expect(finance.overBudget).toBe(false);
    expect(finance.negativeBalance).toBe(false);
  });

  it("warns when the wage bill exceeds the budget or the balance is negative", () => {
    const career = careerAfter(0);
    const finance = career.finances[career.userClubId];
    const poor = {
      ...career,
      finances: {
        ...career.finances,
        [career.userClubId]: { balance: -5, baseIncome: 1 },
      },
    };
    expect(finance).toBeDefined();
    const result = squadFinance(poor);
    expect(result.overBudget).toBe(true);
    expect(result.negativeBalance).toBe(true);
  });
});
