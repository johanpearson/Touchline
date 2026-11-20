import { FORMATION_SHAPE, type Formation } from "./formation";
import { positionPenalty } from "./position-rating";
import type { PlayerPosition } from "./squad-player";

type OutfieldPosition = Exclude<PlayerPosition, "GK">;

const OUTFIELD_LINES: readonly OutfieldPosition[] = ["DEF", "MID", "FWD"];
/** Far smaller than any rating penalty; only breaks ties in favour of staying where a player is. */
const MOVE_TIE_BREAK = 0.001;

type Candidate = { id: string; natural: PlayerPosition; current: PlayerPosition };

const costOf = (player: Candidate, line: OutfieldPosition): number =>
  positionPenalty(player.natural, line) + (player.current === line ? 0 : MOVE_TIE_BREAK);

/** Every way to split `players` into a group of `size` and the rest, in index order. */
const splits = function* <T>(players: readonly T[], size: number): Generator<[T[], T[]]> {
  if (size === 0) return yield [[], [...players]];
  if (players.length < size) return;
  const [first, ...rest] = players as [T, ...T[]];
  for (const [taken, left] of splits(rest, size - 1)) yield [[first, ...taken], left];
  for (const [taken, left] of splits(rest, size)) yield [taken, [first, ...left]];
};

type Assignment = { cost: number; lines: Map<string, OutfieldPosition> };

/** The cheapest way to give each of `players` one of the `lines` with the `needed` counts. */
const bestAssignment = (
  players: readonly Candidate[],
  lines: readonly OutfieldPosition[],
  needed: Record<OutfieldPosition, number>,
): Assignment => {
  const [line, ...later] = lines as [OutfieldPosition, ...OutfieldPosition[]];
  let best: Assignment | undefined;
  for (const [taken, left] of splits(players, needed[line])) {
    const rest = later.length > 0 ? bestAssignment(left, later, needed) : undefined;
    const cost = taken.reduce((sum, p) => sum + costOf(p, line), 0) + (rest?.cost ?? 0);
    if (best && cost >= best.cost) continue;
    const assigned = new Map(rest?.lines);
    for (const { id } of taken) assigned.set(id, line);
    best = { cost, lines: assigned };
  }
  return best as Assignment;
};

/**
 * Places the eleven in the lines of `formation`: the goalkeeper stays in goal and the ten others go to
 * the lines where the sum of rating lost to playing out of position is smallest (`positionPenalty`
 * against the `natural` position); a tie is settled in favour of the position a player `current`ly
 * plays, then by the order of `starters`. Returns the position of every starter, or undefined when the
 * eleven do not have exactly one goalkeeper. Pure and deterministic.
 */
export const placeEleven = (
  starters: readonly string[],
  formation: Formation,
  current: (id: string) => PlayerPosition,
  natural: (id: string) => PlayerPosition,
): Record<string, PlayerPosition> | undefined => {
  const keepers = starters.filter((id) => current(id) === "GK");
  if (keepers.length !== 1) return undefined;
  const outfield = starters
    .filter((id) => current(id) !== "GK")
    .map((id) => ({ id, natural: natural(id), current: current(id) }));
  const { lines } = bestAssignment(outfield, OUTFIELD_LINES, FORMATION_SHAPE[formation]);
  return Object.fromEntries(starters.map((id) => [id, lines.get(id) ?? "GK"]));
};
