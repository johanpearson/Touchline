import type { TeamTactics } from "../engine";

export const TACTIC_LEVELS = {
  mentality: ["defensive", "balanced", "attacking"],
  pressing: ["low", "medium", "high"],
  width: ["narrow", "normal", "wide"],
  tempo: ["slow", "normal", "fast"],
} as const satisfies { [K in keyof TeamTactics]: readonly TeamTactics[K][] };

export type TacticName = keyof TeamTactics;
export const TACTIC_NAMES = Object.keys(TACTIC_LEVELS) as TacticName[];
