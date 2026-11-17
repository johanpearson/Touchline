import { describe, expect, it } from "vitest";
import { aCareer, deepFreeze } from "./career-builders";
import { askingWage, renewContract } from "./renew-contract";
import { wageBill, wageBudget } from "./wage-budget";

const base = aCareer(6);
const club = base.league.clubs[0] as { id: string; playerIds: string[] };
const playerId = club.playerIds[0] as string;

const expiring = (wageBudgetIncome?: number) =>
  deepFreeze({
    ...base,
    contracts: {
      ...base.contracts,
      [playerId]: { wage: 10, expiresSeason: base.season.number },
    },
    finances: {
      ...base.finances,
      ...(wageBudgetIncome === undefined
        ? {}
        : { [club.id]: { balance: 0, baseIncome: wageBudgetIncome } }),
    },
  });

const rich = () => expiring(10_000_000);

describe("renewContract", () => {
  it("sets the new wage and expiry and leaves the input untouched", () => {
    const career = rich();
    const ask = askingWage(career, playerId) as number;
    const result = renewContract(career, playerId, ask, 3);
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.career.contracts[playerId]).toEqual({
      wage: ask,
      expiresSeason: career.season.number + 3,
    });
    expect(career.contracts[playerId]?.wage).toBe(10);
  });

  it("refuses a wage below the ask", () => {
    const career = rich();
    const ask = askingWage(career, playerId) as number;
    expect(renewContract(career, playerId, ask - 1, 2)).toEqual({
      ok: false,
      error: "wage-too-low",
    });
  });

  it.each([0, 6, 1.5, Number.NaN])("refuses a length of %s", (seasons) => {
    const career = rich();
    const ask = askingWage(career, playerId) as number;
    expect(renewContract(career, playerId, ask, seasons)).toEqual({
      ok: false,
      error: "invalid-length",
    });
  });

  it("accepts the shortest and longest lengths", () => {
    const career = rich();
    const ask = askingWage(career, playerId) as number;
    expect(renewContract(career, playerId, ask, 1).ok).toBe(true);
    expect(renewContract(career, playerId, ask, 5).ok).toBe(true);
  });

  it("refuses an unknown player", () => {
    expect(renewContract(rich(), "nobody", 100, 2)).toEqual({ ok: false, error: "unknown-player" });
  });

  it("refuses a player whose contract runs past the current season", () => {
    const career = deepFreeze({
      ...base,
      contracts: {
        ...base.contracts,
        [playerId]: { wage: 10, expiresSeason: base.season.number + 1 },
      },
    });
    expect(renewContract(career, playerId, 1_000_000, 2)).toEqual({
      ok: false,
      error: "not-expiring",
    });
  });

  it("refuses a renewal that would push the wage bill over the wage budget", () => {
    const career = expiring(1000);
    const ask = askingWage(career, playerId) as number;
    const budget = wageBudget(career.finances[club.id] as { baseIncome: number });
    expect(wageBill(career, club.id) - 10 + ask).toBeGreaterThan(budget);
    expect(renewContract(career, playerId, ask, 2)).toEqual({
      ok: false,
      error: "over-wage-budget",
    });
  });

  it("allows a renewal that lands exactly on the wage budget", () => {
    const ask = askingWage(rich(), playerId) as number;
    const others = wageBill(rich(), club.id) - 10;
    const income = Math.ceil((others + ask) / 0.75);
    const career = expiring(income);
    expect(wageBill(career, club.id) - 10 + ask).toBeLessThanOrEqual(
      wageBudget(career.finances[club.id] as { baseIncome: number }),
    );
    expect(renewContract(career, playerId, ask, 2).ok).toBe(true);
  });
});
