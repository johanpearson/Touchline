import { createActionMatch, createMatch, type EngineVersion } from "../engine";
import type { Career } from "./career";
import type { Result } from "./compute-table";
import type { Fixture } from "./generate-fixtures";
import { matchInputV1For, matchInputV2For, matchSeed } from "./match-input-for";

/** Far beyond any match length: `advanceTo` stops at half-time and at full time by itself. */
const UNTIL_PERIOD_END = 1_000_000;

type Playable = {
  advanceTo: (seconds: number) => void;
  resume: () => void;
  state: { score: { home: number; away: number } };
};

const playOut = (match: Playable): { home: number; away: number } => {
  match.advanceTo(UNTIL_PERIOD_END);
  match.resume();
  match.advanceTo(UNTIL_PERIOD_END);
  return match.state.score;
};

const scoreOf = (career: Career, fixture: Fixture): { home: number; away: number } => {
  const seed = matchSeed(career, fixture);
  // The quick sim is never viewed, so v2 uses the fast path without position snapshots.
  return career.engineVersion === 2
    ? playOut(createActionMatch(matchInputV2For(career, fixture), seed, { detail: "fast" }))
    : playOut(createMatch(matchInputV1For(career, fixture), seed));
};

/**
 * Plays a full match with the career's engine. The same career and fixture always give the same
 * result, stamped with the engine version it was played on.
 */
export const simulateFixture = (career: Career, fixture: Fixture): Result => {
  const { home, away } = scoreOf(career, fixture);
  const engineVersion: EngineVersion = career.engineVersion;
  return {
    fixtureId: fixture.id,
    homeClubId: fixture.homeClubId,
    awayClubId: fixture.awayClubId,
    homeGoals: home,
    awayGoals: away,
    engineVersion,
  };
};
