import { MAX_ATTRIBUTE, MIN_ATTRIBUTE, type Player } from "./player";
import type { SquadPlayer } from "./squad-player";

/** Maps a player to the commentary's `SquadPlayer`, rescaling finishing from 1..20 to 0..1. */
export const toSquadPlayer = (player: Player): SquadPlayer => ({
  name: player.name,
  position: player.position,
  finishing: (player.finishing - MIN_ATTRIBUTE) / (MAX_ATTRIBUTE - MIN_ATTRIBUTE),
});
