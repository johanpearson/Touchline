import { useEffect, useRef, useState } from "react";
import type { ActionMatchChange, Period, TimedActionMatchChange } from "../../engine";
import type { MatchReport } from "../../game";
import type { AppliedHalfTimePlan } from "./half-time-changes";
import type { MatchProgress, ProgressMoment, RestoredMatch } from "./match-progress";
import type { MatchPlayback } from "./use-match-playback";

type Input = {
  restored?: RestoredMatch;
  onProgress?: (progress: MatchProgress, moment: ProgressMoment) => void;
  playback: Pick<MatchPlayback, "paused" | "mode" | "setPaused" | "matchTime"> & {
    period: Period;
    userChanges: readonly TimedActionMatchChange[];
    userChangeCount: number;
  };
  resume: (change?: ActionMatchChange) => void;
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

/**
 * What the match screen keeps for resuming: the half-time report, whether a restored match still
 * waits to be started, and the progress reports. `startSecondHalf` applies the user's half-time plan.
 */
export const useMatchProgress = ({ restored, onProgress, playback, resume }: Input) => {
  const [report, setReport] = useState<MatchReport | undefined>(restored?.report);
  const [awaitingResume, setAwaitingResume] = useState(restored !== undefined);
  useProgressReports(
    onProgress,
    {
      changes: playback.userChanges,
      mode: playback.mode,
      report,
      position: { matchTime: playback.matchTime, period: playback.period },
    },
    playback.userChangeCount,
    playback.paused,
  );
  const startSecondHalf = (plan?: AppliedHalfTimePlan) => {
    setReport(plan?.report);
    resume(plan?.change);
  };
  const setPaused = (paused: boolean) => {
    if (!paused) setAwaitingResume(false);
    playback.setPaused(paused);
  };
  return { report, awaitingResume, startSecondHalf, setPaused };
};
