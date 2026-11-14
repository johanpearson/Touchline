import type { Side } from "../match-state";
import {
  ENGINE_ATTRIBUTE_NAMES,
  MAX_ENGINE_ATTRIBUTE,
  MIN_ENGINE_ATTRIBUTE,
} from "./engine-player";
import type { MatchInputV2 } from "./match-input-v2";
import { STARTER_COUNT, type TeamSheet } from "./team-sheet";

export type MatchInputErrorCode =
  | "starterCount"
  | "goalkeeperCount"
  | "formationCount"
  | "lineMismatch"
  | "duplicateId"
  | "attributeRange";

export type MatchInputError = {
  code: MatchInputErrorCode;
  side: Side;
  /** The offending player, for per-player errors. */
  playerId?: string;
  message: string;
};

export type MatchInputValidation = { ok: true } | { ok: false; errors: readonly MatchInputError[] };

const countsOf = (sheet: TeamSheet) => ({
  GK: sheet.starters.filter((p) => p.position === "GK").length,
  DEF: sheet.starters.filter((p) => p.position === "DEF").length,
  MID: sheet.starters.filter((p) => p.position === "MID").length,
  FWD: sheet.starters.filter((p) => p.position === "FWD").length,
});

const validateStructure = (sheet: TeamSheet, side: Side): MatchInputError[] => {
  const errors: MatchInputError[] = [];
  const error = (code: MatchInputErrorCode, message: string) =>
    errors.push({ code, side, message });
  const { formation } = sheet;
  const counts = countsOf(sheet);
  if (sheet.starters.length !== STARTER_COUNT) {
    error("starterCount", `Expected ${STARTER_COUNT} starters, got ${sheet.starters.length}`);
  }
  if (counts.GK !== 1) error("goalkeeperCount", `Expected 1 goalkeeper, got ${counts.GK}`);
  const lineTotal = formation.defenders + formation.midfielders + formation.forwards;
  if (lineTotal !== STARTER_COUNT - 1) {
    error("formationCount", `Formation lines sum to ${lineTotal}, expected 10`);
  }
  if (
    counts.DEF !== formation.defenders ||
    counts.MID !== formation.midfielders ||
    counts.FWD !== formation.forwards
  ) {
    error(
      "lineMismatch",
      `Starters have ${counts.DEF}-${counts.MID}-${counts.FWD} outfield players, formation says ${formation.defenders}-${formation.midfielders}-${formation.forwards}`,
    );
  }
  return errors;
};

const validatePlayers = (sheet: TeamSheet, side: Side, seen: Set<string>): MatchInputError[] => {
  const errors: MatchInputError[] = [];
  for (const player of [...sheet.starters, ...sheet.bench]) {
    if (seen.has(player.id)) {
      errors.push({
        code: "duplicateId",
        side,
        playerId: player.id,
        message: `Duplicate player id ${player.id}`,
      });
    }
    seen.add(player.id);
    for (const name of ENGINE_ATTRIBUTE_NAMES) {
      const value = player.attributes[name];
      if (!(value >= MIN_ENGINE_ATTRIBUTE && value <= MAX_ENGINE_ATTRIBUTE)) {
        errors.push({
          code: "attributeRange",
          side,
          playerId: player.id,
          message: `${name} of ${player.id} is ${value}, expected ${MIN_ENGINE_ATTRIBUTE} to ${MAX_ENGINE_ATTRIBUTE}`,
        });
      }
    }
  }
  return errors;
};

/** Checks a v2 input and reports every problem; never throws. Player ids must be unique across both sides. */
export const validateMatchInputV2 = (input: MatchInputV2): MatchInputValidation => {
  const seen = new Set<string>();
  const errors = (["home", "away"] as const).flatMap((side) => [
    ...validateStructure(input[side], side),
    ...validatePlayers(input[side], side, seen),
  ]);
  return errors.length === 0 ? { ok: true } : { ok: false, errors };
};
