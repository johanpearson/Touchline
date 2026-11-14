import type { ActionEvent } from "./action-event";

/** True when `event` is a completed pass and `next`, the very next action, is a shot by its receiver. */
export const leadsToShot = (event: ActionEvent, next: ActionEvent | undefined): boolean =>
  event.type === "pass" &&
  event.outcome === "complete" &&
  next !== undefined &&
  next.type === "shot" &&
  next.team === event.team &&
  next.actor === event.target;

/**
 * Returns the log with `keyPass: true` on every completed pass that directly precedes (the very
 * next action) a shot by its intended receiver on the same team. Other events are unchanged and the
 * input is not mutated.
 */
export const markKeyPasses = (events: readonly ActionEvent[]): ActionEvent[] =>
  events.map((event, index) => {
    return event.type === "pass" && leadsToShot(event, events[index + 1])
      ? { ...event, keyPass: true }
      : event;
  });
