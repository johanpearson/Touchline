import type { ChanceAftermath, ChanceKind, ChanceResult, ChanceSituation } from "./chance";

/** Tuning values of a chance (first draft, then calibrated by #461). */

/** Metres from the goal's centre: a shot from this far or further, from open play, is from the edge. */
export const EDGE_DISTANCE = 17;
/** Wide channel: a creator this far from the centre line (metres) can cross or cut the ball back. */
export const WIDE_CHANNEL = 16;
/** A creator this deep (depth) can cross; this deep, can cut the ball back. */
export const CROSS_MIN_DEPTH = 70;
export const CUT_BACK_MIN_DEPTH = 84;
/** A last pass that gains this many metres is a through ball. */
export const THROUGH_BALL_MIN_GAIN = 12;
/** A possession won in the attacker's own part of the pitch (depth) with a short chain is a counter. */
export const COUNTER_MAX_START_DEPTH = 60;
export const COUNTER_MAX_LINKS = 4;

/** Weights of the kinds the geometry allows; one draw picks among them. */
export const KIND_WEIGHT: Record<
  Exclude<ChanceKind, "setPiece" | "freeKick" | "penalty">,
  number
> = { openPlay: 1, throughBall: 1.6, cross: 1.6, cutBack: 1.4, counter: 2 };

/** Shares of each situation by kind, in the order of `SITUATIONS`; one draw picks it. */
export const SITUATIONS: readonly ChanceSituation[] = [
  "oneOnOne",
  "header",
  "volley",
  "box",
] as const;
export const SITUATION_SHARES: Record<ChanceKind, readonly [number, number, number, number]> = {
  openPlay: [0.05, 0.1, 0.1, 0.75],
  throughBall: [0.6, 0, 0.05, 0.35],
  cross: [0, 0.65, 0.2, 0.15],
  cutBack: [0.1, 0, 0.15, 0.75],
  counter: [0.6, 0.05, 0.05, 0.3],
  setPiece: [0, 0.7, 0.1, 0.2],
  freeKick: [0, 0, 0, 1],
  penalty: [1, 0, 0, 0],
};

/** Pressure on the shooter (0..1) by situation, lowering xG through `shotXg`. */
export const SITUATION_PRESSURE: Record<ChanceSituation, number> = {
  oneOnOne: 0,
  header: 0.4,
  edge: 0.3,
  box: 0.35,
  volley: 0.45,
};
/** Multiplies the xG of the base model: a one-on-one is the clearest chance there is. */
export const SITUATION_XG_FACTOR: Record<ChanceSituation, number> = {
  oneOnOne: 4,
  header: 1,
  edge: 1,
  box: 1,
  volley: 0.85,
};
/** Multiplies the xG for kinds that open the goal up. */
export const KIND_XG_FACTOR: Record<ChanceKind, number> = {
  openPlay: 1,
  throughBall: 1.15,
  cross: 1,
  cutBack: 2.8,
  counter: 1.15,
  setPiece: 1,
  freeKick: 0.55,
  penalty: 1,
};
/** Scales the base model: it is calibrated for the v2 shot positions and rates a shot from 11 m at 0.03. */
export const XG_SCALE = 3;
/** A one-on-one with the keeper is never below this, wherever it starts: it is a clear chance by definition. */
export const ONE_ON_ONE_MIN_XG = 0.3;
export const MIN_CHANCE_XG = 0.01;
export const MAX_CHANCE_XG = 0.8;

/** Weights that split the non-goal remainder; saved and wide/over also depend on the players. */
export const WOODWORK_WEIGHT = 0.05;
export const SAVED_WEIGHT = 0.55;
export const WIDE_WEIGHT = 0.22;
export const OVER_WEIGHT = 0.2;
/** Blocked shots by situation (a penalty and a one-on-one cannot be blocked). */
export const BLOCKED_WEIGHT: Record<ChanceSituation, number> = {
  oneOnOne: 0,
  header: 0.12,
  edge: 0.5,
  box: 0.3,
  volley: 0.25,
};
/** How much pressure and poor finishing add to the weights of a wide or high shot. */
export const PRESSURE_MISS_GAIN = 1;

/** Aftermath of a result, as shares in the order of `AFTERMATH_ORDER`; goals always restart with a kickoff. */
export const AFTERMATH_ORDER: readonly ChanceAftermath[] = ["rebound", "corner", "goalKick"];
export const AFTERMATH_SHARES: Record<
  Exclude<ChanceResult, "goal">,
  readonly [number, number, number]
> = {
  saved: [0.2, 0.5, 0.3],
  woodwork: [0.5, 0.3, 0.2],
  blocked: [0.25, 0.55, 0.2],
  wide: [0, 0.12, 0.88],
  over: [0, 0.12, 0.88],
};

/** Where a rebound lands: metres in front of the goal line. */
export const REBOUND_DEPTH = 94;
