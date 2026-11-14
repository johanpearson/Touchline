import type { Career, MatchdayError, MatchdayResult } from "./career";
import type { Result } from "./compute-table";
import type { Fixture } from "./generate-fixtures";
import { getNextFixture } from "./get-next-fixture";
import { simulateFixture } from "./simulate-fixture";
import { type MatchReport, updateConditionAfterMatchday } from "./update-condition";

const fail = (error: MatchdayError): MatchdayResult => ({ ok: false, error });

const checkUserResult = (
  career: Career,
  userFixture: Fixture,
  userResult: Result,
): MatchdayError | undefined => {
  const { season } = career;
  if (season.results.some((r) => r.fixtureId === userResult.fixtureId)) {
    return "matchday-already-completed";
  }
  if (userResult.fixtureId !== userFixture.id) {
    const known = season.fixtures.some((f) => f.id === userResult.fixtureId);
    return known ? "wrong-matchday" : "wrong-fixture";
  }
  if (
    userResult.homeClubId !== userFixture.homeClubId ||
    userResult.awayClubId !== userFixture.awayClubId
  ) {
    return "wrong-fixture";
  }
  return undefined;
};

/**
 * Completes the current matchday: takes the user's result (from the match view or `simulateFixture`),
 * simulates every other fixture of the round and returns a new career on the next matchday.
 * The input career is not changed. Results are appended in fixture order, so the other matches
 * do not depend on how the user's match was produced. Fitness and form of every player are updated;
 * without a `report` the user's starters count as having played 90 minutes.
 */
export const completeMatchday = (
  career: Career,
  userResult: Result,
  report?: MatchReport,
): MatchdayResult => {
  const { season } = career;
  const userFixture = getNextFixture(season, career.userClubId);
  if (!userFixture) return fail("season-complete");
  const error = checkUserResult(career, userFixture, userResult);
  if (error) return fail(error);

  const matchdayResults = season.fixtures
    .filter((f) => f.matchday === season.currentMatchday)
    .map((f) => (f.id === userFixture.id ? userResult : simulateFixture(career, f)));

  return {
    ok: true,
    career: {
      ...career,
      condition: updateConditionAfterMatchday(career, matchdayResults, report),
      season: {
        ...season,
        results: [...season.results, ...matchdayResults],
        currentMatchday: season.currentMatchday + 1,
      },
    },
  };
};
