import type { Side } from "../match-state";
import type { ActionEventType } from "./action-event";
import type { Point } from "./pitch-metres";
import { PITCH_LENGTH } from "./pitch-metres";
import { THIRD, TRANSITION_ACTIONS } from "./shape-constants";

import type { TeamPhase } from "./team-phase-name";

export type { TeamPhase };

/** What happened last: its type and how many actions ago the ball last changed side (0 = just now). */
export type LastAction = {
  type: ActionEventType | "none";
  actionsSinceTurnover: number;
};

/** The phase of play for `side`: set pieces and turnovers first, then possession and the ball's third. */
export const phaseOf = (
  side: Side,
  possession: Side,
  ball: Point,
  lastAction: LastAction,
): TeamPhase => {
  if (lastAction.type === "setPiece") return "setPiece";
  if (lastAction.actionsSinceTurnover < TRANSITION_ACTIONS) return "transition";
  if (possession !== side) return "defending";
  const depth = side === "home" ? ball.x : PITCH_LENGTH - ball.x;
  if (depth < THIRD) return "buildUp";
  if (depth < 2 * THIRD) return "progression";
  return "attack";
};
