import { beforeAll, describe, expect, it } from "vitest";
import {
  type ActionBalanceSummary,
  formatBalanceTable,
  simulateActionBalance,
} from "./action-balance";
import { aMatchInputV2 } from "./action-builders";
import { BASE_SEED, between, MATCHES } from "./balance-test-support";

describe("action engine balance: two average teams", () => {
  let s: ActionBalanceSummary;

  beforeAll(() => {
    s = simulateActionBalance(aMatchInputV2().build(), MATCHES, BASE_SEED);
    console.info(`\n${formatBalanceTable("v2: average vs average", s)}\n`);
  }, 300_000);

  it("simulates at least 1000 matches", () => {
    expect(s.matches).toBeGreaterThanOrEqual(1000);
  });
  it("scores 2.4 to 3.0 goals per match", () => between(s.goalsPerMatch, 2.4, 3.0));
  it("takes 20 to 30 shots per match", () => between(s.shotsPerMatch, 20, 30));
  it("plays 800 to 1100 passes per match", () => between(s.passesPerMatch, 800, 1100));
  it("completes 75% to 88% of passes", () => between(s.passCompletion, 0.75, 0.88));
  it("takes 8 to 12 corners per match", () => between(s.cornersPerMatch, 8, 12));
  it("commits 20 to 28 fouls per match", () => between(s.foulsPerMatch, 20, 28));
  it("takes 35 to 50 throw-ins per match", () => between(s.throwInsPerMatch, 35, 50));
  it("awards 0.2 to 0.4 penalties per match", () => between(s.penaltiesPerMatch, 0.2, 0.4));
  it("keeps total xG within 15% of goals", () => {
    expect(Math.abs(s.xgPerMatch - s.goalsPerMatch)).toBeLessThanOrEqual(0.15 * s.goalsPerMatch);
  });
  it("is won by the home side in 42% to 48% of matches", () => between(s.homeWinRate, 0.42, 0.48));
  it("draws 20% to 32% of matches", () => between(s.drawRate, 0.2, 0.32));
});
