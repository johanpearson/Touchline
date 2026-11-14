import type { MatchInputV2 } from "./action/match-input-v2";
import type { TeamTactics } from "./tactics";
import type { TeamMatchProfile } from "./team-match-profile";

/** Everything needed, together with a seed, to reproduce a zone-engine (v1) match. */
export type MatchInputV1 = {
  /** Absent or 1 means the zone engine. */
  engineVersion?: 1;
  home: TeamMatchProfile;
  away: TeamMatchProfile;
  homeTactics: TeamTactics;
  awayTactics: TeamTactics;
};

/** Input for either engine, told apart by `engineVersion`. */
export type MatchInput = MatchInputV1 | MatchInputV2;

export const isMatchInputV2 = (input: MatchInput): input is MatchInputV2 =>
  input.engineVersion === 2;
