import type { ActionMatchChange, TeamTactics } from "../engine";
import type { Career } from "./career";
import {
  checkSubstitutions,
  MAX_SUBSTITUTION_WINDOWS,
  MAX_SUBSTITUTIONS,
  type SubstitutionError,
} from "./check-substitutions";
import type { Fixture } from "./generate-fixtures";
import { liveSquadAfter, minutesOnPitch, type SubstitutionRecord } from "./live-squad";
import type { Player } from "./player";
import { FITNESS_MATCH_MINUTES } from "./player-condition";
import {
  checkShout,
  type ShoutError,
  type ShoutKind,
  type ShoutRecord,
  shoutFatigue,
  tacticsAtMinute,
} from "./shouts";
import type { PlayerPosition } from "./squad-player";
import { toEnginePlayers } from "./to-engine-players";
import type { MatchReport } from "./update-condition";
import { userMatchSide } from "./user-match-side";

/** The minute of the half-time window. */
export { MAX_SUBSTITUTION_WINDOWS, MAX_SUBSTITUTIONS };

export const HALF_TIME_MINUTE = FITNESS_MATCH_MINUTES / 2;

/** Everything the user has changed so far in a match; start from `EMPTY_MATCH_CHANGES`. */
export type MatchChanges = {
  substitutions: readonly SubstitutionRecord[];
  shouts: readonly ShoutRecord[];
  /** The tactics the user last set; the saved plan's when absent. Shouts act on top of them. */
  tactics?: TeamTactics;
};

export const EMPTY_MATCH_CHANGES: MatchChanges = { substitutions: [], shouts: [] };

/** One request: substitutions, new base tactics and/or a shout, all at the same moment. */
export type MatchChange = {
  /** The match minute of the change (0 up to the end). */
  minute: number;
  substitutions?: readonly { off: string; on: string }[];
  tactics?: TeamTactics;
  shout?: ShoutKind;
  /** True for the half-time window (it does not count as one of the three windows). */
  halfTime?: boolean;
};

export type PlanChangeError =
  | "minute-out-of-range"
  | "change-in-the-past"
  | SubstitutionError
  | ShoutError;

export type PlannedChange = {
  ok: true;
  /** The engine change for the user's side: the eleven on the pitch and the tactics now in force. */
  change: ActionMatchChange;
  /** Minutes on the pitch (and shout fatigue) if the match ended at 90 minutes; for `completeMatchday`. */
  report: MatchReport;
  /** Pass this to the next call. */
  changes: MatchChanges;
};

export type PlanChangeResult = PlannedChange | { ok: false; error: PlanChangeError };

/** Rules a caller can add; half-time keeps the old same-position rule until its panel allows more. */
export type PlanChangeOptions = {
  /** The `changes` of the last planned change; none when absent. */
  previous?: MatchChanges;
  requireSamePosition?: boolean;
};

const fail = (error: PlanChangeError): PlanChangeResult => ({ ok: false, error });

const checkMoment = (minute: number, changes: MatchChanges): PlanChangeError | undefined => {
  if (!Number.isFinite(minute) || minute < 0) return "minute-out-of-range";
  const last = [...changes.substitutions, ...changes.shouts].reduce(
    (latest, r) => Math.max(latest, r.minute),
    0,
  );
  return minute < last ? "change-in-the-past" : undefined;
};

const recordsOf = (
  substitutions: readonly { off: string; on: string }[],
  minute: number,
  halfTime: boolean,
): SubstitutionRecord[] => substitutions.map(({ off, on }) => ({ minute, halfTime, off, on }));

const reportOf = (
  career: Career,
  squadPlayers: readonly Player[],
  changes: MatchChanges,
  base: TeamTactics,
): MatchReport => {
  const live = liveSquadAfter(career.squadPlan, changes.substitutions, () => "MID");
  const minutes: Record<string, number> = {};
  const fatigue: Record<string, number> = {};
  for (const { id } of squadPlayers) {
    minutes[id] = minutesOnPitch(id, career.squadPlan, live);
    const from = career.squadPlan.starters.includes(id) ? 0 : (live.cameOn[id] ?? 0);
    const to = from + minutes[id];
    const tired = shoutFatigue(base, changes.shouts, from, to);
    if (tired > 0) fatigue[id] = tired;
  }
  return { minutes, fatigue };
};

/**
 * Plans a change at `atMinute` (a match minute, 0 to the end): substitutions (a bench player replaces a
 * pitch player of any position; at most 5 in all, in at most 3 windows plus half-time; a player
 * substituted off never returns), new base tactics and/or one shout (see `shouts.ts`). `options.previous` is the
 * `changes` of the last planned change. An empty change is valid and only brings the tactics up to date,
 * for example to end a shout. The career is not changed and nothing here uses randomness. The
 * returned engine change has the eleven on the pitch at the current condition, each rated at the
 * position they play (`attributesAtPosition`), and the tactics in force at `atMinute`.
 *
 * Expected failures are returned; a fixture without the user's club is a programmer error and throws
 * a `RangeError`.
 */
export const planChange = (
  career: Career,
  fixture: Fixture,
  change: MatchChange,
  options: PlanChangeOptions = {},
): PlanChangeResult => {
  const atMinute = change.minute;
  const previous = options.previous ?? EMPTY_MATCH_CHANGES;
  const { side, squad } = userMatchSide(career, fixture);
  const positions = new Map(squad.map((p) => [p.id, p.position]));
  const natural = (id: string): PlayerPosition => positions.get(id) ?? "MID";
  const momentError = checkMoment(atMinute, previous);
  if (momentError) return fail(momentError);

  const before = liveSquadAfter(career.squadPlan, previous.substitutions, natural);
  const substitutions = change.substitutions ?? [];
  const halfTime = change.halfTime ?? false;
  const subError = checkSubstitutions({
    substitutions,
    minute: atMinute,
    halfTime,
    changes: previous,
    onPitch: before.starters,
    bench: before.bench,
    position: (id) => before.played[id] ?? natural(id),
    samePosition: options.requireSamePosition ?? false,
  });
  if (subError) return fail(subError);

  const base = change.tactics ?? previous.tactics ?? career.squadPlan.tactics;
  const shoutError = change.shout && checkShout(base, previous.shouts, change.shout, atMinute);
  if (shoutError) return fail(shoutError);

  const changes: MatchChanges = {
    substitutions: [...previous.substitutions, ...recordsOf(substitutions, atMinute, halfTime)],
    shouts: change.shout
      ? [...previous.shouts, { kind: change.shout, minute: atMinute }]
      : previous.shouts,
    tactics: change.tactics ?? previous.tactics,
  };
  const live = liveSquadAfter(career.squadPlan, changes.substitutions, natural);
  const lineup = toEnginePlayers(
    { formation: career.squadPlan.formation, starters: live.starters, bench: live.bench },
    squad,
    career.condition,
    live.played,
  );
  const tactics = { ...tacticsAtMinute(base, changes.shouts, atMinute) };
  return {
    ok: true,
    change: { side, lineup, tactics },
    report: reportOf(career, squad, changes, base),
    changes,
  };
};
