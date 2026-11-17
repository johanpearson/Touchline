import type { ActionEvent, Side } from "../engine";
import type { Career } from "./career";
import { type CoachedMatch, createCoachedMatch } from "./coached-match";
import type { Result } from "./compute-table";
import type { Fixture } from "./generate-fixtures";
import { goalScorersOf } from "./goal-scorers";
import type { MatchReport } from "./update-condition";

/** Far beyond any match length: `advanceTo` stops at half-time and at full time by itself. */
const UNTIL_PERIOD_END = 1_000_000;

type Playable = Pick<CoachedMatch, "advanceTo" | "resume" | "state" | "aiReports"> & {
  events: readonly ActionEvent[];
};

/** A played fixture: the result and the minutes of every AI club that played in it, by club id. */
export type PlayedFixture = { result: Result; aiReports: Record<string, MatchReport> };

const playOut = (match: Playable) => {
  match.advanceTo(UNTIL_PERIOD_END);
  match.resume();
  match.advanceTo(UNTIL_PERIOD_END);
  return { score: match.state.score, scorers: goalScorersOf(match.events) };
};

const reportsByClub = (
  fixture: Fixture,
  reports: Partial<Record<Side, MatchReport>>,
): Record<string, MatchReport> => {
  const byClub: Record<string, MatchReport> = {};
  if (reports.home) byClub[fixture.homeClubId] = reports.home;
  if (reports.away) byClub[fixture.awayClubId] = reports.away;
  return byClub;
};

/**
 * Plays a full match with the AI clubs coached (see `createCoachedMatch`) and records who scored each
 * goal and what the AI clubs' players played. The same career and fixture always give the same result.
 */
export const playFixture = (career: Career, fixture: Fixture): PlayedFixture => {
  // The quick sim is never viewed, so it uses the fast path without position snapshots.
  const match = createCoachedMatch(career, fixture, { detail: "fast" });
  const { score, scorers } = playOut(match);
  return {
    result: {
      fixtureId: fixture.id,
      homeClubId: fixture.homeClubId,
      awayClubId: fixture.awayClubId,
      homeGoals: score.home,
      awayGoals: score.away,
      engineVersion: career.engineVersion,
      scorers,
    },
    aiReports: reportsByClub(fixture, match.aiReports()),
  };
};

/**
 * Plays a full match and records who scored each goal. The same career and fixture always give the same result, stamped with the
 * engine version it was played on.
 */
export const simulateFixture = (career: Career, fixture: Fixture): Result =>
  playFixture(career, fixture).result;
