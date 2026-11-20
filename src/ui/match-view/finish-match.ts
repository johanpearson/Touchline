import type {
  ActionMatch,
  ActionMatchState,
  EngineVersion,
  Side,
  TimedActionMatchChange,
} from "../../engine";
import {
  type CoachedMatch,
  goalScorersOf,
  type MatchReport,
  playToFullTime,
  resumeMatch,
} from "../../game";

/** What `onContinue` gets at full time. */
export type FinishedMatch = {
  score: ActionMatchState["score"];
  /** Player ids of the scorers in the order the goals were scored. */
  scorers: string[];
  engineVersion: EngineVersion;
  /** Energy (0 to 100) each player who played ended the match with. */
  energy: Readonly<Record<string, number>>;
};

/** The result of a match that is over. */
export const finishedMatchOf = (
  match: ActionMatch,
  engineVersion: EngineVersion,
): FinishedMatch => ({
  score: match.state.score,
  scorers: goalScorersOf(match.events),
  engineVersion,
  energy: match.state.energy,
});

/** The user's report with what the AI opponent played; the user's report is absent when nothing was changed. */
export const withOpponent = (
  report: MatchReport | undefined,
  match: ActionMatch | CoachedMatch,
  userSide: Side,
): MatchReport | undefined => {
  if (!report || !("aiReports" in match)) return report;
  return { ...report, opponent: match.aiReports()[userSide === "home" ? "away" : "home"] };
};

export type SimulateRest = {
  /** Makes the match as it was first made, from kick-off. */
  createMatch: () => ActionMatch | CoachedMatch;
  /** The user's changes with the engine time they were applied at. */
  changes: readonly TimedActionMatchChange[];
  engineVersion: EngineVersion;
  userSide: Side;
  /** The report of minutes when the user made changes at half-time. */
  report?: MatchReport;
};

/**
 * Plays the match to full time without playback: replays the user's changes at the times they were
 * made, then goes on to the end. It is the match the user would have watched, because the engine is
 * deterministic. Returns null when a change is refused, which a replay of changes the engine
 * accepted never does.
 */
export const simulateRest = (
  request: SimulateRest,
): { finished: FinishedMatch; report?: MatchReport } | null => {
  const replayed = resumeMatch(
    { changes: [...request.changes], position: { matchTime: 0, period: "firstHalf" } },
    request.createMatch,
  );
  if (!replayed.ok) return null;
  const { match } = replayed;
  playToFullTime(match);
  const report = withOpponent(request.report, match, request.userSide);
  return {
    finished: finishedMatchOf(match, request.engineVersion),
    ...(report ? { report } : {}),
  };
};
