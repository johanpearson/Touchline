import type { Club } from "./club";
import type { Player } from "./player";
import { playerOverall } from "./player-overall";

/** Higher overall first; equal overalls go to the lower id so the order is deterministic. */
const byOverallThenId = (a: Player, b: Player): number =>
  playerOverall(b) - playerOverall(a) || a.id.localeCompare(b.id);

/** The club's best player by overall; ties go to the lower id so the pick is deterministic. */
export const clubStarPlayer = (club: Club, players: readonly Player[]): Player | undefined =>
  players.filter((p) => club.playerIds.includes(p.id)).sort(byOverallThenId)[0];
