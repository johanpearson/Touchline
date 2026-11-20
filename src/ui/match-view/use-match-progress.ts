import { useEffect, useRef, useState } from "react";
import type { Period, TimedActionMatchChange } from "../../engine";
import type { MatchEdit, MatchReport } from "../../game";
import type { MatchProgress, ProgressMoment, RestoredMatch } from "./match-progress";
import type { MatchPlayback } from "./use-match-playback";

type Input = {
  restored?: RestoredMatch;
  /** The user's edits and report of minutes so far (`useMatchChanges`). */
  edits: readonly MatchEdit[];
  report: MatchReport | undefined;
  onProgress?: (progress: MatchProgress, moment: ProgressMoment) => void;
  playback: Pick<MatchPlayback, "paused" | "mode" | "setPaused" | "matchTime"> & {
    period: Period;
    userChanges: readonly TimedActionMatchChange[];
    userChangeCount: number;
  };
};

/**
 * Reports the progress: at once when the user pauses or plays, changes the mode or a change is
 * applied, or the period changes (and on mount), and on every clock tick for the writer to throttle.
 * The latest progress is reported once more when the screen goes away.
 */
const useProgressReports = (
  onProgress: Input["onProgress"],
  progress: MatchProgress,
  changeCount: number,
  paused: boolean,
) => {
  const latest = useRef(progress);
  latest.current = progress;
  const report = useRef(onProgress);
  report.current = onProgress;
  const { period, matchTime } = progress.position;
  // biome-ignore lint/correctness/useExhaustiveDependencies: these are the moments that count
  useEffect(
    () => report.current?.(latest.current, "now"),
    [changeCount, paused, progress.mode, progress.report, period],
  );
  // biome-ignore lint/correctness/useExhaustiveDependencies: every clock tick offers the position
  useEffect(() => report.current?.(latest.current, "tick"), [matchTime]);
  useEffect(() => () => report.current?.(latest.current, "now"), []);
};

/** What the match screen keeps for resuming: whether a restored match still waits to be started, and the progress reports. */
export const useMatchProgress = ({ restored, edits, report, onProgress, playback }: Input) => {
  const [awaitingResume, setAwaitingResume] = useState(restored !== undefined);
  useProgressReports(
    onProgress,
    {
      changes: playback.userChanges,
      edits,
      mode: playback.mode,
      report,
      position: { matchTime: playback.matchTime, period: playback.period },
    },
    playback.userChangeCount,
    playback.paused,
  );
  const setPaused = (paused: boolean) => {
    if (!paused) setAwaitingResume(false);
    playback.setPaused(paused);
  };
  return { awaitingResume, setPaused };
};
