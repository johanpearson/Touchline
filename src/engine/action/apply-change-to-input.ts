import type { ActionMatchChange } from "./action-match";
import type { MatchInputV2 } from "./match-input-v2";
import {
  type MatchInputError,
  type MatchInputValidation,
  validateLineup,
} from "./validate-match-input-v2";

export type ApplyChangeResult =
  | { ok: true; input: MatchInputV2 }
  | { ok: false; errors: readonly MatchInputError[] };

/**
 * Returns the input with a change applied, or the validation errors (the input is never mutated).
 * New starters leave the bench so player ids stay unique within the sheet.
 */
export const applyChangeToInput = (
  input: MatchInputV2,
  change: ActionMatchChange,
): ApplyChangeResult => {
  const other = input[change.side === "home" ? "away" : "home"];
  const sheet = input[change.side];
  const { lineup, tactics } = change;
  if (lineup !== undefined) {
    const otherIds = new Set([...other.starters, ...other.bench].map((p) => p.id));
    const validation: MatchInputValidation = validateLineup(sheet, lineup, change.side, otherIds);
    if (!validation.ok) return validation;
  }
  const starterIds = new Set((lineup ?? []).map((p) => p.id));
  return {
    ok: true,
    input: {
      ...input,
      [change.side]: {
        ...sheet,
        starters: lineup ?? sheet.starters,
        bench: sheet.bench.filter((p) => !starterIds.has(p.id)),
        tactics: tactics ?? sheet.tactics,
      },
    },
  };
};
