import type { Career } from "./career";
import type { PlayerPosition } from "./squad-player";

export const MIN_SQUAD_SIZE = 18;
export const MAX_SQUAD_SIZE = 30;
export const MIN_PER_POSITION: Readonly<Record<PlayerPosition, number>> = {
  GK: 2,
  DEF: 5,
  MID: 5,
  FWD: 3,
};

/** What a club's squad lacks or has too much of; `ok` when it is within the limits. */
export type SquadLimits = {
  /** Players missing to reach 18. */
  missingTotal: number;
  /** Players above 30. */
  excessTotal: number;
  /** Players missing per position to reach the minimum (only positions that lack some). */
  missing: Partial<Record<PlayerPosition, number>>;
  count: number;
  ok: boolean;
};

/** Checks a club's squad against the size limits (18 to 30) and the positional minimums. Unknown clubs have an empty squad. */
export const squadLimits = (career: Career, clubId: string): SquadLimits => {
  const club = career.league.clubs.find((c) => c.id === clubId);
  const ids = new Set(club?.playerIds ?? []);
  const squad = career.league.players.filter((p) => ids.has(p.id));
  const missing: Partial<Record<PlayerPosition, number>> = {};
  for (const position of Object.keys(MIN_PER_POSITION) as PlayerPosition[]) {
    const have = squad.filter((p) => p.position === position).length;
    if (have < MIN_PER_POSITION[position]) missing[position] = MIN_PER_POSITION[position] - have;
  }
  const missingTotal = Math.max(0, MIN_SQUAD_SIZE - squad.length);
  const excessTotal = Math.max(0, squad.length - MAX_SQUAD_SIZE);
  return {
    missingTotal,
    excessTotal,
    missing,
    count: squad.length,
    ok: missingTotal === 0 && excessTotal === 0 && Object.keys(missing).length === 0,
  };
};
