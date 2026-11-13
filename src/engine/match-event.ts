import type { Period, PitchPosition, Side } from "./match-state";

/** Fields shared by every event. */
type EventBase = {
  /** Match time in seconds. */
  time: number;
  /** The team the event belongs to (the team in possession, or the scorer, etc.). */
  team: Side;
  position: PitchPosition;
  /** Strength of the event, 0..1, used by the match view for bump height. */
  intensity: number;
};

/** How a shot ended. */
export type ShotOutcome = "goal" | "saved" | "missed" | "blocked";

export type KickoffEvent = EventBase & { type: "kickoff" };
export type ProgressEvent = EventBase & { type: "progress" };
export type TurnoverEvent = EventBase & { type: "turnover" };
export type ShotEvent = EventBase & {
  type: "shot";
  /** Expected goals value of the shot, 0..1. */
  xg: number;
  outcome: ShotOutcome;
};
export type GoalEvent = EventBase & { type: "goal"; xg: number };
export type CornerEvent = EventBase & { type: "corner" };
/** `team` is the team that was fouled. */
export type FoulEvent = EventBase & { type: "foul" };
export type PeriodChangeEvent = EventBase & {
  type: "periodChange";
  /** The period that starts at this event. */
  period: Period;
};

/** One thing that happened in a match. The ordered event log drives the match view, commentary and stats. */
export type MatchEvent =
  | KickoffEvent
  | ProgressEvent
  | TurnoverEvent
  | ShotEvent
  | GoalEvent
  | CornerEvent
  | FoulEvent
  | PeriodChangeEvent;

export type MatchEventType = MatchEvent["type"];
