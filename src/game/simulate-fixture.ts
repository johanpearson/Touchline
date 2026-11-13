import { createMatch } from "../engine";
import type { Career } from "./career";
import type { Result } from "./compute-table";
import type { Fixture } from "./generate-fixtures";
import { matchInputFor, matchSeed } from "./match-input-for";

/** Far beyond any match length: `advanceTo` stops at half-time and at full time by itself. */
const UNTIL_PERIOD_END = 1_000_000;

/** Plays a full match with the engine. The same career and fixture always give the same result. */
export const simulateFixture = (career: Career, fixture: Fixture): Result => {
  const match = createMatch(matchInputFor(career, fixture), matchSeed(career, fixture));
  match.advanceTo(UNTIL_PERIOD_END);
  match.resume();
  match.advanceTo(UNTIL_PERIOD_END);
  const { home, away } = match.state.score;
  return {
    fixtureId: fixture.id,
    homeClubId: fixture.homeClubId,
    awayClubId: fixture.awayClubId,
    homeGoals: home,
    awayGoals: away,
  };
};
