import { addMinutes } from "./add-minutes";
import type { Career, MatchdayError, MatchdayResult } from "./career";
import type { Result } from "./compute-table";
import type { Fixture } from "./generate-fixtures";
import { getNextFixture } from "./get-next-fixture";
import { type PlayedFixture, playFixture } from "./simulate-fixture";
import { type AiReports, type MatchReport, updateConditionAfterMatchday } from "./update-condition";

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
  if (userResult.engineVersion !== career.engineVersion) return "wrong-engine-version";
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
 * What every AI club played this round: the other fixtures as simulated, and the user's opponent from
 * the report of the match view or, without one, from replaying the user's fixture (the user made no
 * changes, so the quick sim plays the same match).
 */
const aiReportsOf = (
  career: Career,
  userFixture: Fixture,
  report: MatchReport | undefined,
  others: readonly PlayedFixture[],
): AiReports => {
  const reports: Record<string, MatchReport> = Object.assign({}, ...others.map((p) => p.aiReports));
  if (report?.opponent) {
    const opponent =
      userFixture.homeClubId === career.userClubId
        ? userFixture.awayClubId
        : userFixture.homeClubId;
    reports[opponent] = report.opponent;
    return reports;
  }
  return { ...reports, ...playFixture(career, userFixture).aiReports };
};

/**
 * Completes the current matchday: takes the user's result (from the match view or `simulateFixture`),
 * simulates every other fixture of the round and returns a new career on the next matchday.
 * The input career is not changed. Results are appended in fixture order, so the other matches
 * do not depend on how the user's match was produced. Fitness, form and season minutes of every player are updated;
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

  const round = season.fixtures.filter((f) => f.matchday === season.currentMatchday);
  const played = round.map((f) => (f.id === userFixture.id ? undefined : playFixture(career, f)));
  const matchdayResults = round.map((_, i) => played[i]?.result ?? userResult);
  const aiReports = aiReportsOf(
    career,
    userFixture,
    report,
    played.flatMap((p) => (p ? [p] : [])),
  );

  return {
    ok: true,
    career: {
      ...career,
      condition: updateConditionAfterMatchday(career, matchdayResults, report, aiReports),
      minutes: addMinutes(career, report, aiReports),
      season: {
        ...season,
        results: [...season.results, ...matchdayResults],
        currentMatchday: season.currentMatchday + 1,
      },
    },
  };
};
