import { describe, expect, it } from "vitest";
import { formatBalanceTable, simulateActionBalance } from "./action-balance";
import { aMatchInput, aTeamSheet } from "./action-builders";
import { AVERAGE, BASE_SEED, between, MATCHES } from "./balance-test-support";

const STRONGER = AVERAGE + 4;

describe("action engine balance: clearly stronger team", () => {
  const strong = aTeamSheet("Strong", "s").withAllAttributes(STRONGER).build();
  const weak = aTeamSheet("Weak", "w").build();

  it("wins 55% to 80% at home, and the weaker team still wins at least 10%", () => {
    const input = aMatchInput().withHome(strong).withAway(weak).build();

    const s = simulateActionBalance(input, MATCHES, BASE_SEED);

    console.info(`\n${formatBalanceTable("v2: strong (14) at home vs average (10)", s)}\n`);
    between(s.homeWinRate, 0.55, 0.8);
    expect(s.awayWinRate).toBeGreaterThanOrEqual(0.1);
  });

  it("wins 55% to 80% away, and the weaker team still wins at least 10%", () => {
    const input = aMatchInput().withHome(weak).withAway(strong).build();

    const s = simulateActionBalance(input, MATCHES, BASE_SEED);

    between(s.awayWinRate, 0.55, 0.8);
    expect(s.homeWinRate).toBeGreaterThanOrEqual(0.1);
  });
});
