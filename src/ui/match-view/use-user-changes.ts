import { useMemo } from "react";
import type { CommentaryLine } from "../../commentary";
import type { MatchInput, Period, Side, TimedActionMatchChange, ZoneEvent } from "../../engine";
import type { MatchEdit } from "../../game";
import { useI18n } from "../i18n-provider";
import { changeLines } from "./change-lines";
import type { ChangesSource } from "./half-time-model";
import type { MatchProgress, ProgressMoment, RestoredMatch } from "./match-progress";
import { useMatchChanges } from "./use-match-changes";
import type { MatchPlayback } from "./use-match-playback";
import { useMatchProgress } from "./use-match-progress";

/** An edit the user asked for, as opposed to the empty one that puts the tactics back when a shout ends. */
const isVisibleChange = (edit: MatchEdit): boolean =>
  (edit.substitutions?.length ?? 0) > 0 || edit.tactics !== undefined || edit.shout !== undefined;

type LinesInput = {
  commentary: readonly CommentaryLine[];
  edits: readonly MatchEdit[];
  players: Readonly<Record<string, string>>;
  userSide: Side;
  input: MatchInput;
};

/** The commentary with a line for each change the user made, in match order. */
const useChangeLines = ({ commentary, edits, players, userSide, input }: LinesInput) => {
  const { t, locale } = useI18n();
  // biome-ignore lint/correctness/useExhaustiveDependencies: `t` follows `locale`
  return useMemo(() => {
    if (edits.length === 0) return commentary;
    const own = changeLines(edits, {
      t,
      names: players,
      side: userSide,
      startTactics: input[userSide].tactics,
    });
    // Sorting is stable: a change goes after the commentary of the same moment.
    return [...commentary, ...own].sort((a, b) => a.time - b.time);
  }, [commentary, edits, players, userSide, input, locale]);
};

type Input = Omit<LinesInput, "edits"> & {
  changesSource?: ChangesSource;
  restored?: RestoredMatch;
  onProgress?: (progress: MatchProgress, moment: ProgressMoment) => void;
  zoneEvents: readonly ZoneEvent[];
  matchTime: number;
  period: Period;
  playback: Pick<
    MatchPlayback,
    "applyChange" | "resume" | "paused" | "mode" | "setPaused" | "energy"
  > & {
    userChanges: readonly TimedActionMatchChange[];
    userChangeCount: number;
  };
};

/**
 * What the match screen keeps of the user's changes: the editor of the current stoppage, the edits
 * and report, the progress reports for the session, the commentary with the change lines and the
 * times of the changes for the chart.
 */
export const useUserChanges = (input: Input) => {
  const { changesSource, restored, onProgress, zoneEvents, matchTime, period, playback } = input;
  const changes = useMatchChanges({
    source: changesSource,
    restored,
    zoneEvents,
    matchTime,
    period,
    playback,
  });
  const { edits, report } = changes;
  const progress = useMatchProgress({
    restored,
    edits,
    report,
    onProgress,
    playback: { ...playback, matchTime, period },
  });
  const lines = useChangeLines({ ...input, edits });
  const changeTimes = useMemo(
    () => edits.filter(isVisibleChange).map((edit) => edit.time),
    [edits],
  );
  return { ...changes, ...progress, lines, changeTimes };
};
