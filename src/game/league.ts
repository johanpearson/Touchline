import type { Club } from "./club";
import type { Player } from "./player";

/** A league. Plain JSON-serialisable data: flat arrays, clubs reference players by id. */
export type League = {
  id: string;
  name: string;
  clubs: Club[];
  players: Player[];
};
