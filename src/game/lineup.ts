import type { Formation } from "./formation";
import { FORMATION_SHAPE } from "./formation";
import type { Player } from "./player";
import type { PlayerPosition } from "./squad-player";

/** A matchday squad as player ids: the starting eleven and the bench. */
export type Lineup = {
  formation: Formation;
  starters: string[];
  bench: string[];
};

export const BENCH_SIZE = 7;

export type LineupError =
  | "wrong-formation-shape"
  | "wrong-bench-size"
  | "bench-without-keeper"
  | "duplicate-player"
  | "unknown-player";

export type LineupResult = { ok: true } | { ok: false; error: LineupError };

const POSITIONS: readonly PlayerPosition[] = ["GK", "DEF", "MID", "FWD"];

const fail = (error: LineupError): LineupResult => ({ ok: false, error });

const hasShape = (lineup: Lineup, byId: ReadonlyMap<string, Player>): boolean => {
  const shape = FORMATION_SHAPE[lineup.formation];
  if (lineup.starters.length !== 11) return false;
  return POSITIONS.every(
    (position) =>
      lineup.starters.filter((id) => byId.get(id)?.position === position).length ===
      shape[position],
  );
};

/** Checks a lineup against the club's squad. Expected failures are returned, never thrown. */
export const validateLineup = (lineup: Lineup, squad: readonly Player[]): LineupResult => {
  const byId = new Map(squad.map((p) => [p.id, p]));
  const ids = [...lineup.starters, ...lineup.bench];
  if (ids.some((id) => !byId.has(id))) return fail("unknown-player");
  if (new Set(ids).size !== ids.length) return fail("duplicate-player");
  if (lineup.bench.length !== BENCH_SIZE) return fail("wrong-bench-size");
  if (!hasShape(lineup, byId)) return fail("wrong-formation-shape");
  if (!lineup.bench.some((id) => byId.get(id)?.position === "GK")) {
    return fail("bench-without-keeper");
  }
  return { ok: true };
};
