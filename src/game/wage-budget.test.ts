import { describe, expect, it } from "vitest";
import { aCareer } from "./career-builders";
import { WAGE_BUDGET_SHARE, wageBill, wageBudget } from "./wage-budget";

const career = aCareer(5);
const club = career.league.clubs[0] as { id: string; playerIds: string[] };

describe("wageBudget", () => {
  it("is 75% of the base income, rounded down", () => {
    expect(WAGE_BUDGET_SHARE).toBe(0.75);
    expect(wageBudget({ baseIncome: 1001 })).toBe(750);
  });
});

describe("wageBill", () => {
  it("sums the wages of the club's players", () => {
    const expected = club.playerIds.reduce((s, id) => s + (career.contracts[id]?.wage ?? 0), 0);
    expect(wageBill(career, club.id)).toBe(expected);
    expect(expected).toBeGreaterThan(0);
  });

  it("is 0 for an unknown club", () => {
    expect(wageBill(career, "nope")).toBe(0);
  });
});
