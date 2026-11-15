import { beforeAll, describe, expect, it } from "vitest";
import { NEUTRAL_TACTICS } from "../tactics";
import type { ActionBalanceSummary } from "./action-balance";
import { playWith, withTactics } from "./balance-test-support";

describe("action engine balance: each tactic moves the statistic it targets", () => {
  let neutral: ActionBalanceSummary;

  beforeAll(() => {
    neutral = playWith(NEUTRAL_TACTICS);
  }, 300_000);

  it("high pressing wins more turnovers high up and concedes more counters than low pressing", () => {
    const high = playWith(withTactics({ pressing: "high" }));
    const low = playWith(withTactics({ pressing: "low" }));

    expect(high.perSide.home.highTurnovers).toBeGreaterThan(low.perSide.home.highTurnovers);
    expect(high.perSide.home.countersConceded).toBeGreaterThan(low.perSide.home.countersConceded);
    expect(high.perSide.home.highTurnovers).toBeGreaterThan(neutral.perSide.home.highTurnovers);
  });

  it("wide play makes more crosses and wins more corners than neutral", () => {
    const s = playWith(withTactics({ width: "wide" }));

    expect(s.perSide.home.crosses).toBeGreaterThan(neutral.perSide.home.crosses);
    expect(s.perSide.home.corners).toBeGreaterThan(neutral.perSide.home.corners);
  });

  it("narrow play takes more central shots than neutral", () => {
    const s = playWith(withTactics({ width: "narrow" }));

    expect(s.perSide.home.centralShots).toBeGreaterThan(neutral.perSide.home.centralShots);
  });

  it("fast tempo makes more actions per match than neutral", () => {
    const s = playWith(withTactics({ tempo: "fast" }));

    expect(s.actionsPerMatch).toBeGreaterThan(neutral.actionsPerMatch);
  });

  it("attacking mentality takes and concedes more shots than neutral", () => {
    const s = playWith(withTactics({ mentality: "attacking" }));

    expect(s.perSide.home.shots).toBeGreaterThan(neutral.perSide.home.shots);
    expect(s.perSide.away.shots).toBeGreaterThan(neutral.perSide.away.shots);
  });
});
