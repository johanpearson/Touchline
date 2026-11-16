import type { Club } from "./club";
import type { Player } from "./player";
import { playerOverall } from "./player-overall";

/** The club's best player by overall; ties go to the lower id so the pick is deterministic. */
export const clubStarPlayer = (club: Club, players: readonly Player[]): Player | undefined => {
  const members = new Set(club.playerIds);
  let best: Player | undefined;
  for (const player of players) {
    if (!members.has(player.id)) continue;
    if (!best) best = player;
    else {
      const diff = playerOverall(player) - playerOverall(best);
      if (diff > 0 || (diff === 0 && player.id < best.id)) best = player;
    }
  }
  return best;
};
