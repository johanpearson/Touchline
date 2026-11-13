import type { MatchEvent, PerSide } from "../engine";
import { createRng } from "../engine";
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
 * Names the scorer of every goal in the log, in goal order. Pure and deterministic: it uses its own
 * RNG stream (forked from `seed`) with exactly one draw per goal, so it never touches the match
 * engine's stream and earlier goals keep their scorer when later goals are added.
 */
export const attributeGoalScorers = (
  events: readonly MatchEvent[],
  squads: PerSide<readonly SquadPlayer[]>,
  seed: number,
): string[] => {
  const rng = createRng(seed).fork("scorers");
  return events.flatMap((event) =>
    event.type === "goal" ? [pickWeighted(squads[event.team], rng.next()).name] : [],
  );
};
