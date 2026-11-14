import type { TeamTactics } from "../tactics";
import type { EnginePlayer } from "./engine-player";

/** Outfield players per line; the goalkeeper is implied. The engine does not know formation names. */
export type FormationCounts = {
  defenders: number;
  midfielders: number;
  forwards: number;
};

export const STARTER_COUNT = 11;

/**
 * One side of a v2 match. `starters` are 11 players in slot order: the goalkeeper first, then
 * the defenders, midfielders and forwards, each line in lane order from left to right.
 */
export type TeamSheet = {
  name: string;
  formation: FormationCounts;
  starters: readonly EnginePlayer[];
  bench: readonly EnginePlayer[];
  tactics: TeamTactics;
};
