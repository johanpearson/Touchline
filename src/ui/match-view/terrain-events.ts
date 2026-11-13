import type { MatchEvent, MatchState } from "../../engine";

const isSecondHalfStart = (event: MatchEvent): boolean =>
  event.type === "periodChange" && event.period === "secondHalf";

/**
 * The part of the event log the terrain should see. It is blank at half-time (so the pitch
 * resets while the match is paused) and starts from the second-half kickoff afterwards.
 */
export const terrainEvents = (
  events: readonly MatchEvent[],
  period: MatchState["period"],
): readonly MatchEvent[] => {
  if (period === "halfTime") return [];
  const start = events.findIndex(isSecondHalfStart);
  return start === -1 ? events : events.slice(start);
};
