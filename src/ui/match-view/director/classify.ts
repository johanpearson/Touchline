import { type ActionEvent, PITCH_LENGTH, PITCH_WIDTH, type Point } from "../../../engine";
import { HOLDS, type Hold } from "./constants";

/** The hold around `event`, or undefined when it is not a key moment. Engine events have no cards; a penalty foul stands in. */
export const holdFor = (event: ActionEvent): Hold | undefined => {
  if (event.type === "shot") return event.outcome === "goal" ? HOLDS.goal : HOLDS.shot;
  if (event.type === "foul") return event.outcome === "penalty" ? HOLDS.penaltyFoul : undefined;
  if (event.type !== "setPiece") return undefined;
  if (event.variant === "corner") return HOLDS.corner;
  if (event.variant === "freeKick") return HOLDS.freeKick;
  return event.variant === "penalty" ? HOLDS.penalty : undefined;
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
