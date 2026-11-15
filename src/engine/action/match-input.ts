import type { TeamSheet } from "./team-sheet";

/** Everything needed, together with a seed, to reproduce an action-engine match. */
export type MatchInput = {
  engineVersion: 2;
  home: TeamSheet;
  away: TeamSheet;
};
