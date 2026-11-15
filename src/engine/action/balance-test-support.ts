import { expect } from "vitest";
import { NEUTRAL_TACTICS, type TeamTactics } from "../tactics";
import { simulateActionBalance } from "./action-balance";
import { aMatchInputV2, aTeamSheet } from "./action-builders";

export const MATCHES = 1000;
export const BASE_SEED = 1;
export const AVERAGE = 10;

export const between = (value: number, min: number, max: number): void => {
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
};

export const withTactics = (changes: Partial<TeamTactics>): TeamTactics => ({
  ...NEUTRAL_TACTICS,
  ...changes,
});

/** The home side plays `tactics` against a neutral away side; both teams are average. */
export const playWith = (tactics: TeamTactics, matches = MATCHES) =>
  simulateActionBalance(
    aMatchInputV2().withHome(aTeamSheet("Home", "h").withTactics(tactics).build()).build(),
    matches,
    BASE_SEED,
  );
