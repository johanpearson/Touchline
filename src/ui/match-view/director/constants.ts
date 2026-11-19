import type { ActionEventType } from "../../../engine";

/** How much of a match the user watches: key moments only, a compressed match, or all of it at a readable pace. */
export type PlaybackMode = "highlights" | "extended" | "full";

export const PLAYBACK_MODES: readonly PlaybackMode[] = ["highlights", "extended", "full"];

/**
 * The shortest time, in presentation seconds, an action that is shown at full pace stays on screen in
 * `full` mode (a pass at least 0.8 s). Other modes multiply it by `MODE_SETTINGS[mode].minimumScale`.
 */
export const MIN_DURATION: Record<ActionEventType, number> = {
  pass: 0.8,
  carry: 1,
  tackle: 0.8,
  interception: 0.8,
  clearance: 0.9,
  foul: 1.2,
  shot: 1.2,
  setPiece: 1,
  periodChange: 0,
};

/** Distance to the nearest goal (metres) up to which an action is shown at full pace, per mode. */
export const ACTIVE_DISTANCE: Record<PlaybackMode, number> = {
  full: 8,
  extended: 7,
  highlights: 7,
};

/** Distance to the nearest goal (metres) from which an action counts as quiet build-up, per mode. */
export const BUILD_UP_DISTANCE: Record<PlaybackMode, number> = {
  full: 18,
  extended: 17,
  highlights: 17,
};

/** Distance to the goal (metres) at which the slow-down in front of goal is complete: right in front of goal; must be below every `ACTIVE_DISTANCE`. */
export const SLOWDOWN_FULL_DISTANCE = 3;

/** Extra time near the goal: an action at `SLOWDOWN_FULL_DISTANCE` lasts `1 + NEAR_GOAL_SLOWDOWN` times its minimum. */
export const NEAR_GOAL_SLOWDOWN = 0.4;

/** Quiet build-up lasts this fraction of its engine duration, but never less than `quietFloor`. */
type ModeSettings = {
  quietFraction: number;
  /** Shortest time, in presentation seconds, of one quiet action. */
  quietFloor: number;
  /** Scale on `MIN_DURATION` for actions at full pace. */
  minimumScale: number;
  /** Scale on `HOLDS`. */
  holdScale: number;
};

export const MODE_SETTINGS: Record<PlaybackMode, ModeSettings> = {
  full: { quietFraction: 0.02, quietFloor: 0.03, minimumScale: 1, holdScale: 1 },
  extended: { quietFraction: 0.01, quietFloor: 0.015, minimumScale: 0.45, holdScale: 0.7 },
  highlights: { quietFraction: 0.01, quietFloor: 0.015, minimumScale: 0.6, holdScale: 0.6 },
};

/** Match seconds before a key moment that `highlights` mode still plays, so a chance has a build-up. */
export const LEAD_IN_MATCH_SECONDS = 6;

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
