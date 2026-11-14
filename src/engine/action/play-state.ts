import type { Side } from "../match-state";
import type { ActionEventType, SetPieceVariant } from "./action-event";
import type { Point } from "./pitch-metres";

/** A dead ball waiting to be taken. */
export type PendingRestart = { team: Side; variant: SetPieceVariant; position: Point };

/** Everything the loop carries from one action to the next. */
export type PlayState = {
  possession: Side;
  /** Slot of the player on the ball; absent when a restart or a loose ball decides it. */
  slot?: number;
  ball: Point;
  restart?: PendingRestart;
  /** The next action is a penalty kick by the player on the ball. */
  penalty?: boolean;
  lastType: ActionEventType | "none";
  actionsSinceTurnover: number;
  score: Record<Side, number>;
};
