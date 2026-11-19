import {
  type ActionEvent,
  type ActionShotEvent,
  PITCH_LENGTH,
  PITCH_WIDTH,
  type Point,
  type SetPieceVariant,
} from "../../../engine";
import { HOLDS, type Hold } from "./constants";

const SET_PIECE_HOLDS: Partial<Record<SetPieceVariant, Hold>> = {
  corner: HOLDS.corner,
  freeKick: HOLDS.freeKick,
  penalty: HOLDS.penalty,
};

const shotHold = (event: ActionShotEvent): Hold =>
  event.outcome === "goal" ? HOLDS.goal : HOLDS.shot;

/** The hold around `event`, or undefined when it is not a key moment. Engine events have no cards; a penalty foul stands in. */
export const holdFor = (event: ActionEvent): Hold | undefined => {
  switch (event.type) {
    case "shot":
      return shotHold(event);
    case "foul":
      return event.outcome === "penalty" ? HOLDS.penaltyFoul : undefined;
    case "setPiece":
      return SET_PIECE_HOLDS[event.variant];
    default:
      return undefined;
  }
};

/** Key moments are never skipped in any mode: shots, goals, corners, free kicks, penalties and penalty fouls. */
export const isKeyMoment = (event: ActionEvent): boolean => holdFor(event) !== undefined;

const distanceToNearestGoal = (point: Point): number => {
  const dx = Math.min(point.x, PITCH_LENGTH - point.x);
  return Math.hypot(dx, point.y - PITCH_WIDTH / 2);
};

/** Metres from the nearest goal centre to either end of the action. */
export const goalDistance = (event: ActionEvent): number =>
  Math.min(distanceToNearestGoal(event.from), distanceToNearestGoal(event.to));
