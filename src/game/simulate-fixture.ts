import { type ActionEvent, createActionMatch } from "../engine";
import type { Career } from "./career";
import type { Result } from "./compute-table";
import type { Fixture } from "./generate-fixtures";
import { goalScorersOf } from "./goal-scorers";
import { matchInputFor, matchSeed } from "./match-input-for";

/** Far beyond any match length: `advanceTo` stops at half-time and at full time by itself. */
const UNTIL_PERIOD_END = 1_000_000;

type Playable = {
  events: readonly ActionEvent[];
  advanceTo: (seconds: number) => void;
  resume: () => void;
  state: { score: { home: number; away: number } };
};

type Played = { score: { home: number; away: number }; scorers: string[] };

const playOut = (match: Playable): Played => {
  match.advanceTo(UNTIL_PERIOD_END);
  match.resume();
  match.advanceTo(UNTIL_PERIOD_END);
  return { score: match.state.score, scorers: goalScorersOf(match.events) };
};

const playFixture = (career: Career, fixture: Fixture): Played => {
  const seed = matchSeed(career, fixture);
  // The quick sim is never viewed, so it uses the fast path without position snapshots.
  return playOut(createActionMatch(matchInputFor(career, fixture), seed, { detail: "fast" }));
};

/**
 * Plays a full match and records who scored each goal. The same career and fixture always give the same result, stamped with the
 * engine version it was played on.
 */
export const simulateFixture = (career: Career, fixture: Fixture): Result => {
  const { score, scorers } = playFixture(career, fixture);
  return {
    fixtureId: fixture.id,
    homeClubId: fixture.homeClubId,
    awayClubId: fixture.awayClubId,
    homeGoals: score.home,
    awayGoals: score.away,
    engineVersion: career.engineVersion,
    scorers,
  };
};
