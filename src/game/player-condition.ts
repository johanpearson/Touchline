import { ATTRIBUTE_NAMES, type Player, type PlayerAttributes } from "./player";

/** Per-player fitness and form. Plain JSON data; it lives next to, never on, `Player`. */
export type PlayerCondition = {
  /** 0 to 100. */
  fitness: number;
  /** 1 to 10. */
  form: number;
};

export type MatchOutcome = "win" | "draw" | "defeat";

export type MatchAppearance = {
  /** Minutes played in the match, 0 for an unused player. */
  minutes: number;
  /** Result of the player's team. */
  outcome: MatchOutcome;
};

export const FITNESS_MIN = 0;
export const FITNESS_MAX = 100;
export const FORM_MIN = 1;
export const FORM_MAX = 10;
export const FORM_START = 5;
/** Length of a full match in minutes; the drain is proportional to minutes played. */
export const FITNESS_MATCH_MINUTES = 90;
/** Fitness lost by playing a full match. */
export const FITNESS_DRAIN_PER_MATCH = 10;
/** Share of the missing fitness regained after every matchday. */
export const FITNESS_RECOVERY_RATE = 0.25;
/** Minutes a player needs for the result to change their form. */
export const FORM_MIN_MINUTES = 45;
/** Form change for a win (up) or a defeat (down). */
export const FORM_STEP = 1;
/** Share of the attribute value that depends on fitness (the rest is kept at zero fitness). */
export const FITNESS_ATTRIBUTE_WEIGHT = 0.15;
/** Attribute change per form point away from `FORM_START`. */
export const FORM_ATTRIBUTE_STEP = 0.01;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const initialCondition = (): PlayerCondition => ({
  fitness: FITNESS_MAX,
  form: FORM_START,
});

const formChange = (appearance: MatchAppearance): number => {
  if (appearance.minutes < FORM_MIN_MINUTES) return 0;
  if (appearance.outcome === "win") return FORM_STEP;
  if (appearance.outcome === "defeat") return -FORM_STEP;
  return 0;
};

/** Condition after a match: fitness drains with minutes played, form follows the result. */
export const applyMatchToCondition = (
  condition: PlayerCondition,
  appearance: MatchAppearance,
): PlayerCondition => {
  const minutes = clamp(appearance.minutes, 0, FITNESS_MATCH_MINUTES);
  const drain = (FITNESS_DRAIN_PER_MATCH * minutes) / FITNESS_MATCH_MINUTES;
  return {
    fitness: clamp(condition.fitness - drain, FITNESS_MIN, FITNESS_MAX),
    form: clamp(condition.form + formChange(appearance), FORM_MIN, FORM_MAX),
  };
};

/** Recovery after a matchday, for every player whether they played or not. */
export const recoverCondition = (condition: PlayerCondition): PlayerCondition => ({
  fitness: clamp(
    condition.fitness + (FITNESS_MAX - condition.fitness) * FITNESS_RECOVERY_RATE,
    FITNESS_MIN,
    FITNESS_MAX,
  ),
  form: condition.form,
});

/** Stored attributes scaled by fitness and form. A float, deliberately not clamped to 1..20. */
export const effectiveAttributes = (
  player: Player,
  condition: PlayerCondition,
): PlayerAttributes => {
  const fitnessFactor =
    1 - FITNESS_ATTRIBUTE_WEIGHT + (FITNESS_ATTRIBUTE_WEIGHT * condition.fitness) / FITNESS_MAX;
  const formFactor = 1 + FORM_ATTRIBUTE_STEP * (condition.form - FORM_START);
  const factor = fitnessFactor * formFactor;
  return Object.fromEntries(
    ATTRIBUTE_NAMES.map((name) => [name, player[name] * factor]),
  ) as PlayerAttributes;
};
