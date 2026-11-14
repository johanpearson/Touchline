import type { TeamTactics } from "./tactics";
import type { TeamMatchProfile } from "./team-match-profile";

/** Everything needed, together with a seed, to reproduce a match. */
export type MatchInput = {
  home: TeamMatchProfile;
  away: TeamMatchProfile;
  homeTactics: TeamTactics;
  awayTactics: TeamTactics;
};
