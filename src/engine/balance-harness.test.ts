import { describe, expect, it } from "vitest";
import { formatBalanceTable, simulateBalance } from "./balance-harness";
import { aMatchInput } from "./match-builders";

describe("simulateBalance", () => {
  it("is reproducible for the same base seed", () => {
    const input = aMatchInput().build();
    expect(simulateBalance(input, 5, 100)).toEqual(simulateBalance(input, 5, 100));
  });

  it("reports the number of simulated matches", () => {
    expect(simulateBalance(aMatchInput().build(), 3, 1).matches).toBe(3);
  });

  it("splits matches into home wins, draws and away wins that sum to one", () => {
    const s = simulateBalance(aMatchInput().build(), 20, 1);
    expect(s.homeWinRate + s.drawRate + s.awayWinRate).toBeCloseTo(1, 10);
  });

  it("reports positive shot, goal and xG averages for a full match", () => {
    const s = simulateBalance(aMatchInput().build(), 10, 1);
    expect(s.shotsPerMatch).toBeGreaterThan(0);
    expect(s.xgPerMatch).toBeGreaterThan(0);
    expect(s.goalsPerMatch).toBeGreaterThanOrEqual(0);
  });

  it("reports per-side averages that add up to the match totals", () => {
    const s = simulateBalance(aMatchInput().build(), 10, 1);

    expect(s.perSide.home.goals + s.perSide.away.goals).toBeCloseTo(s.goalsPerMatch, 10);
    expect(s.perSide.home.shots + s.perSide.away.shots).toBeCloseTo(s.shotsPerMatch, 10);
    expect(s.perSide.home.corners).toBeGreaterThanOrEqual(0);
    expect(s.perSide.away.lateralMoves).toBeGreaterThan(0);
  });

  it("counts turnovers won in the opponent half for the side that wins the ball", () => {
    const s = simulateBalance(aMatchInput().build(), 10, 1);

    expect(s.perSide.home.highTurnovers).toBeGreaterThan(0);
    expect(s.perSide.away.highTurnovers).toBeGreaterThan(0);
  });

  it("rejects a match count below one", () => {
    expect(() => simulateBalance(aMatchInput().build(), 0, 1)).toThrow(RangeError);
  });
});

describe("formatBalanceTable", () => {
  it("lists each metric as a markdown table row", () => {
    const summary = simulateBalance(aMatchInput().build(), 5, 1);
    const table = formatBalanceTable("Average vs average", summary);
    expect(table).toContain("| Metric | Value |");
    expect(table).toContain("| Matches | 5 |");
    expect(table).toContain("Goals per match");
    expect(table).toContain("Draw rate");
    expect(table).toContain("Average vs average");
  });
});
