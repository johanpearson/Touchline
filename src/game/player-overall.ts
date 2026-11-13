import type { AttributeName, Player } from "./player";
import type { PlayerPosition } from "./squad-player";

/** The attributes that decide how good a player is in his or her position. */
const KEY_ATTRIBUTES: Record<PlayerPosition, readonly AttributeName[]> = {
  GK: ["handling", "reflexes"],
  DEF: ["tackling", "positioning", "strength"],
  MID: ["passing", "vision", "ballControl", "workRate"],
  FWD: ["finishing", "pace", "dribbling"],
};

/** A player's overall, 1..20: the mean of the key attributes of his or her position. */
export const playerOverall = (player: Player): number => {
  const keys = KEY_ATTRIBUTES[player.position];
  return keys.reduce((sum, key) => sum + player[key], 0) / keys.length;
};
