import type { MatchEvent } from "./match-event";
import type { PitchPosition, Side } from "./match-state";
import { progressOf } from "./pitch";

/** A value for each team. */
export type PerSide<T> = Record<Side, T>;

/** Statistics derived from the event log up to one moment of the match. */
export type MatchStats = {
  /** Share of the ball-in-play time each team held the ball; sums to 1 (0.5 each before any time passed). */
  possession: PerSide<number>;
  /** Share of the time the ball spent in each team's attacking half; sums to 1 (0.5 each when neither). */
  fieldTilt: PerSide<number>;
  shots: PerSide<number>;
  shotsOnTarget: PerSide<number>;
  /** Expected goals, summed over shots. */
  xg: PerSide<number>;
  corners: PerSide<number>;
};

const zero = (): PerSide<number> => ({ home: 0, away: 0 });

const shareOf = (seconds: PerSide<number>): PerSide<number> => {
  const total = seconds.home + seconds.away;
  if (total === 0) return { home: 0.5, away: 0.5 };
  return { home: seconds.home / total, away: seconds.away / total };
};

/** The side whose attacking half contains the position, if any (the halfway line belongs to neither). */
const attackingHalfOf = (position: PitchPosition): Side | undefined => {
  if (progressOf("home", position.x) > 0.5) return "home";
  if (progressOf("away", position.x) > 0.5) return "away";
  return undefined;
};

/** Time on the ball only runs while play is on; half-time and full time stop the clock. */
const isStoppage = (event: MatchEvent): boolean =>
  event.type === "periodChange" && (event.period === "halfTime" || event.period === "fullTime");

type Accumulator = { possession: PerSide<number>; tilt: PerSide<number> };

/** Adds the time the ball stayed as the last event left it, from that event until `until`. */
const accumulateTime = (acc: Accumulator, event: MatchEvent, until: number): void => {
  if (isStoppage(event)) return;
  const seconds = Math.max(0, until - event.time);
  acc.possession[event.team] += seconds;
  const attacking = attackingHalfOf(event.position);
  if (attacking) acc.tilt[attacking] += seconds;
};

const countEvents = (events: readonly MatchEvent[]) => {
  const shots = zero();
  const shotsOnTarget = zero();
  const xg = zero();
  const corners = zero();
  for (const event of events) {
    if (event.type === "shot") {
      shots[event.team] += 1;
      xg[event.team] += event.xg;
      if (event.outcome === "goal" || event.outcome === "saved") shotsOnTarget[event.team] += 1;
    } else if (event.type === "corner") {
      corners[event.team] += 1;
    }
  }
  return { shots, shotsOnTarget, xg, corners };
};

/**
 * Computes match statistics from the event log, counting only what happened up to `upTo` seconds.
 * The ball stays where, and with whom, the latest event left it. Pure: nothing outside `events` is read.
 */
export const computeMatchStats = (events: readonly MatchEvent[], upTo: number): MatchStats => {
  const seen = events.filter((event) => event.time <= upTo);
  const acc: Accumulator = { possession: zero(), tilt: zero() };
  seen.forEach((event, index) => {
    const next = seen[index + 1];
    accumulateTime(acc, event, next ? next.time : upTo);
  });
  return {
    possession: shareOf(acc.possession),
    fieldTilt: shareOf(acc.tilt),
    ...countEvents(seen),
  };
};
