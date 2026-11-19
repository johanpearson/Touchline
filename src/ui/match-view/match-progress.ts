import type { Period, TimedActionMatchChange } from "../../engine";
import type { MatchReport } from "../../game";
import type { PlaybackMode } from "./director";

/** What a match screen reports so the match can be resumed: everything the session keeps of it. */
export type MatchProgress = {
  /** The user's changes with the engine time they were applied at. */
  changes: readonly TimedActionMatchChange[];
  mode: PlaybackMode;
  /** The report of minutes when the user made changes at half-time. */
  report?: MatchReport;
  /** The match time at the director's clock and the period then. */
  position: { matchTime: number; period: Period };
};

/**
 * How urgent a report is: `now` for changes, pauses, mode and period changes (written at once),
 * `tick` for the running clock (written at most every few seconds).
 */
export type ProgressMoment = "now" | "tick";

/** A match restored from a session: it shows paused at `position` with the same changes and report. */
export type RestoredMatch = Pick<MatchProgress, "changes" | "mode" | "report"> & {
  matchTime: number;
};
