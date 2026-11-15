import { describe, expect, it } from "vitest";
import { formatBalanceTable, simulateActionBalance } from "./action-balance";
import { aMatchInputV2 } from "./action-builders";

describe("simulateActionBalance", () => {
  const input = aMatchInputV2().build();

  it("gives the same summary for the same arguments", () => {
    expect(simulateActionBalance(input, 3, 7)).toEqual(simulateActionBalance(input, 3, 7));
  });

  it("rejects a match count that is not a positive integer", () => {
    expect(() => simulateActionBalance(input, 0, 1)).toThrow(RangeError);
    expect(() => simulateActionBalance(input, 1.5, 1)).toThrow(RangeError);
  });

  it("reports totals as the sum of both sides and rates that add up to 1", () => {
    const s = simulateActionBalance(input, 5, 1);

    expect(s.matches).toBe(5);
    expect(s.goalsPerMatch).toBeCloseTo(s.perSide.home.goals + s.perSide.away.goals);
    expect(s.shotsPerMatch).toBeCloseTo(s.perSide.home.shots + s.perSide.away.shots);
    expect(s.homeWinRate + s.drawRate + s.awayWinRate).toBeCloseTo(1);
    expect(s.passesPerMatch).toBeGreaterThan(0);
    expect(s.passCompletion).toBeGreaterThan(0);
    expect(s.passCompletion).toBeLessThan(1);
    expect(s.actionsPerMatch).toBeGreaterThan(1000);
  });

  it("formats a markdown table with the title and the main rows", () => {
    const table = formatBalanceTable("Average vs average", simulateActionBalance(input, 2, 1));

    expect(table).toContain("**Average vs average** (2 matches)");
    expect(table).toContain("| Metric | Per match | Home | Away |");
    expect(table).toContain("| Pass completion |");
    expect(table).toContain("| Shots conceded on counters |");
    expect(table).toContain("Home / draw / away");
  });
});
