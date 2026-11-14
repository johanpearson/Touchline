import type { Side } from "../match-state";
import type { PerSide } from "../match-stats";
import type { ActionEvent } from "./action-event";
import { leadsToShot } from "./mark-key-passes";
import { PITCH_LENGTH } from "./pitch-metres";

/** Team statistics derived from the action log up to one moment of the match. */
export type ActionTeamStats = {
  /** Share of the ball-in-play time each side held the ball; sums to 1 (0.5 each before any time passed). */
  possession: PerSide<number>;
  /** Share of the time the ball spent in each side's attacking half; sums to 1 (0.5 each when neither). */
  fieldTilt: PerSide<number>;
  shots: PerSide<number>;
  shotsOnTarget: PerSide<number>;
  /** Expected goals, summed over shots. */
  xg: PerSide<number>;
  corners: PerSide<number>;
  /** Fouls committed by each side. */
  fouls: PerSide<number>;
  throwIns: PerSide<number>;
  goalKicks: PerSide<number>;
  passes: PerSide<number>;
  completedPasses: PerSide<number>;
  /** Completed share of passes, 0 when a side has no pass. */
  passCompletion: PerSide<number>;
};

/** One player's statistics. */
export type ActionPlayerLine = {
  passes: number;
  completedPasses: number;
  passCompletion: number;
  keyPasses: number;
  shots: number;
  shotsOnTarget: number;
  xg: number;
  goals: number;
  tacklesWon: number;
  interceptions: number;
  clearances: number;
  foulsCommitted: number;
};

export type ActionStats = {
  teams: ActionTeamStats;
  /** Keyed by player id; only players who appear in the log have a line. */
  players: Record<string, ActionPlayerLine>;
};

const HALFWAY = PITCH_LENGTH / 2;

const other = (side: Side): Side => (side === "home" ? "away" : "home");

const zero = (): PerSide<number> => ({ home: 0, away: 0 });

const shareOf = (seconds: PerSide<number>): PerSide<number> => {
  const total = seconds.home + seconds.away;
  if (total === 0) return { home: 0.5, away: 0.5 };
  return { home: seconds.home / total, away: seconds.away / total };
};

const ratio = (part: number, whole: number): number => (whole === 0 ? 0 : part / whole);

/** The side that has the ball once `event` is over. */
export const holderAfter = (event: ActionEvent): Side => {
  if (event.type === "pass" && event.outcome === "intercepted") return other(event.team);
  if (event.type === "carry" && event.outcome === "tackled") return other(event.team);
  if (event.type === "tackle" && event.outcome === "lost") return other(event.team);
  return event.team;
};

const isStoppage = (event: ActionEvent): boolean =>
  event.type === "periodChange" && (event.period === "halfTime" || event.period === "fullTime");

/** The side whose attacking half contains the ball after `event` (home attacks towards +x). */
const attackingHalfOf = (event: ActionEvent): Side | undefined => {
  if (event.to.x > HALFWAY) return "home";
  if (event.to.x < HALFWAY) return "away";
  return undefined;
};

const possessionAndTilt = (events: readonly ActionEvent[], upTo: number) => {
  const possession = zero();
  const tilt = zero();
  events.forEach((event, index) => {
    if (isStoppage(event)) return;
    const next = events[index + 1];
    const seconds = Math.max(0, (next ? next.time : upTo) - event.time);
    possession[holderAfter(event)] += seconds;
    const attacking = attackingHalfOf(event);
    if (attacking) tilt[attacking] += seconds;
  });
  return { possession: shareOf(possession), fieldTilt: shareOf(tilt) };
};

const emptyLine = (): ActionPlayerLine => ({
  passes: 0,
  completedPasses: 0,
  passCompletion: 0,
  keyPasses: 0,
  shots: 0,
  shotsOnTarget: 0,
  xg: 0,
  goals: 0,
  tacklesWon: 0,
  interceptions: 0,
  clearances: 0,
  foulsCommitted: 0,
});

type Lines = Record<string, ActionPlayerLine>;

const lineOf = (lines: Lines, id: string): ActionPlayerLine => {
  const existing = lines[id];
  if (existing) return existing;
  const created = emptyLine();
  lines[id] = created;
  return created;
};

type Counters = Pick<
  ActionTeamStats,
  | "shots"
  | "shotsOnTarget"
  | "xg"
  | "corners"
  | "fouls"
  | "throwIns"
  | "goalKicks"
  | "passes"
  | "completedPasses"
>;

const countEvent = (
  event: ActionEvent,
  next: ActionEvent | undefined,
  counters: Counters,
  lines: Lines,
): void => {
  if (event.type === "pass") {
    const line = lineOf(lines, event.actor);
    counters.passes[event.team] += 1;
    line.passes += 1;
    if (event.outcome === "complete") {
      counters.completedPasses[event.team] += 1;
      line.completedPasses += 1;
    }
    if (leadsToShot(event, next)) line.keyPasses += 1;
  } else if (event.type === "shot") {
    const line = lineOf(lines, event.actor);
    const onTarget = event.outcome === "goal" || event.outcome === "saved";
    counters.shots[event.team] += 1;
    counters.xg[event.team] += event.xg;
    line.shots += 1;
    line.xg += event.xg;
    if (onTarget) {
      counters.shotsOnTarget[event.team] += 1;
      line.shotsOnTarget += 1;
    }
    if (event.outcome === "goal") line.goals += 1;
  } else if (event.type === "tackle") {
    if (event.outcome === "won") lineOf(lines, event.actor).tacklesWon += 1;
  } else if (event.type === "interception") {
    lineOf(lines, event.actor).interceptions += 1;
  } else if (event.type === "clearance") {
    lineOf(lines, event.actor).clearances += 1;
  } else if (event.type === "foul") {
    counters.fouls[other(event.team)] += 1;
    if (event.opponent !== undefined) lineOf(lines, event.opponent).foulsCommitted += 1;
  } else if (event.type === "setPiece") {
    if (event.variant === "corner") counters.corners[event.team] += 1;
    if (event.variant === "throwIn") counters.throwIns[event.team] += 1;
    if (event.variant === "goalKick") counters.goalKicks[event.team] += 1;
  }
};

/**
 * Computes team and per-player statistics from the action log, counting only what happened up to
 * `upTo` seconds (the stats at time t equal the stats of the log truncated at t). The ball stays
 * where, and with whom, the latest event left it. Pure: nothing outside `events` is read.
 */
export const computeActionStats = (events: readonly ActionEvent[], upTo: number): ActionStats => {
  const seen = events.filter((event) => event.time <= upTo);
  const counters: Counters = {
    shots: zero(),
    shotsOnTarget: zero(),
    xg: zero(),
    corners: zero(),
    fouls: zero(),
    throwIns: zero(),
    goalKicks: zero(),
    passes: zero(),
    completedPasses: zero(),
  };
  const players: Lines = {};
  seen.forEach((event, index) => {
    countEvent(event, seen[index + 1], counters, players);
  });
  for (const line of Object.values(players)) {
    line.passCompletion = ratio(line.completedPasses, line.passes);
  }
  const passCompletion: PerSide<number> = {
    home: ratio(counters.completedPasses.home, counters.passes.home),
    away: ratio(counters.completedPasses.away, counters.passes.away),
  };
  return {
    teams: { ...possessionAndTilt(seen, upTo), ...counters, passCompletion },
    players,
  };
};
