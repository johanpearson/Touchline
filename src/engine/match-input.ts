import type { TeamMatchProfile } from "./team-match-profile";

/** Tactics placeholder. Concrete options (pressing height, tempo, ...) come with the tactics issues. */
export type TeamTactics = Record<string, never>;

/** Everything needed, together with a seed, to reproduce a match. */
export type MatchInput = {
  home: TeamMatchProfile;
  away: TeamMatchProfile;
  homeTactics: TeamTactics;
  awayTactics: TeamTactics;
};
