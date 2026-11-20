import type { ActionMatchChange } from "./action-match";
import type { MatchInput } from "./match-input";
import {
  type MatchInputError,
  type MatchInputValidation,
  validateLineup,
} from "./validate-match-input";

export type ApplyChangeResult =
  | { ok: true; input: MatchInput }
  | { ok: false; errors: readonly MatchInputError[] };

/**
 * Returns the input with a change applied, or the validation errors (the input is never mutated).
 * New starters leave the bench so player ids stay unique within the sheet. A new `formation` is checked
 * against the lineup (or the current starters when none is given) and replaces the sheet's formation.
 */
export const applyChangeToInput = (
  input: MatchInput,
  change: ActionMatchChange,
): ApplyChangeResult => {
  const other = input[change.side === "home" ? "away" : "home"];
  const sheet = input[change.side];
  const { lineup, tactics, formation } = change;
  if (lineup !== undefined || formation !== undefined) {
    const otherIds = new Set([...other.starters, ...other.bench].map((p) => p.id));
    const validation: MatchInputValidation = validateLineup(
      { ...sheet, formation: formation ?? sheet.formation },
      lineup ?? sheet.starters,
      change.side,
      otherIds,
    );
    if (!validation.ok) return validation;
  }
  const starterIds = new Set((lineup ?? []).map((p) => p.id));
  return {
    ok: true,
    input: {
      ...input,
      [change.side]: {
        ...sheet,
        formation: formation ?? sheet.formation,
        starters: lineup ?? sheet.starters,
        bench: sheet.bench.filter((p) => !starterIds.has(p.id)),
        tactics: tactics ?? sheet.tactics,
      },
    },
  };
};
