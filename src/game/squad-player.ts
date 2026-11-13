export type PlayerPosition = "GK" | "DEF" | "MID" | "FWD";

/** The part of a player that decides who scores. The full player model comes with the squad issues. */
export type SquadPlayer = {
  name: string;
  position: PlayerPosition;
  /** Finishing rating, 0..1. */
  finishing: number;
};
