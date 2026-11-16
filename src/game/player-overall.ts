import type { AttributeName, Player, PlayerAttributes } from "./player";
import type { PlayerPosition } from "./squad-player";

/** The attributes that decide how good a player is in his or her position. */
const KEY_ATTRIBUTES: Record<PlayerPosition, readonly AttributeName[]> = {
  GK: ["handling", "reflexes"],
  DEF: ["tackling", "positioning", "strength"],
  MID: ["passing", "vision", "ballControl", "workRate"],
  FWD: ["finishing", "pace", "dribbling"],
};

/** The overall, 1..20, of attributes in a position: the mean of that position's key attributes. */
export const overallIn = (position: PlayerPosition, attributes: PlayerAttributes): number => {
  const keys = KEY_ATTRIBUTES[position];
  return keys.reduce((sum, key) => sum + attributes[key], 0) / keys.length;
};

/** A player's overall, 1..20: the mean of the key attributes of his or her position. */
export const playerOverall = (player: Player): number => overallIn(player.position, player);
