/** Match seconds that pass per real second, slowest first. The labels shown are ×1, ×2, ×4, ×8. */
export const SPEEDS = [30, 60, 120, 240] as const;

export type Speed = (typeof SPEEDS)[number];

/** The match time after `wallSeconds` of real time at `speed` (match seconds per real second). */
export const advanceClock = (
  matchTime: number,
  wallSeconds: number,
  speed: number,
  paused: boolean,
): number => (paused ? matchTime : matchTime + wallSeconds * speed);
