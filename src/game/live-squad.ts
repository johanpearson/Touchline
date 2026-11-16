import type { Lineup } from "./lineup";
import { FITNESS_MATCH_MINUTES } from "./player-condition";
import type { PlayerPosition } from "./squad-player";

/** A substitution made at a match minute; `halfTime` marks the half-time window. */
export type SubstitutionRecord = {
  minute: number;
  halfTime: boolean;
  off: string;
  on: string;
};

/** Who is on the pitch and on the bench after a list of substitutions, and how long everyone played. */
export type LiveSquad = {
  /** The eleven on the pitch; a substitute stands in the place of the player he replaced. */
  starters: string[];
  /** Bench players still available; a player substituted off never returns. */
  bench: string[];
  /** The position played by every substitute (the position of the player replaced). */
  played: Record<string, PlayerPosition>;
  /** Minute each substitute came on and each substituted-off player left. */
  cameOn: Record<string, number>;
  wentOff: Record<string, number>;
};

const replace = (ids: readonly string[], from: string, to: string): string[] =>
  ids.map((id) => (id === from ? to : id));

/**
 * Replays `substitutions` (in order) on the saved squad plan. `naturalPosition` gives the own position of
 * a player, used for starters that never changed place.
 */
export const liveSquadAfter = (
  plan: Lineup,
  substitutions: readonly SubstitutionRecord[],
  naturalPosition: (id: string) => PlayerPosition,
): LiveSquad => {
  const squad: LiveSquad = {
    starters: [...plan.starters],
    bench: [...plan.bench],
    played: {},
    cameOn: {},
    wentOff: {},
  };
  for (const { off, on, minute } of substitutions) {
    squad.played[on] = squad.played[off] ?? naturalPosition(off);
    squad.starters = replace(squad.starters, off, on);
    squad.bench = squad.bench.filter((id) => id !== on);
    squad.cameOn[on] = minute;
    squad.wentOff[off] = minute;
  }
  return squad;
};

const clampMinute = (minute: number): number =>
  Math.min(FITNESS_MATCH_MINUTES, Math.max(0, minute));

/** The minutes `id` spent on the pitch: from kickoff or coming on to the end or going off (0 for an unused player). */
export const minutesOnPitch = (id: string, plan: Lineup, squad: LiveSquad): number => {
  const start = plan.starters.includes(id) ? 0 : squad.cameOn[id];
  if (start === undefined) return 0;
  return clampMinute(squad.wentOff[id] ?? FITNESS_MATCH_MINUTES) - clampMinute(start);
};
