import type { AttributeName, Player } from "./player";
import type { PlayerPosition } from "./squad-player";

/** The fixed shape until the squad and tactics milestone: 4-4-2. */
export const SHAPE: Record<PlayerPosition, number> = { GK: 1, DEF: 4, MID: 4, FWD: 2 };

/** The attributes that decide how good a player is in his or her position. */
const KEY_ATTRIBUTES: Record<PlayerPosition, readonly AttributeName[]> = {
  GK: ["handling", "reflexes"],
  DEF: ["tackling", "positioning", "strength"],
  MID: ["passing", "vision", "ballControl", "workRate"],
  FWD: ["finishing", "pace", "dribbling"],
};

const POSITIONS: readonly PlayerPosition[] = ["GK", "DEF", "MID", "FWD"];

const positionScore = (player: Player): number => {
  const keys = KEY_ATTRIBUTES[player.position];
  return keys.reduce((sum, key) => sum + player[key], 0) / keys.length;
};

const byScoreThenId = (a: Player, b: Player): number =>
  positionScore(b) - positionScore(a) || (a.id < b.id ? -1 : 1);

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
