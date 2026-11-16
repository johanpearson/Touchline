/** How much risk the team takes going forward. */
export type Mentality = "defensive" | "balanced" | "attacking";
/** How aggressively the team wins the ball back high up the pitch. */
export type Pressing = "low" | "medium" | "high";
/** How much of the pitch width the team uses in attack. */
export type Width = "narrow" | "normal" | "wide";
/** How fast the team plays. */
export type Tempo = "slow" | "normal" | "fast";

/** Four team-level settings. Each has three levels; the middle one is neutral. */
export type TeamTactics = {
  mentality: Mentality;
  pressing: Pressing;
  width: Width;
  tempo: Tempo;
};

/** The baseline: every setting at its middle level. */
export const NEUTRAL_TACTICS: TeamTactics = {
  mentality: "balanced",
  pressing: "medium",
  width: "normal",
  tempo: "normal",
};
