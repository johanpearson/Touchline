/** Rating every player starts from (a quiet, average game). */
export const RATING_BASELINE = 6;
export const RATING_MIN = 1;
export const RATING_MAX = 10;

/** Raises a rating. */
export const GOAL_BONUS = 1;
export const KEY_PASS_BONUS = 0.3;
export const PROGRESSIVE_PASS_BONUS = 0.1;
export const TACKLE_WON_BONUS = 0.2;
export const INTERCEPTION_BONUS = 0.2;
export const SAVE_BONUS = 0.3;

/** Lowers a rating. */
export const LOST_DUEL_PENALTY = 0.15;
export const MISSED_CHANCE_PENALTY = 0.3;
export const FOUL_PENALTY = 0.2;
export const GOAL_CONCEDED_PENALTY = 0.5;

/** A completed pass is progressive when it moves the ball this many metres towards the goal it attacks. */
export const PROGRESSIVE_PASS_METRES = 10;
/** A shot that is not a goal is a missed chance from this xG upwards. */
export const BIG_CHANCE_XG = 0.3;
