import type { PlayerPosition } from "./squad-player";

/** Formations written as DEF-MID-FWD; the goalkeeper is implied. */
export type Formation = "4-4-2" | "4-3-3" | "4-5-1" | "3-5-2" | "5-3-2" | "3-4-3";

export const FORMATIONS: readonly Formation[] = [
  "4-4-2",
  "4-3-3",
  "4-5-1",
  "3-5-2",
  "5-3-2",
  "3-4-3",
];

/** Starters per position line for each formation (always 1 GK, 11 in total). */
export const FORMATION_SHAPE: Record<Formation, Record<PlayerPosition, number>> = {
  "4-4-2": { GK: 1, DEF: 4, MID: 4, FWD: 2 },
  "4-3-3": { GK: 1, DEF: 4, MID: 3, FWD: 3 },
  "4-5-1": { GK: 1, DEF: 4, MID: 5, FWD: 1 },
  "3-5-2": { GK: 1, DEF: 3, MID: 5, FWD: 2 },
  "5-3-2": { GK: 1, DEF: 5, MID: 3, FWD: 2 },
  "3-4-3": { GK: 1, DEF: 3, MID: 4, FWD: 3 },
};
