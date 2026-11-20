import { beforeAll, describe, expect, it } from "vitest";
import { createActionMatch } from "../engine";
import type { Career } from "./career";
import { aCareer } from "./career-builders";
import { FORMATIONS, type Formation } from "./formation";
import type { Fixture } from "./generate-fixtures";
import { matchSeed } from "./match-input-for";
import {
  advanceThroughHalfTime,
  mirrorInput,
  userFixtureAsHome,
} from "./mirror-match-test-helpers";
import { planChange } from "./plan-change";

const MATCHES = 300;
const END = 100_000;
/** A change in the second half, after the first half has been played in the starting formation. */
const CHANGE_MINUTE = 60;
/** Largest change in goal difference (goals per match) a formation change may bring. */
const MAX_NET_GOAL_GAIN = 0.2;

const goalDifferenceOf = (
  career: Career,
  fixture: Fixture,
  seed: number,
  formation: Formation | undefined,
): number => {
  const match = createActionMatch(mirrorInput(career, fixture), seed, { detail: "fast" });
  if (formation) {
    advanceThroughHalfTime(match, CHANGE_MINUTE);
    const planned = planChange(career, fixture, { minute: CHANGE_MINUTE, formation });
    if (!planned.ok) throw new Error(planned.error);
    match.applyChange(planned.change);
  }
  match.advanceTo(END);
  if (match.state.period === "halfTime") match.resume();
  match.advanceTo(END);
  return match.state.score.home - match.state.score.away;
};

describe("formation change balance: the user's club against its own copy", () => {
  const career = aCareer();
  const fixture = userFixtureAsHome(career);
  const gains = new Map<Formation, number>();

  const meanGoalDifference = (formation: Formation | undefined): number => {
    let total = 0;
    for (let i = 0; i < MATCHES; i++) {
      total += goalDifferenceOf(career, fixture, matchSeed(career, fixture) + i, formation);
    }
    return total / MATCHES;
  };

  beforeAll(() => {
    const unchanged = meanGoalDifference(undefined);
    for (const formation of FORMATIONS) {
      if (formation !== career.squadPlan.formation) {
        gains.set(formation, meanGoalDifference(formation) - unchanged);
      }
    }
  }, 600_000);

  it.each(FORMATIONS.filter((f) => f !== aCareer().squadPlan.formation))(
    "no formation change gives a net advantage: %s",
    (formation) => {
      expect(gains.get(formation)).toBeLessThan(MAX_NET_GOAL_GAIN);
    },
  );
});
