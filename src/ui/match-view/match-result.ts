import type { ActionEvent, ActionMatchState, Side, ZoneEvent } from "../../engine";
import { formatMatchMinute } from "./match-minute";

export type MatchOutcome = "win" | "draw" | "defeat";

/** How the match ended for the user's side. */
export const matchOutcome = (score: ActionMatchState["score"], userSide: Side): MatchOutcome => {
  const own = score[userSide];
  const other = score[userSide === "home" ? "away" : "home"];
  return own > other ? "win" : own === other ? "draw" : "defeat";
};

export type GoalLine = {
  side: Side;
  /** Seconds of match time. */
  time: number;
  name: string;
  /** The minute label, such as `12’` or `45+2’`. */
  minute: string;
};

/**
 * The goals of a match in the order they were scored, each with the scorer's name and minute.
 * `zoneEvents` carries the half-time event the minute label needs.
 */
export const goalsOf = (
  events: readonly ActionEvent[],
  zoneEvents: readonly ZoneEvent[],
  names: Readonly<Record<string, string>>,
): GoalLine[] =>
  events
    .flatMap((event) =>
      event.type === "shot" && event.outcome === "goal"
        ? [
            {
              side: event.team,
              time: event.time,
              name: names[event.actor] ?? event.actor,
              minute: formatMatchMinute(event.time, zoneEvents),
            },
          ]
        : [],
    )
    .sort((a, b) => a.time - b.time);
