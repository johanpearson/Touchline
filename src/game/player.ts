import type { PlayerPosition } from "./squad-player";

/** The twelve attributes of a player, integers 1 to 20. Goalkeepers use handling and reflexes. */
export const ATTRIBUTE_NAMES = [
  "passing",
  "ballControl",
  "dribbling",
  "pace",
  "vision",
  "finishing",
  "workRate",
  "tackling",
  "positioning",
  "strength",
  "handling",
  "reflexes",
] as const;

export type AttributeName = (typeof ATTRIBUTE_NAMES)[number];

export type PlayerAttributes = Record<AttributeName, number>;

export const MIN_ATTRIBUTE = 1;
export const MAX_ATTRIBUTE = 20;

/** A player. Plain JSON-serialisable data; clubs reference players by `id`. */
export type Player = PlayerAttributes & {
  id: string;
  name: string;
  age: number;
  position: PlayerPosition;
};
