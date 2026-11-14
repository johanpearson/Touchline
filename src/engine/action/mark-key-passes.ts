import type { ActionEvent } from "./action-event";

/**
 * Returns the log with `keyPass: true` on every completed pass that directly precedes (the very
 * next action) a shot by its intended receiver on the same team. Other events are unchanged and the
 * input is not mutated.
 */
export const markKeyPasses = (events: readonly ActionEvent[]): ActionEvent[] =>
  events.map((event, index) => {
    if (event.type !== "pass" || event.outcome !== "complete") return event;
    const next = events[index + 1];
    const leadsToShot =
      next !== undefined &&
      next.type === "shot" &&
      next.team === event.team &&
      next.actor === event.target;
    return leadsToShot ? { ...event, keyPass: true } : event;
  });
