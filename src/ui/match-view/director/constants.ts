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

/** Distance to the nearest goal (metres) up to which an action is slowed down in front of goal, per mode. */
export const ACTIVE_DISTANCE: Record<PlaybackMode, number> = {
  full: 5,
  extended: 5,
  highlights: 5,
};

/** Distance to the nearest goal (metres) beyond which quiet play is grouped into beats, per mode. */
export const BEAT_DISTANCE: Record<PlaybackMode, number> = {
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
 * How a beat (a run of quiet actions) is shown. Its key actions (the first, the last and the longest)
 * get their own moment at `MIN_DURATION`; the actions between them play through at `pace`
 * presentation seconds per match second, so the clock runs at one speed inside the beat.
 */
type BeatSettings = {
  /** Presentation seconds per match second for the actions between the key actions. */
  pace: number;
  /** Shortest and longest time, in presentation seconds, one beat takes; the key actions always fit. */
  minDuration: number;
  maxDuration: number;
  /** A beat that spans more match seconds than this is split. */
  maxSpan: number;
  /** At most this many actions of one beat get their own moment, one per `actionsPerKey` actions in the beat. */
  keyActions: number;
  actionsPerKey: number;
};

export const BEAT_SETTINGS: Record<PlaybackMode, BeatSettings> = {
  full: {
    pace: 0.025,
    minDuration: 1.2,
    maxDuration: 5,
    maxSpan: 60,
    keyActions: 2,
    actionsPerKey: 4,
  },
  extended: {
    pace: 0.01,
    minDuration: 0.8,
    maxDuration: 3,
    maxSpan: 90,
    keyActions: 2,
    actionsPerKey: 4,
  },
  highlights: {
    pace: 0.1,
    minDuration: 0.8,
    maxDuration: 2.5,
    maxSpan: 20,
    keyActions: 2,
    actionsPerKey: 4,
  },
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
