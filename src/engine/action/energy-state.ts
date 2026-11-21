import type { Side } from "../match-state";
import { drainPerMinute, ENERGY_START, withEnergy } from "./energy";
import { SECONDS_PER_MINUTE } from "./loop-constants";
import type { MatchInput } from "./match-input";
import type { TeamSheet } from "./team-sheet";

/** Energy of every player who has been on the pitch, by player id; a player not listed is at full energy. */
export type EnergyLevels = Readonly<Record<string, number>>;

/**
 * The energy side of a match: levels, the time they are drained up to, and the input the engine acts
 * on (`effective`: the starters with their attributes scaled by energy), kept so it is built once per
 * minute and after a change, not once per action.
 */
export type EnergyState = {
  readonly levels: EnergyLevels;
  /** Match time in seconds up to which energy has been drained; always a whole number of minutes after the period start. */
  readonly clock: number;
  readonly effective: MatchInput;
  /** Which sides tire: energy is always tracked and reported, but a side without the penalty plays at its starting attributes. */
  readonly penalty: Readonly<Record<Side, boolean>>;
};

const levelOf = (levels: EnergyLevels, id: string): number => levels[id] ?? ENERGY_START;

/** Applies the energy of each starter to the input; bench players are rested. */
const effectiveInput = (
  input: MatchInput,
  levels: EnergyLevels,
  penalty: Readonly<Record<Side, boolean>>,
): MatchInput => {
  const tired = (sheet: TeamSheet, side: Side): TeamSheet =>
    penalty[side]
      ? { ...sheet, starters: sheet.starters.map((p) => withEnergy(p, levelOf(levels, p.id))) }
      : sheet;
  return { ...input, home: tired(input.home, "home"), away: tired(input.away, "away") };
};

/** `ActionMatchOptions.energyPenalty` as one flag per side: `true` or `false` for both, or only the side named. */
export const penaltySides = (option: boolean | Side): Record<Side, boolean> =>
  typeof option === "boolean"
    ? { home: option, away: option }
    : { home: option === "home", away: option === "away" };

/** The default: every side tires. */
export const EVERYONE_TIRES: Readonly<Record<Side, boolean>> = { home: true, away: true };

/** Everyone starts at full energy. */
export const initialEnergy = (
  input: MatchInput,
  penalty: Readonly<Record<Side, boolean>> = EVERYONE_TIRES,
): EnergyState => {
  const levels: EnergyLevels = {};
  return { levels, clock: 0, effective: effectiveInput(input, levels, penalty), penalty };
};

/** The levels after `minutes` of play: starters lose `minutes` times their drain; everyone else stays. */
const drained = (input: MatchInput, levels: EnergyLevels, minutes: number): EnergyLevels => {
  const next: Record<string, number> = { ...levels };
  for (const sheet of [input.home, input.away]) {
    for (const player of sheet.starters) {
      const lost = minutes * drainPerMinute(player, sheet.tactics);
      next[player.id] = Math.max(0, levelOf(levels, player.id) - lost);
    }
  }
  return next;
};

/**
 * Drains energy for every whole minute between the clock and `time`. It depends only on the time
 * asked, never on how the match was advanced, so splitting time differently gives the same energy.
 */
export const drainEnergyTo = (
  energy: EnergyState,
  input: MatchInput,
  time: number,
): EnergyState => {
  const minutes = Math.floor((time - energy.clock) / SECONDS_PER_MINUTE);
  if (minutes <= 0) return energy;
  const levels = drained(input, energy.levels, minutes);
  return {
    ...energy,
    levels,
    clock: energy.clock + minutes * SECONDS_PER_MINUTE,
    effective: effectiveInput(input, levels, energy.penalty),
  };
};

/** After a substitution or a tactics change: the input changes but not the levels (a new player is at full energy). */
export const withInput = (energy: EnergyState, input: MatchInput): EnergyState => ({
  ...energy,
  effective: effectiveInput(input, energy.levels, energy.penalty),
});

/** Starts the clock again at `time` (the second half): half-time costs no energy. */
export const restartEnergyClock = (energy: EnergyState, time: number): EnergyState => ({
  ...energy,
  clock: time,
});

/** The energy of every player who is or was on the pitch, plus both starting elevens at full energy. */
export const energyOf = (energy: EnergyState, input: MatchInput): Record<string, number> => {
  const result: Record<string, number> = {};
  for (const sheet of [input.home, input.away]) {
    for (const player of sheet.starters) result[player.id] = levelOf(energy.levels, player.id);
  }
  for (const [id, level] of Object.entries(energy.levels)) result[id] = level;
  return result;
};
