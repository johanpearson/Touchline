import type { ActionMatchChange, Side, TeamTactics } from "../engine";
import type { Career } from "./career";
import type { Fixture } from "./generate-fixtures";
import type { Lineup } from "./lineup";
import { FITNESS_MATCH_MINUTES } from "./player-condition";
import { clubSquad } from "./squad-plan";
import { toEnginePlayers } from "./to-engine-players";
import type { MatchReport } from "./update-condition";

/** Most substitutions in the one half-time window. */
export const MAX_SUBSTITUTIONS = 5;

const HALF_MINUTES = FITNESS_MATCH_MINUTES / 2;

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

const hasDuplicates = (ids: readonly string[]): boolean => new Set(ids).size !== ids.length;

const checkSubstitutions = (
  career: Career,
  substitutions: HalfTimeChanges["substitutions"],
  positionOf: (id: string) => string | undefined,
): HalfTimeError | undefined => {
  const { starters, bench } = career.squadPlan;
  if (substitutions.length > MAX_SUBSTITUTIONS) return "too-many-substitutions";
  if (
    hasDuplicates(substitutions.map((s) => s.off)) ||
    hasDuplicates(substitutions.map((s) => s.on))
  ) {
    return "duplicate-substitution";
  }
  for (const { off, on } of substitutions) {
    if (!starters.includes(off)) return "player-not-on-pitch";
    if (!bench.includes(on)) return "player-not-on-bench";
    if (positionOf(off) !== positionOf(on)) return "position-mismatch";
  }
  return undefined;
};

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

const minutesOf = (
  plan: Lineup,
  substitutions: HalfTimeChanges["substitutions"],
): Record<string, number> => {
  const minutes: Record<string, number> = {};
  for (const id of plan.starters) minutes[id] = FITNESS_MATCH_MINUTES;
  for (const id of plan.bench) minutes[id] = 0;
  for (const { off, on } of substitutions) {
    minutes[off] = HALF_MINUTES;
    minutes[on] = HALF_MINUTES;
  }
  return minutes;
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
  const side: Side | undefined =
    fixture.homeClubId === career.userClubId
      ? "home"
      : fixture.awayClubId === career.userClubId
        ? "away"
        : undefined;
  if (!side) throw new RangeError(`The user's club does not play fixture ${fixture.id}`);
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  if (!club) throw new RangeError(`Unknown user club: ${career.userClubId}`);
  const squad = clubSquad(club, career.league.players);
  const positions = new Map(squad.map((p) => [p.id, p.position]));

  const error = checkSubstitutions(career, changes.substitutions, (id) => positions.get(id));
  if (error) return fail(error);

  const { tactics: plannedTactics, ...plan } = career.squadPlan;
  const lineupAfter = applySubstitutions(plan, changes.substitutions);
  const tactics = { ...(changes.tactics ?? plannedTactics) };
  const report = { minutes: minutesOf(plan, changes.substitutions) };
  const lineup = toEnginePlayers(lineupAfter, squad, career.condition);
  return { ok: true, change: { side, lineup, tactics }, report, lineupAfter };
};
