import type { Formation } from "./formation";
import type { Lineup } from "./lineup";
import { placeEleven } from "./place-eleven";
import { FITNESS_MATCH_MINUTES } from "./player-condition";
import type { PlayerPosition } from "./squad-player";

/** A substitution made at a match minute; `halfTime` marks the half-time window. */
export type SubstitutionRecord = {
  minute: number;
  halfTime: boolean;
  off: string;
  on: string;
};

/**
 * A formation change made at a match minute, after `substitutionsBefore` substitutions had been made
 * (so the order against substitutions at the same minute is kept).
 */
export type FormationRecord = {
  minute: number;
  formation: Formation;
  substitutionsBefore: number;
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
 * Replays `substitutions` (in order) on the saved squad plan, with the `formations` changes in between
 * (each `placeEleven`s the eleven then on the pitch in its lines). `naturalPosition` gives the own
 * position of a player, used for starters that never changed place.
 */
export const liveSquadAfter = (
  plan: Lineup,
  substitutions: readonly SubstitutionRecord[],
  naturalPosition: (id: string) => PlayerPosition,
  formations: readonly FormationRecord[] = [],
): LiveSquad => {
  const squad: LiveSquad = {
    starters: [...plan.starters],
    bench: [...plan.bench],
    played: {},
    cameOn: {},
    wentOff: {},
  };
  const place = (formation: Formation) => {
    const current = (id: string) => squad.played[id] ?? naturalPosition(id);
    Object.assign(squad.played, placeEleven(squad.starters, formation, current, naturalPosition));
  };
  const placeDue = (substitutionsDone: number) => {
    for (const record of formations) {
      if (record.substitutionsBefore === substitutionsDone) place(record.formation);
    }
  };
  substitutions.forEach(({ off, on, minute }, index) => {
    placeDue(index);
    squad.played[on] = squad.played[off] ?? naturalPosition(off);
    squad.starters = replace(squad.starters, off, on);
    squad.bench = squad.bench.filter((id) => id !== on);
    squad.cameOn[on] = minute;
    squad.wentOff[off] = minute;
  });
  placeDue(substitutions.length);
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
