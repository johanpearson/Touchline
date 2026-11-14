import type { Side } from "./match-state";
import type { TeamTactics } from "./tactics";
import type { TeamMatchProfile } from "./team-match-profile";

/**
 * A change to one side while the match is paused: new phase ratings (for example after a
 * substitution, computed by the caller) and/or new tactics. Omitted parts stay as they are.
 */
export type MatchChange = {
  side: Side;
  profile?: TeamMatchProfile;
  tactics?: TeamTactics;
};

/** A change together with the match time at which it was applied. */
export type TimedMatchChange = {
  time: number;
  change: MatchChange;
};
