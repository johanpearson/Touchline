import type { EngineVersion } from "../engine";
import type { Result } from "./compute-table";
import type { Fixture } from "./generate-fixtures";
import type { League } from "./league";
import type { PlayerCondition } from "./player-condition";
import type { SeasonSummary } from "./season-summary";
import type { SquadPlan } from "./squad-plan";

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
  /** Summaries of the finished seasons, oldest first. */
  history: SeasonSummary[];
  /** The user's formation, starters, bench and tactics (schema v3). */
  squadPlan: SquadPlan;
  /** Fitness and form of every player in the league, by player id (schema v3). */
  condition: Record<string, PlayerCondition>;
  /** The engine used for new matches: 1 is the zone engine, 2 the action engine (schema v4). */
  engineVersion: EngineVersion;
};

export type CareerError = "unknown-club";

export type CareerResult = { ok: true; career: Career } | { ok: false; error: CareerError };

export type MatchdayError =
  | "season-complete"
  | "matchday-already-completed"
  | "wrong-matchday"
  | "wrong-fixture"
  | "wrong-engine-version";

export type MatchdayResult = { ok: true; career: Career } | { ok: false; error: MatchdayError };
