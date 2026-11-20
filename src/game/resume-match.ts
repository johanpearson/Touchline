import type { ActionMatch } from "../engine";
import type { MatchSession } from "./match-session";

export type ResumeMatchResult<M extends ActionMatch = ActionMatch> =
  | { ok: true; match: M }
  | { ok: false; error: "invalid-change" };

/**
 * Advances to `time`. The engine stops at half-time; if the match went on past it, the second half
 * is started and the advance continues.
 */
const advanceThroughHalfTime = (match: ActionMatch, time: number) => {
  match.advanceTo(time);
  if (match.state.period === "halfTime" && match.state.time < time) {
    match.resume();
    match.advanceTo(time);
  }
};

/** Far beyond the longest match, so advancing to it always reaches full time. */
const BEYOND_FULL_TIME = 1_000_000;

/**
 * Plays the match to full time without a stop: a match waiting at half-time starts its second half
 * with no change. The result is the one a match watched to the end has, because the engine consumes
 * no randomness beyond its seed.
 */
export const playToFullTime = (match: ActionMatch): void =>
  advanceThroughHalfTime(match, BEYOND_FULL_TIME);

/**
 * Rebuilds a match from its session: creates it, replays the user's changes at the engine times
 * they were made and advances to the saved position. No randomness is consumed beyond the seed, so
 * the event log is the one an uninterrupted match has. A match saved at half-time stays at half-time;
 * one saved after it is resumed. `createMatch` makes the match as it was first made, so the AI
 * club's own decisions come back by themselves.
 */
export const resumeMatch = <M extends ActionMatch>(
  session: Pick<MatchSession, "changes" | "position">,
  createMatch: () => M,
): ResumeMatchResult<M> => {
  const match = createMatch();
  for (const { time, change } of session.changes) {
    advanceThroughHalfTime(match, time);
    if (!match.applyChange(change).ok) return { ok: false, error: "invalid-change" };
  }
  const { matchTime, period } = session.position;
  const pastHalfTime = period === "secondHalf" || period === "fullTime";
  if (pastHalfTime) advanceThroughHalfTime(match, matchTime);
  else match.advanceTo(matchTime);
  if (pastHalfTime && match.state.period === "halfTime") match.resume();
  return { ok: true, match };
};
