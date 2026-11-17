import { beforeAll, describe, expect, it } from "vitest";
import { createActionMatch, type Side } from "../engine";
import type { Career } from "./career";
import { aCareer } from "./career-builders";
import { createCoachedMatch } from "./coached-match";
import type { Fixture } from "./generate-fixtures";
import { matchInputFor, matchSeed } from "./match-input-for";
import { playMatchdays } from "./season-test-helpers";
import { playFixture } from "./simulate-fixture";

const MATCHES = 600;
/** The first matchday from which to look for a round in which the user's opponent substitutes. */
const FIRST_MATCHDAY = 6;
const LAST_MATCHDAY = 20;
/** Largest change in the AI's goal difference (goals per match) its substitutions and shouts may bring. */
const MAX_NET_GOAL_GAIN = 0.2;
const END = 100_000;

type Play = { aiGoalDifference: number; aiSubstitutions: number };

const finish = (match: { advanceTo: (s: number) => void; resume: () => void }): void => {
  match.advanceTo(END);
  match.resume();
  match.advanceTo(END);
};

/** A round of a played career in which the user's opponent has tired starters, so it uses substitutions. */
const roundWithSubstitutions = (): { career: Career; fixture: Fixture } => {
  for (let day = FIRST_MATCHDAY; day <= LAST_MATCHDAY; day++) {
    const career = playMatchdays(aCareer(), day);
    const fixture = career.season.fixtures.find(
      (f) =>
        f.matchday === career.season.currentMatchday &&
        (f.homeClubId === career.userClubId || f.awayClubId === career.userClubId),
    ) as Fixture;
    const reports = Object.values(playFixture(career, fixture).aiReports);
    const substitutes = reports.some((r) => Object.values(r.minutes).some((m) => m > 0 && m < 90));
    if (substitutes) return { career, fixture };
  }
  throw new Error("no round in which the user's opponent substitutes");
};

describe("AI changes: balance against the user's neutral plan", () => {
  const { career, fixture } = roundWithSubstitutions();
  const aiSide: Side = fixture.homeClubId === career.userClubId ? "away" : "home";
  const userSide: Side = aiSide === "home" ? "away" : "home";
  const results = { plain: [] as Play[], coached: [] as Play[] };

  beforeAll(() => {
    for (let i = 0; i < MATCHES; i++) {
      const seed = matchSeed(career, fixture) + i;
      const plain = createActionMatch(matchInputFor(career, fixture), seed, { detail: "fast" });
      finish(plain);
      results.plain.push({
        aiGoalDifference: plain.state.score[aiSide] - plain.state.score[userSide],
        aiSubstitutions: 0,
      });
      const coached = createCoachedMatch(career, fixture, { detail: "fast", seed });
      finish(coached);
      results.coached.push({
        aiGoalDifference: coached.state.score[aiSide] - coached.state.score[userSide],
        aiSubstitutions: coached.changes.filter((c) => c.change.lineup).length,
      });
    }
  }, 600_000);

  const mean = (plays: readonly Play[], pick: (p: Play) => number): number =>
    plays.reduce((sum, p) => sum + pick(p), 0) / plays.length;

  it("makes substitutions in most matches, so the comparison is meaningful", () => {
    const withSubs = results.coached.filter((p) => p.aiSubstitutions > 0).length;
    expect(withSubs / MATCHES).toBeGreaterThan(0.5);
  });

  it("gives the AI no net goal advantage over a club that never changes anything", () => {
    const gain =
      mean(results.coached, (p) => p.aiGoalDifference) -
      mean(results.plain, (p) => p.aiGoalDifference);
    expect(gain).toBeLessThan(MAX_NET_GOAL_GAIN);
  });
});
