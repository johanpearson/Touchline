import type { ActionEventType } from "../../../engine";

/** How much of a match the user watches: key moments only, a compressed match, or all of it at a readable pace. */
export type PlaybackMode = "highlights" | "extended" | "full";

export const PLAYBACK_MODES: readonly PlaybackMode[] = ["highlights", "extended", "full"];

/** The presentation minutes a whole match takes in each mode; the controls describe the modes from these. */
export const MODE_TARGET_MINUTES: Record<PlaybackMode, { min: number; max: number }> = {
  highlights: { min: 1.5, max: 3 },
  extended: { min: 3, max: 5 },
  full: { min: 6, max: 10 },
};

/**
 * The shortest time, in presentation seconds, an action that is shown at full pace stays on screen in
 * `full` mode (a pass at least 0.6 s). Other modes multiply it by `MODE_SETTINGS[mode].minimumScale`.
 */
export const MIN_DURATION: Record<ActionEventType, number> = {
  pass: 0.6,
  carry: 0.7,
  tackle: 0.6,
  interception: 0.6,
  clearance: 0.6,
  foul: 1.2,
  shot: 1.2,
  setPiece: 1,
  periodChange: 0,
};

/** Distance to the nearest goal (metres) up to which an action is slowed down in front of goal, per mode. */
export const ACTIVE_DISTANCE: Record<PlaybackMode, number> = {
  full: 5,
  extended: 5,
  highlights: 5,
};

/** Distance to the goal (metres) at which the slow-down in front of goal is complete: right in front of goal; must be below every `ACTIVE_DISTANCE`. */
export const SLOWDOWN_FULL_DISTANCE = 3;

/** Extra time near the goal: an action at `SLOWDOWN_FULL_DISTANCE` lasts `1 + NEAR_GOAL_SLOWDOWN` times its minimum. */
export const NEAR_GOAL_SLOWDOWN = 0.4;

type ModeSettings = {
  /** Scale on `MIN_DURATION` for actions that get their own moment. */
  minimumScale: number;
  /** Scale on `HOLDS`. */
  holdScale: number;
};

export const MODE_SETTINGS: Record<PlaybackMode, ModeSettings> = {
  full: { minimumScale: 1, holdScale: 1 },
  extended: { minimumScale: 0.45, holdScale: 0.7 },
  highlights: { minimumScale: 0.6, holdScale: 0.6 },
};

/**
 * How a possession phase is shown (`docs/architecture.md`, "Match playback director"). Its ending
 * action (and any key moment inside it) gets its own moment at `MIN_DURATION`; every other action
 * plays through at `pace` presentation seconds per match second, so the clock and the ball move at
 * one steady speed through the build-up.
 */
type PhaseSettings = {
  /** Presentation seconds per match second for the build-up. */
  pace: number;
  /** Shortest and longest time, in presentation seconds, the build-up of one phase takes. */
  minBuildUp: number;
  maxBuildUp: number;
};

export const PHASE_SETTINGS: Record<PlaybackMode, PhaseSettings> = {
  full: { pace: 0.04, minBuildUp: 0.3, maxBuildUp: 2.5 },
  extended: { pace: 0.015, minBuildUp: 0.2, maxBuildUp: 1.5 },
  highlights: { pace: 0.05, minBuildUp: 0.3, maxBuildUp: 2 },
};

/** The clock stands still (views keep animating) for these presentation seconds around a key moment. */
export type Hold = { before: number; after: number };

export const HOLDS = {
  shot: { before: 0.5, after: 0.8 },
  goal: { before: 0.8, after: 3 },
  corner: { before: 0.5, after: 0.4 },
  freeKick: { before: 0.5, after: 0.4 },
  penalty: { before: 1.5, after: 1.2 },
  penaltyFoul: { before: 0.5, after: 0.8 },
} as const satisfies Record<string, Hold>;
