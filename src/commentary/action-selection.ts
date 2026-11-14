/**
 * Which action events get a commentary line. Goals, penalties, big chances, corners and the
 * match milestones always do; the rest are sampled by importance (xG, how close to goal, outcome)
 * so the feed holds roughly 60 to 100 lines per match instead of one per action.
 */
export const BIG_CHANCE_XG = 0.12;
/** Shots below this xG never get a line, unless they hit the woodwork. */
export const MINOR_SHOT_XG = 0.045;
export const MINOR_SHOT_CHANCE = 0.6;
export const KEY_PASS_CHANCE = 0.5;
/** Share of the pitch length (from the own goal) beyond which an attack counts as dangerous. */
export const DANGER_PROGRESS = 0.7;
export const DANGEROUS_STOP_CHANCE = 0.6;
export const THROUGH_BALL_CHANCE = 0.35;
export const FOUL_CHANCE = 0.4;
export const DANGEROUS_FREE_KICK_CHANCE = 0.7;
export const FREE_KICK_CHANCE = 0.1;
/** Throw-ins and goal kicks are only occasional colour. */
export const COLOUR_CHANCE = 0.06;
export const SUMMARY_INTERVAL = 900;
/** Summary times in match seconds: every 15 minutes, except where a half ends. */
export const SUMMARY_SLOTS = [1, 2, 4, 5].map((n) => n * SUMMARY_INTERVAL);
export const EVEN_SPELL_MARGIN = 0.08;
