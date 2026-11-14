import { NEUTRAL_TACTICS, type TeamTactics } from "../engine";
import { autoPickLineup } from "./auto-pick-lineup";
import type { Lineup } from "./lineup";
import type { Player } from "./player";
import { initialCondition, type PlayerCondition } from "./player-condition";

/** The user's choices for their club: formation, starters, bench and tactics. Plain JSON. */
export type SquadPlan = Lineup & { tactics: TeamTactics };

/** The plan a career starts with: auto-picked 4-4-2 and neutral tactics. */
export const initialSquadPlan = (squad: readonly Player[]): SquadPlan => ({
  ...autoPickLineup(squad, "4-4-2"),
  tactics: NEUTRAL_TACTICS,
});

/** Full fitness and neutral form for every player. */
export const initialConditions = (players: readonly Player[]): Record<string, PlayerCondition> =>
  Object.fromEntries(players.map((p) => [p.id, initialCondition()]));

/** The players of one club, in the club's squad order. Unknown club ids give an empty list. */
export const clubSquad = (
  club: { playerIds: readonly string[] },
  players: readonly Player[],
): Player[] => {
  const ids = new Set(club.playerIds);
  return players.filter((p) => ids.has(p.id));
};
