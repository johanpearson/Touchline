/** Tuning values of the match loop (periods, restarts, snapshots). First guesses; the balance issue calibrates them. */
export const HALF_SECONDS = 2700;
export const SECONDS_PER_MINUTE = 60;
export const FIRST_HALF_ADDED_MINUTES = { min: 1, max: 4 };
export const SECOND_HALF_ADDED_MINUTES = { min: 2, max: 6 };

/** Chance per unit of pressure that an opponent challenges the ball carrier instead of the carrier acting. */
export const CHALLENGE_PRESSURE_GAIN = 0.25;

/** Distance from the goal line to the penalty spot, metres. */
export const PENALTY_SPOT_DEPTH = 11;

/** Largest snapshot offset per axis, metres: the diagonal stays under 0.5 m. */
export const SNAPSHOT_JITTER_MAX = 0.35;

/** Actions since the last turnover that mean "no recent turnover" at kickoff. */
export const NO_RECENT_TURNOVER = 99;
