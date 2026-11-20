import { useEffect, useState } from "react";
import type { ActionMatch, Period, ZoneEvent } from "../../engine";
import {
  EMPTY_MATCH_CHANGES,
  HALF_TIME_MINUTE,
  type MatchChanges,
  type MatchEdit,
  type MatchReport,
  SHOUT_DURATION_MINUTES,
} from "../../game";
import { type ChangesSource, editorAt, type PlannedEditorChange } from "./half-time-model";
import { matchMinuteOf } from "./match-minute";
import type { MatchPlayback } from "./use-match-playback";

/** What a match restored from a session knows of the user's changes. */
export type RestoredChanges = {
  /** The substitutions, windows and shouts used so far (`replayMatchEdits`). */
  rules: MatchChanges;
  edits: readonly MatchEdit[];
  report?: MatchReport;
};

type State = { rules: MatchChanges; edits: readonly MatchEdit[]; report?: MatchReport };

type Input = {
  /** Without a source the user cannot make changes. */
  source?: ChangesSource;
  restored?: RestoredChanges;
  /** Its live energy is shown in the editor. */
  match: Pick<ActionMatch, "state">;
  /** The log as zone events up to the clock; the second half's minutes count from its half-time. */
  zoneEvents: readonly ZoneEvent[];
  matchTime: number;
  period: Period;
  playback: Pick<MatchPlayback, "applyChange" | "resume">;
};

const stoppage = (period: Period): boolean => period !== "fullTime";

/** True when the last shout has run out and no change has brought the tactics up to date since. */
export const shoutExpired = (
  rules: MatchChanges,
  edits: readonly MatchEdit[],
  minute: number,
): boolean => {
  const last = rules.shouts.at(-1);
  if (!last) return false;
  const end = last.minute + SHOUT_DURATION_MINUTES;
  return minute >= end && !edits.some((edit) => edit.minute >= end);
};

type ExpiryInput = {
  source?: ChangesSource;
  state: State;
  minute: number;
  apply: (applied: PlannedEditorChange) => boolean;
};

/** Puts the base tactics back with an empty change at the minute a shout runs out. */
const useShoutExpiry = ({ source, state, minute, apply }: ExpiryInput) => {
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs when the clock reaches a minute or the rules change
  useEffect(() => {
    if (!source || !shoutExpired(state.rules, state.edits, minute)) return;
    const planned = source(state.rules).plan({ minute });
    if (planned.ok) apply({ ...planned, request: { minute } });
  }, [minute, state.rules]);
};

/**
 * The user's changes during the match: the rules state, the edits for the session and the report of
 * minutes. `editor` is built for the current stoppage (half-time or the paused minute); `apply`
 * plays an accepted change into the match, and `startSecondHalf` does so at half-time and resumes.
 * A shout that has run out is followed by an empty change, which puts the base tactics back.
 */
export const useMatchChanges = ({
  source,
  restored,
  match,
  zoneEvents,
  matchTime,
  period,
  playback,
}: Input) => {
  const [state, setState] = useState<State>(
    () => restored ?? { rules: EMPTY_MATCH_CHANGES, edits: [] },
  );
  const halfTime = period === "halfTime";
  const minute = halfTime ? HALF_TIME_MINUTE : matchMinuteOf(matchTime, zoneEvents);
  const editor =
    source && stoppage(period)
      ? editorAt(source(state.rules), { minute, halfTime, energy: match.state.energy })
      : undefined;

  const apply = (applied: PlannedEditorChange): boolean => {
    const time = playback.applyChange(applied.change);
    if (time === undefined) return false;
    const edit: MatchEdit = { ...applied.request, time };
    setState((prev) => ({
      rules: applied.changes,
      edits: [...prev.edits, edit],
      report: applied.report,
    }));
    return true;
  };

  useShoutExpiry({ source, state, minute, apply });

  const startSecondHalf = (applied?: PlannedEditorChange) => {
    if (applied) apply(applied);
    playback.resume();
  };
  return {
    editor,
    edits: state.edits,
    rules: state.rules,
    report: state.report,
    apply,
    startSecondHalf,
  };
};
