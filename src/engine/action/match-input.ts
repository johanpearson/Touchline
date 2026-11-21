import type { TeamSheet } from "./team-sheet";

/** Everything needed, together with a seed, to reproduce an action-engine match. */
export type MatchInput = {
  /** 2 is the action engine, 3 the phase-step engine (`createMatch` dispatches on it). */
  engineVersion: 2 | 3;
  home: TeamSheet;
  away: TeamSheet;
};
