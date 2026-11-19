import type { ActionMatch } from "../engine";
import type { MatchSession } from "./match-session";

export type ResumeMatchResult =
  | { ok: true; match: ActionMatch }
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

/**
 * Rebuilds a match from its session: creates it, replays the user's changes at the engine times
 * they were made and advances to the saved position. No randomness is consumed beyond the seed, so
 * the event log is the one an uninterrupted match has. A match saved at half-time stays at half-time;
 * one saved after it is resumed. `createMatch` makes the match as it was first made, so the AI
 * club's own decisions come back by themselves.
 */
export const resumeMatch = (
  session: Pick<MatchSession, "changes" | "position">,
  createMatch: () => ActionMatch,
): ResumeMatchResult => {
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
