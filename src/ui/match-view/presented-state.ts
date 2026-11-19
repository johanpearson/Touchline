import type { ActionEvent, Period, Side } from "../../engine";
import type { Timeline } from "./director";

/** What the views show of the log at the director's clock: how many events are on screen, the score and the period. */
export type PresentedState = {
  eventCount: number;
  period: Period;
  score: Record<Side, number>;
};

export const INITIAL_PRESENTED: PresentedState = {
  eventCount: 0,
  period: "firstHalf",
  score: { home: 0, away: 0 },
};

/** The presentation time at which the actions before the log entry `index` are over. */
const presentedAfter = (timeline: Timeline, index: number): number => {
  for (let i = timeline.segments.length - 1; i >= 0; i -= 1) {
    const segment = timeline.segments[i];
    if (segment && segment.eventIndex < index) return segment.presentationEnd;
  }
  return 0;
};

/**
 * Whether the director has reached `event`. An action is reached when the match clock reaches its
 * time. A period change has no segment of its own: it is reached when the actions before it
 * (a goal's hold included) are over, so half-time does not cut a goal celebration short.
 */
const reached = (
  event: ActionEvent,
  index: number,
  timeline: Timeline,
  matchTime: number,
  clock: number,
): boolean =>
  event.type === "periodChange"
    ? clock >= presentedAfter(timeline, index)
    : event.time <= matchTime;

/**
 * The state after `previous` once the clock moved to `clock` (match time `matchTime`). The views only
 * ever see this, never the engine's own score or period, which are ahead by the lookahead. Events are
 * presented in log order and never taken back.
 */
export const advancePresented = (
  previous: PresentedState,
  events: readonly ActionEvent[],
  timeline: Timeline,
  matchTime: number,
  clock: number,
): PresentedState => {
  let { eventCount, period } = previous;
  const score = { ...previous.score };
  for (;;) {
    const event = events[eventCount];
    if (!event || !reached(event, eventCount, timeline, matchTime, clock)) break;
    period = event.period;
    if (event.type === "shot" && event.outcome === "goal") score[event.team] += 1;
    eventCount += 1;
  }
  if (eventCount === previous.eventCount) return previous;
  return { eventCount, period, score };
};
