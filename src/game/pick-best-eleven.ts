import type { Player } from "./player";
import { playerOverall } from "./player-overall";
import type { PlayerPosition } from "./squad-player";

/** The fixed shape until the squad and tactics milestone: 4-4-2. */
export const SHAPE: Record<PlayerPosition, number> = { GK: 1, DEF: 4, MID: 4, FWD: 2 };

const POSITIONS: readonly PlayerPosition[] = ["GK", "DEF", "MID", "FWD"];

const byScoreThenId = (a: Player, b: Player): number =>
  playerOverall(b) - playerOverall(a) || (a.id < b.id ? -1 : 1);

/**
 * Picks the best eleven in a 4-4-2 (1 GK, 4 DEF, 4 MID, 2 FWD), ordered GK, DEF, MID, FWD.
 * Best means highest mean of the position's key attributes; ties are broken by id.
 * Throws a RangeError (programmer error) if the squad cannot fill the shape.
 */
export const pickBestEleven = (players: readonly Player[]): Player[] =>
  POSITIONS.flatMap((position) => {
    const candidates = players.filter((p) => p.position === position).sort(byScoreThenId);
    const needed = SHAPE[position];
    if (candidates.length < needed) {
      throw new RangeError(
        `Squad needs at least ${needed} ${position} but has ${candidates.length}`,
      );
    }
    return candidates.slice(0, needed);
  });
