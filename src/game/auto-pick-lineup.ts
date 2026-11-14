import { FORMATION_SHAPE, type Formation } from "./formation";
import { BENCH_SIZE, type Lineup } from "./lineup";
import type { Player } from "./player";
import { effectiveAttributes, initialCondition, type PlayerCondition } from "./player-condition";
import { playerOverall } from "./player-overall";
import type { PlayerPosition } from "./squad-player";

const POSITIONS: readonly PlayerPosition[] = ["GK", "DEF", "MID", "FWD"];
const OUTFIELD: readonly PlayerPosition[] = ["DEF", "MID", "FWD"];

type Ranked = { player: Player; strength: number };

const strengthOf = (player: Player, condition?: Readonly<Record<string, PlayerCondition>>) =>
  condition
    ? playerOverall({
        ...player,
        ...effectiveAttributes(player, condition[player.id] ?? initialCondition()),
      })
    : playerOverall(player);

const byStrengthThenId = (a: Ranked, b: Ranked): number =>
  b.strength - a.strength || (a.player.id < b.player.id ? -1 : 1);

const takeBest = (pool: Ranked[], count: number, position?: PlayerPosition): Ranked[] => {
  const taken = pool.filter((r) => position === undefined || r.player.position === position);
  return taken.slice(0, count);
};

const removeFrom = (pool: Ranked[], taken: readonly Ranked[]): Ranked[] =>
  pool.filter((r) => !taken.includes(r));

const pickStarters = (pool: Ranked[], formation: Formation): Ranked[] =>
  POSITIONS.flatMap((position) => {
    const needed = FORMATION_SHAPE[formation][position];
    const picked = takeBest(pool, needed, position);
    if (picked.length < needed) {
      throw new RangeError(`Squad needs at least ${needed} ${position} but has ${picked.length}`);
    }
    return picked;
  });

const pickBench = (pool: Ranked[]): Ranked[] => {
  let rest = pool;
  const bench: Ranked[] = [];
  for (const position of ["GK", ...OUTFIELD] as const) {
    const best = takeBest(rest, 1, position);
    bench.push(...best);
    rest = removeFrom(rest, best);
  }
  const fill = takeBest(rest, BENCH_SIZE - bench.length);
  return [...bench, ...fill].sort(byStrengthThenId).sort(benchOrder);
};

/** Keepers first, then outfield by strength: a stable, readable bench order. */
const benchOrder = (a: Ranked, b: Ranked): number =>
  Number(b.player.position === "GK") - Number(a.player.position === "GK");

/**
 * Picks starters and bench for a formation by effective strength (stored attributes scaled by
 * condition; without a condition map the stored attributes are used). Ties are broken by id.
 * Starters are ordered GK, DEF, MID, FWD. Throws a RangeError (programmer error) if the squad
 * cannot fill the formation and a bench of seven including a goalkeeper.
 */
export const autoPickLineup = (
  players: readonly Player[],
  formation: Formation,
  condition?: Readonly<Record<string, PlayerCondition>>,
): Lineup => {
  const ranked = players
    .map((player) => ({ player, strength: strengthOf(player, condition) }))
    .sort(byStrengthThenId);
  const starters = pickStarters(ranked, formation);
  const rest = removeFrom(ranked, starters);
  const bench = pickBench(rest);
  if (bench.length < BENCH_SIZE || !bench.some((r) => r.player.position === "GK")) {
    throw new RangeError("Squad cannot fill a bench of seven including a goalkeeper");
  }
  return {
    formation,
    starters: starters.map((r) => r.player.id),
    bench: bench.map((r) => r.player.id),
  };
};
