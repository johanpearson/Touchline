import { createRng } from "../engine";
import type { Career } from "./career";
import { type AttributeChange, developPlayer } from "./develop-player";
import type { Player } from "./player";

export type Development = {
  /** The whole league's players after the year, in the same order. */
  players: Player[];
  /** Every changed attribute of every player, in player and attribute order. */
  changes: AttributeChange[];
};

/**
 * Ages every player of the league by one year and develops the attributes by age, potential and
 * the season's minutes (`career.minutes`). Pure and deterministic: every player draws from his own
 * stream of `createRng(seed).fork("development-<season>")`, so the order of players does not matter.
 * The career is not changed; `finishSeason` applies the result.
 */
export const developPlayers = (career: Career): Development => {
  const season = createRng(career.seed).fork(`development-${career.season.number}`);
  const developed = career.league.players.map((player) =>
    developPlayer(player, career.minutes[player.id] ?? 0, season.fork(player.id)),
  );
  return {
    players: developed.map((d) => d.player),
    changes: developed.flatMap((d) => d.changes),
  };
};
