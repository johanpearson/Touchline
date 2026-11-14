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

/** Changes nothing: a match with neutral tactics is exactly the match of the engine without tactics. */
export const NEUTRAL_TACTICS: TeamTactics = {
  mentality: "balanced",
  pressing: "medium",
  width: "normal",
  tempo: "normal",
};

/**
 * What one team's tactics change in the zone model. Additive values are 0 when neutral,
 * multipliers are 1. "Conceded" values apply while the opponent has the ball.
 */
export type TacticsModifiers = {
  /** Added to the chance of shooting once in the shooting zone. */
  shootChance: number;
  /** Added to the opponent's chance of shooting. */
  concededShootChance: number;
  /** Added to the chance of advancing in build-up. */
  advanceChance: number;
  /** Added to the opponent's chance of advancing in build-up. */
  concededAdvanceChance: number;
  /** Added to the progress an opponent gains when they do advance (space behind the press). */
  concededAdvanceStep: number;
  /** Added to the chance of a sideways pass after a failed advance. */
  lateralChance: number;
  /** Added to the chance of a corner after a blocked or saved shot. */
  cornerChance: number;
  /** Multiplies the goal chance of the team's shots. */
  shotQuality: number;
  /** Multiplies the time between steps while the team has the ball. */
  stepDelay: number;
};

const NO_CHANGE: TacticsModifiers = {
  shootChance: 0,
  concededShootChance: 0,
  advanceChance: 0,
  concededAdvanceChance: 0,
  concededAdvanceStep: 0,
  lateralChance: 0,
  cornerChance: 0,
  shotQuality: 1,
  stepDelay: 1,
};

const MENTALITY: Record<Mentality, Partial<TacticsModifiers>> = {
  defensive: { shootChance: -0.03, concededShootChance: -0.04 },
  balanced: {},
  attacking: { shootChance: 0.03, concededShootChance: 0.05 },
};

const PRESSING: Record<Pressing, Partial<TacticsModifiers>> = {
  low: { concededAdvanceChance: 0.02, concededAdvanceStep: -0.01 },
  medium: {},
  high: { concededAdvanceChance: -0.06, concededAdvanceStep: 0.045 },
};

const WIDTH: Record<Width, Partial<TacticsModifiers>> = {
  narrow: { lateralChance: -0.02, cornerChance: -0.06, shotQuality: 1.08 },
  normal: {},
  wide: { lateralChance: 0.03, cornerChance: 0.08, shotQuality: 0.85 },
};

const TEMPO: Record<Tempo, Partial<TacticsModifiers>> = {
  slow: { stepDelay: 1.2 },
  normal: {},
  fast: { stepDelay: 0.8, advanceChance: -0.01 },
};

const combine = (parts: Partial<TacticsModifiers>[]): TacticsModifiers => {
  const result = { ...NO_CHANGE };
  for (const part of parts) {
    for (const key of Object.keys(part) as (keyof TacticsModifiers)[]) {
      const value = part[key] ?? 0;
      if (key === "shotQuality" || key === "stepDelay") result[key] *= value;
      else result[key] += value;
    }
  }
  return result;
};

/** The combined effect of the four settings. */
export const tacticsModifiers = (tactics: TeamTactics): TacticsModifiers =>
  combine([
    MENTALITY[tactics.mentality],
    PRESSING[tactics.pressing],
    WIDTH[tactics.width],
    TEMPO[tactics.tempo],
  ]);
