import { beforeAll, describe, expect, it } from "vitest";
import { NEUTRAL_TACTICS, type TeamTactics } from "../tactics";
import type { ActionBalanceSummary } from "./action-balance";
import { playWith } from "./balance-test-support";
import { combinationsFor, labelOf } from "./tactic-combinations";

/** One file per mentality and pressing level, so the 81 combinations spread evenly over the workers. */
const COMBINATION_MATCHES = 500;
const combinations = combinationsFor("balanced", "high");

describe("action engine balance: no dominant tactic (balanced, high pressing)", () => {
  let reference: ActionBalanceSummary;
  let results: { t: TeamTactics; s: ActionBalanceSummary }[];

  beforeAll(() => {
    reference = playWith(NEUTRAL_TACTICS, COMBINATION_MATCHES);
    results = combinations.map((t) => ({ t, s: playWith(t, COMBINATION_MATCHES) }));
  }, 1_200_000);

  it("never wins more than 58% of matches against the neutral setting between equal teams", () => {
    const tooStrong = results.filter(({ s }) => s.homeWinRate > 0.58);

    expect(tooStrong.map(({ t, s }) => `${labelOf(t)} ${s.homeWinRate}`)).toEqual([]);
    expect(reference.homeWinRate).toBeLessThan(0.58);
  });

  it("is never strictly better than neutral on both goals for and goals against", () => {
    const dominant = results.filter(
      ({ s }) =>
        s.perSide.home.goals > reference.perSide.home.goals &&
        s.perSide.away.goals < reference.perSide.away.goals,
    );

    expect(dominant.map(({ t }) => labelOf(t))).toEqual([]);
  });
});
