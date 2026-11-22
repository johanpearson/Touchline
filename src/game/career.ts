import type { Result } from "./compute-table";
import type { ClubFinance, Contract } from "./contract";
import type { AttributeChange } from "./develop-player";
import type { Fixture } from "./generate-fixtures";
import type { League } from "./league";
import type { PlayerCondition } from "./player-condition";
import type { RolloverRecord } from "./rollover-record";
import type { SeasonSummary } from "./season-summary";
import type { SquadPlan } from "./squad-plan";
import type { TransferOffer, TransferWindow } from "./transfer-offer";

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
  /** The engine used for new matches. Always 3, the phase-step engine (schema v8; schema v5 moved careers to the action engine). */
  engineVersion: 3;
  /** Every player's contract, by player id (schema v7). Free agents may have none. */
  contracts: Record<string, Contract>;
  /** Every club's money, by club id (schema v7). */
  finances: Record<string, ClubFinance>;
  /** Players without a club (schema v7). Empty at creation. */
  freeAgentIds: string[];
  /** Minutes played this season, by player id (schema v7). Zero at creation. */
  minutes: Record<string, number>;
  /** Whether transfers between clubs are allowed. `"closed"` at creation; an older v7 save without it reads as closed. */
  window: TransferWindow;
  /** Offers from AI clubs for the user's players, valid while the window is open. Empty at creation. */
  offers: TransferOffer[];
  /** The attribute changes of the last yearly development, for the squad screen. Optional and absent until a rollover has developed the players (still schema v7). */
  lastDevelopment?: AttributeChange[];
  /** What the user's club went through at the last rollover, for the off-season review. Optional (still schema v7). */
  lastRollover?: RolloverRecord;
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
