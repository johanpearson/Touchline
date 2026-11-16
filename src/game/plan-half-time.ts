import type { ActionMatchChange, TeamTactics } from "../engine";
import type { Career } from "./career";
import type { Fixture } from "./generate-fixtures";
import type { Lineup } from "./lineup";
import { EMPTY_MATCH_CHANGES, HALF_TIME_MINUTE, planChange } from "./plan-change";
import type { MatchReport } from "./update-condition";

/** What the user changes at half-time: substitutions (bench player on, pitch player off) and tactics. */
export type HalfTimeChanges = {
  substitutions: { off: string; on: string }[];
  tactics?: TeamTactics;
};

export type HalfTimeError =
  | "too-many-substitutions"
  | "player-not-on-pitch"
  | "player-not-on-bench"
  | "position-mismatch"
  | "duplicate-substitution";

/** A valid plan: the engine `change` for the user's side, the minutes played and the lineup after it. */
export type AppliedHalfTime = {
  ok: true;
  change: ActionMatchChange;
  report: MatchReport;
  lineupAfter: Lineup;
};

export type HalfTimePlan = AppliedHalfTime | { ok: false; error: HalfTimeError };

const fail = (error: HalfTimeError): HalfTimePlan => ({ ok: false, error });

/** The player coming on takes the starter's place; the player going off takes the bench slot. */
const applySubstitutions = (
  plan: Lineup,
  substitutions: HalfTimeChanges["substitutions"],
): Lineup => {
  const swap = (ids: readonly string[], from: "off" | "on"): string[] =>
    ids.map((id) => {
      const sub = substitutions.find((s) => s[from] === id);
      return sub ? sub[from === "off" ? "on" : "off"] : id;
    });
  return {
    formation: plan.formation,
    starters: swap(plan.starters, "off"),
    bench: swap(plan.bench, "on"),
  };
};

/**
 * Plans the user's half-time: validates up to five substitutions (a bench player replaces a pitch
 * player of the same position, nobody twice, no formation change) and an optional tactics change,
 * and returns the engine `change` (the new `EnginePlayer`s in slot order at the current condition,
 * plus tactics), the `report` of minutes for `completeMatchday`, and `lineupAfter` (substituted-off
 * players move to the bench). The career is not changed. Expected failures are
 * returned; a fixture without the user's club is a programmer error and throws a `RangeError`.
 */
export const planHalfTime = (
  career: Career,
  fixture: Fixture,
  changes: HalfTimeChanges,
): HalfTimePlan => {
  const planned = planChange(
    career,
    fixture,
    HALF_TIME_MINUTE,
    { substitutions: changes.substitutions, tactics: changes.tactics, halfTime: true },
    EMPTY_MATCH_CHANGES,
    { requireSamePosition: true },
  );
  if (!planned.ok) return fail(planned.error as HalfTimeError);
  const { formation, starters, bench } = career.squadPlan;
  return {
    ok: true,
    change: planned.change,
    report: { minutes: planned.report.minutes },
    lineupAfter: applySubstitutions({ formation, starters, bench }, changes.substitutions),
  };
};
