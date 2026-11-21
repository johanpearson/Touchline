/**
 * How much of the match gets a commentary line. `phase-selection.ts` picks the possession phases that
 * are commented (a shot, a foul, a stop of a dangerous attack); goals, penalties, big chances,
 * corners and the match milestones always get a line and the rest is sampled by importance (xG,
 * how close to goal, outcome), so the feed holds roughly 40 to 80 lines per match.
 */
export const BIG_CHANCE_XG = 0.12;
/** Shots below this xG never get a line, unless they hit the woodwork. */
export const MINOR_SHOT_XG = 0.045;
export const MINOR_SHOT_CHANCE = 0.85;
export const KEY_PASS_CHANCE = 0.5;
/** Share of the pitch length (from the own goal) beyond which an attack counts as dangerous. */
export const DANGER_PROGRESS = 0.7;
export const DANGEROUS_STOP_CHANCE = 0.85;
/** A phase without a shot that came this close to goal (`Phase.danger`) counts as a dangerous attack. */
export const DANGEROUS_PHASE_DANGER = 0.02;
export const FOUL_CHANCE = 0.7;
export const DANGEROUS_FREE_KICK_CHANCE = 0.7;
export const FREE_KICK_CHANCE = 0.3;
export const SUMMARY_INTERVAL = 900;
/** Summary times in match seconds: every 15 minutes, except where a half ends. */
export const SUMMARY_SLOTS = [1, 2, 4, 5].map((n) => n * SUMMARY_INTERVAL);
export const EVEN_SPELL_MARGIN = 0.08;
