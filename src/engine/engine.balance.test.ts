import { beforeAll, describe, expect, it } from "vitest";
import { type BalanceSummary, formatBalanceTable, simulateBalance } from "./balance-harness";
import { aMatchInput, aTeamProfile } from "./match-builders";

const MATCHES = 2000;
const BASE_SEED = 1;

describe("engine balance: two average teams", () => {
  let summary: BalanceSummary;

  beforeAll(() => {
    summary = simulateBalance(aMatchInput().build(), MATCHES, BASE_SEED);
    console.info(`\n${formatBalanceTable("Average vs average", summary)}\n`);
  });

  it("simulates at least 1000 matches", () => {
    expect(summary.matches).toBeGreaterThanOrEqual(1000);
  });

  it("scores 2.4 to 3.0 goals per match", () => {
    expect(summary.goalsPerMatch).toBeGreaterThanOrEqual(2.4);
    expect(summary.goalsPerMatch).toBeLessThanOrEqual(3.0);
  });

  it("takes 20 to 30 shots per match", () => {
    expect(summary.shotsPerMatch).toBeGreaterThanOrEqual(20);
    expect(summary.shotsPerMatch).toBeLessThanOrEqual(30);
  });

  it("keeps total xG within 15% of goals", () => {
    expect(Math.abs(summary.xgPerMatch - summary.goalsPerMatch)).toBeLessThanOrEqual(
      0.15 * summary.goalsPerMatch,
    );
  });

  it("draws 20% to 32% of matches", () => {
    expect(summary.drawRate).toBeGreaterThanOrEqual(0.2);
    expect(summary.drawRate).toBeLessThanOrEqual(0.32);
  });
});

describe("engine balance: clearly stronger team", () => {
  const strong = aTeamProfile("Strong").withAllRatings(0.6).build();
  const weak = aTeamProfile("Weak").withAllRatings(0.4).build();

  it("wins 60% to 75% of matches at home, and the weaker team still wins at least 10%", () => {
    const input = aMatchInput().withHome(strong).withAway(weak).build();

    const summary = simulateBalance(input, MATCHES, BASE_SEED);

    console.info(`\n${formatBalanceTable("Strong (0.6) vs weak (0.4)", summary)}\n`);
    expect(summary.homeWinRate).toBeGreaterThanOrEqual(0.6);
    expect(summary.homeWinRate).toBeLessThanOrEqual(0.75);
    expect(summary.awayWinRate).toBeGreaterThanOrEqual(0.1);
  });

  it("wins 60% to 75% of matches away, and the weaker team still wins at least 10%", () => {
    const input = aMatchInput().withHome(weak).withAway(strong).build();

    const summary = simulateBalance(input, MATCHES, BASE_SEED);

    expect(summary.awayWinRate).toBeGreaterThanOrEqual(0.6);
    expect(summary.awayWinRate).toBeLessThanOrEqual(0.75);
    expect(summary.homeWinRate).toBeGreaterThanOrEqual(0.1);
  });
});
