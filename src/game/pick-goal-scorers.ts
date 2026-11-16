import { createRng, type PerSide, type Side } from "../engine";
import type { PlayerPosition, SquadPlayer } from "./squad-player";

/** How likely each position is to score, relative to a forward. */
const POSITION_WEIGHT: Record<PlayerPosition, number> = {
  FWD: 1,
  MID: 0.4,
  DEF: 0.1,
  GK: 0.005,
};

const weightOf = (player: SquadPlayer): number =>
  POSITION_WEIGHT[player.position] * Math.max(0, player.finishing);

const pickWeighted = (players: readonly SquadPlayer[], roll: number): SquadPlayer => {
  const first = players[0];
  if (!first) throw new RangeError("Cannot attribute a goal to a team without players");
  const total = players.reduce((sum, p) => sum + weightOf(p), 0);
  if (total <= 0) return first;
  let threshold = roll * total;
  for (const player of players) {
    threshold -= weightOf(player);
    if (threshold < 0) return player;
  }
  return players[players.length - 1] ?? first;
};

/**
 * Names a scorer for every goal, given the side that scored each one in goal order. Results store
 * only goals, not who scored them, so the season's top scorers are drawn from the squads (weighted
 * by position and finishing). Pure and deterministic: it uses its own RNG stream (forked from
 * `seed`) with exactly one draw per goal, so earlier goals keep their scorer when later goals are
 * added.
 *
 * Only used by `summariseSeason` for results saved before schema v6, which carry no recorded
 * scorers (`Result.scorers`). Saves are kept for ever, so such results can still be loaded and
 * this function stays until old saves are no longer supported.
 */
export const pickGoalScorers = (
  scoringSides: readonly Side[],
  squads: PerSide<readonly SquadPlayer[]>,
  seed: number,
): string[] => {
  const rng = createRng(seed).fork("scorers");
  return scoringSides.map((side) => pickWeighted(squads[side], rng.next()).name);
};
