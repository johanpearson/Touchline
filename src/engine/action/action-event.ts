import type { Period, Side } from "../match-state";
import type { Point } from "./pitch-metres";

export const SNAPSHOT_PLAYER_COUNT = 22;

/** Positions at the moment of an action: the ball and 22 players (home slots 0 to 10, then away 11 to 21). */
export type PositionSnapshot = {
  ball: Point;
  players: readonly Point[];
};

export type PassVariant = "short" | "long" | "through" | "cross";
export type PassOutcome = "complete" | "intercepted" | "outOfPlay" | "incomplete";
export type CarryOutcome = "kept" | "tackled" | "outOfPlay";
export type ShotOutcome = "goal" | "saved" | "blocked" | "missed" | "woodwork";
export type TackleOutcome = "won" | "lost" | "foul";
export type ClearanceOutcome = "kept" | "outOfPlay";
export type FoulOutcome = "freeKick" | "penalty";
export type SetPieceVariant =
  | "kickoff"
  | "throwIn"
  | "goalKick"
  | "corner"
  | "freeKick"
  | "penalty";

/** Fields every action event has. Coordinates are metres. */
type ActionEventBase = {
  /** Match time in seconds, one decimal. */
  time: number;
  period: Period;
  /** The side performing the action. */
  team: Side;
  from: Point;
  to: Point;
  /** How heavily the actor is pressed, 0..1. */
  pressure: number;
  /** Positions at the moment of the action; absent when the match was created with `detail: "fast"`. */
  snapshot?: PositionSnapshot;
};

/** Fields of events driven by a player. Ids are the opaque `EnginePlayer.id`. */
type PlayerAction = ActionEventBase & {
  actor: string;
  /** The player who challenged the actor, or the keeper. */
  opponent?: string;
};

export type PassEvent = PlayerAction & {
  type: "pass";
  variant: PassVariant;
  outcome: PassOutcome;
  /** The intended receiver. */
  target: string;
  /** True when the pass leads to a shot. */
  keyPass?: boolean;
};
export type CarryEvent = PlayerAction & { type: "carry"; outcome: CarryOutcome };
export type ShotEvent = PlayerAction & { type: "shot"; outcome: ShotOutcome; xg: number };
/** `team` is the tackler's side. */
export type TackleEvent = PlayerAction & { type: "tackle"; outcome: TackleOutcome };
export type InterceptionEvent = PlayerAction & { type: "interception"; outcome: "won" };
export type ClearanceEvent = PlayerAction & { type: "clearance"; outcome: ClearanceOutcome };
/** `team` is the fouled side and `opponent` the offender. */
export type FoulEvent = PlayerAction & { type: "foul"; outcome: FoulOutcome };
export type SetPieceEvent = PlayerAction & {
  type: "setPiece";
  variant: SetPieceVariant;
  outcome: "taken";
};
export type PeriodChangeEvent = ActionEventBase & { type: "periodChange" };

/** One thing that happened in an action-engine match. */
export type ActionEvent =
  | PassEvent
  | CarryEvent
  | ShotEvent
  | TackleEvent
  | InterceptionEvent
  | ClearanceEvent
  | FoulEvent
  | SetPieceEvent
  | PeriodChangeEvent;

export type ActionEventType = ActionEvent["type"];
