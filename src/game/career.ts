import type { Result } from "./compute-table";
import type { Fixture } from "./generate-fixtures";
import type { League } from "./league";

/** One season of a career. Plain JSON-serialisable data. */
export type Season = {
  /** 1-based. */
  number: number;
  fixtures: Fixture[];
  /** Results of the completed matchdays, in matchday and fixture order. */
  results: Result[];
  /** The matchday to play next, 1-based. It is past the last matchday once the season is over. */
  currentMatchday: number;
};

/** A single-player career. Plain JSON-serialisable data; all randomness derives from `seed`. */
export type Career = {
  seed: number;
  userClubId: string;
  league: League;
  season: Season;
};

export type CareerError = "unknown-club";

export type CareerResult = { ok: true; career: Career } | { ok: false; error: CareerError };

export type MatchdayError =
  | "season-complete"
  | "matchday-already-completed"
  | "wrong-matchday"
  | "wrong-fixture";

export type MatchdayResult = { ok: true; career: Career } | { ok: false; error: MatchdayError };
