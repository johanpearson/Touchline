/** Which side of the match a team plays on. */
export type Side = "home" | "away";

/** Phase of the match. Time only advances in the playing periods. */
export type Period = "firstHalf" | "halfTime" | "secondHalf" | "fullTime";

/** Normalised position on the pitch. x runs from the home goal (0) to the away goal (1), y across the width. */
export type PitchPosition = { x: number; y: number };

/** The simulation state at one moment. */
export type MatchState = {
  /** Match time in seconds, including added time. */
  time: number;
  period: Period;
  /** The side currently in possession of the ball. */
  possession: Side;
  /** Ball position on the pitch. */
  ball: PitchPosition;
  /** How dangerous the current attack is, 0 (harmless) to 1 (about to score). */
  danger: number;
  score: Record<Side, number>;
};
