/** A possession phase lasts 10 to 25 match seconds. */
export const STEP_MIN_SECONDS = 10;
export const STEP_MAX_SECONDS = 25;

/** The three stages of a possession, from the ball's third: build-up, progression, final third. */
export const STAGE_COUNT = 3;
export type Stage = 0 | 1 | 2;

/** Chance that an attack of equal strength gets through each stage. Tuned by the retune issue. */
export const STAGE_BASE: readonly [number, number, number] = [0.74, 0.62, 0.105];
/** Added to the stage chance per unit of attack minus defence strength (both 0..1). */
export const STAGE_GAIN = 1.2;
export const STAGE_MIN = 0.03;
export const STAGE_MAX = 0.97;
/** Added to the final-third chance when the possession starts from a corner or a free kick. */
export const SET_PIECE_BONUS: readonly [number, number, number] = [0, 0, 0.1];

/** Where a stage ends, as depth in metres from the attacker's own goal line. */
export const STAGE_END_DEPTH: readonly [number, number, number] = [40, 70, 100];
/** The ball's third at the start of a possession: below the first limit is stage 0, below the second stage 1. */
export const STAGE_START_LIMITS: readonly [number, number] = [35, 70];
/** Share of the chances created from a wing, and how far from the touchline (metres) the creator stands. */
export const WIDE_CREATOR_SHARE = 0.4;
export const WIDE_OFFSET_MIN = 3;
export const WIDE_OFFSET_MAX = 14;
/** Depth range of the shot of a chance. */
export const SHOT_DEPTH_MIN = 84;
export const SHOT_DEPTH_MAX = 96;

/** Shares of the failed possessions that end in a foul or out of play; the rest is a lost ball. */
export const FOUL_SHARE = 0.09;
export const OUT_OF_PLAY_SHARE = 0.1;
/** Share of the fouls in the final third that are penalties. */
export const PENALTY_FOUL_SHARE = 0.02;
/** Share of the lost balls that are a tackle, an interception (the rest is a bad pass). */
export const LOST_TACKLE_SHARE = 0.4;
export const LOST_INTERCEPTION_SHARE = 0.35;

/** Sideline exits are throw-ins; a possession that ends this deep (depth) goes over the end line. */
export const END_LINE_DEPTH = 99;
/** A free kick from this deep (depth) and no further than `DIRECT_FREE_KICK_BAND` from the goal's y is a direct shot. */
export const DIRECT_FREE_KICK_MIN_DEPTH = 82;
export const DIRECT_FREE_KICK_BAND = 10;

/** How strongly the tactics move a stage chance. */
export const DIRECTNESS_GAIN = 0.2;
export const RISK_BUILD_UP_PENALTY = 0.15;
export const SHOT_WEIGHT_GAIN = 0.6;
export const TURNOVER_BONUS_GAIN = 3;
/** Counter-attack gain: times the natural log of the defender's `spaceBehind`. */
export const SPACE_BEHIND_GAIN = 0.05;
/** Weight of the home edge in a stage chance (the home side gains, the away side loses). */
export const HOME_EDGE_GAIN = 1;

/** Where the set pieces are taken, as depth and y in the attacker's frame. */
export const PENALTY_SPOT = { depth: 94, y: 34 } as const;
export const GOAL_KICK_DEPTH = 5.5;
export const CENTRE = { x: 52.5, y: 34 } as const;

/** How much a position joins a possession by the ball's third (index 0 is the own third). */
export const POSITION_WEIGHT: readonly [
  Record<"GK" | "DEF" | "MID" | "FWD", number>,
  Record<"GK" | "DEF" | "MID" | "FWD", number>,
  Record<"GK" | "DEF" | "MID" | "FWD", number>,
] = [
  { GK: 0, DEF: 1, MID: 1, FWD: 0.15 },
  { GK: 0, DEF: 0.3, MID: 1, FWD: 0.6 },
  { GK: 0, DEF: 0.1, MID: 0.7, FWD: 1 },
];
