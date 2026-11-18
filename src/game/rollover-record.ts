import type { PlayerPosition } from "./squad-player";

/** A player of the user's club who retired at the rollover, with the age he retired at. */
export type RetiredPlayer = { name: string; age: number; position: PlayerPosition };

/** The user's club at the last rollover: its retirements and the money of the season just played. */
export type RolloverRecord = {
  retired: RetiredPlayer[];
  /** Base income plus the prize of the season just played, in thousands. */
  income: number;
  /** The wage bill of the season just played, in thousands. */
  wages: number;
};
