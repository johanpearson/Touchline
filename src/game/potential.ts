import type { Rng } from "../engine";
import { MAX_ATTRIBUTE } from "./player";

/** Inclusive range of points added to the overall to get the potential, by age band. */
const youngest = { maxAge: 20, min: 3, max: 7 };
const young = { maxAge: 24, min: 1, max: 4 };
const mature = { min: 0, max: 1 };

const boostRange = (age: number): { min: number; max: number } => {
  if (age <= youngest.maxAge) return youngest;
  if (age <= young.maxAge) return young;
  return mature;
};

/**
 * The highest overall a player can reach, an integer 1 to 20, never below the current overall.
 * Age 16 to 20 adds 3 to 7, age 21 to 24 adds 1 to 4, older players add 0 to 1 (clamped to 20).
 */
export const potentialFor = (age: number, overall: number, rng: Rng): number => {
  const { min, max } = boostRange(age);
  return Math.min(MAX_ATTRIBUTE, Math.ceil(overall) + rng.int(min, max));
};
