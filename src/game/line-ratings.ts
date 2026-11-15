import type { Club } from "./club";
import { type Lineup, validateLineup } from "./lineup";
import { pickBestEleven } from "./pick-best-eleven";
import { MAX_ATTRIBUTE, MIN_ATTRIBUTE, type Player } from "./player";
import { effectiveAttributes, initialCondition, type PlayerCondition } from "./player-condition";
import { overallIn } from "./player-overall";
import type { PlayerPosition } from "./squad-player";

/** The four lines of a team plus the overall, in display order. */
export const LINE_RATINGS = ["goalkeeping", "defence", "midfield", "attack", "overall"] as const;

export type LineRating = (typeof LINE_RATINGS)[number];

/** Team ratings from 0 to 100, one per line and the mean of the eleven starters. */
export type LineRatings = Record<LineRating, number>;

const LINE_OF: Record<PlayerPosition, Exclude<LineRating, "overall">> = {
  GK: "goalkeeping",
  DEF: "defence",
  MID: "midfield",
  FWD: "attack",
};

/** Rescales an attribute-sized value from 1..20 to 0..100 (1 gives 0, 20 gives 100). */
const toPercent = (value: number): number =>
  ((value - MIN_ATTRIBUTE) / (MAX_ATTRIBUTE - MIN_ATTRIBUTE)) * 100;

const mean = (values: readonly number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;

/**
 * Team ratings of the given starters, each described by their overall (1..20, the mean of the key
 * attributes of their position, see `overallIn`). The action engine plays individual players, so a
 * line is simply the mean overall of the starters in it and the formation matters because it decides
 * how many players, and which, stand in each line. A line without players rates 0.
 */
export const lineRatings = (
  starters: readonly { position: PlayerPosition; overall: number }[],
): LineRatings => {
  const lineMean = (line: Exclude<LineRating, "overall">): number => {
    const overalls = starters.filter((s) => LINE_OF[s.position] === line).map((s) => s.overall);
    return overalls.length === 0 ? 0 : toPercent(mean(overalls));
  };
  return {
    goalkeeping: lineMean("goalkeeping"),
    defence: lineMean("defence"),
    midfield: lineMean("midfield"),
    attack: lineMean("attack"),
    overall: toPercent(mean(starters.map((s) => s.overall))),
  };
};

/**
 * The ratings of a lineup from its starters' effective attributes (stored attributes scaled by
 * fitness and form). A player without an entry in `condition` is fully fit with neutral form. An
 * invalid lineup is a programmer error and throws a `RangeError`; callers validate user input with
 * `validateLineup` first.
 */
export const deriveLineRatings = (
  players: readonly Player[],
  lineup: Lineup,
  condition: Readonly<Record<string, PlayerCondition>>,
): LineRatings => {
  const checked = validateLineup(lineup, players);
  if (!checked.ok) throw new RangeError(`Invalid lineup: ${checked.error}`);
  const byId = new Map(players.map((p) => [p.id, p]));
  return lineRatings(
    lineup.starters.map((id) => {
      const player = byId.get(id) as Player;
      const attributes = effectiveAttributes(player, condition[id] ?? initialCondition());
      return { position: player.position, overall: overallIn(player.position, attributes) };
    }),
  );
};

/** The ratings of a club's best eleven (4-4-2) at full condition. */
export const deriveClubLineRatings = (club: Club, players: readonly Player[]): LineRatings =>
  lineRatings(
    pickBestEleven(players.filter((p) => club.playerIds.includes(p.id))).map((p) => ({
      position: p.position,
      overall: overallIn(p.position, p),
    })),
  );
