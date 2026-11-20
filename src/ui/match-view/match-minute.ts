import type { ZoneEvent } from "../../engine";

const SECONDS_PER_MINUTE = 60;
const HALF_MINUTES = 45;

/** The match time at which the first half ended, if it has. */
const halfTimeOf = (events: readonly ZoneEvent[]): number | undefined =>
  events.find((event) => event.type === "periodChange" && event.period === "halfTime")?.time;

const withAddedTime = (minute: number, regular: number): string =>
  minute > regular ? `${regular}+${minute - regular}’` : `${minute}’`;

/**
 * The minute label for a match time in seconds: `12’`, `45+2’`, `90+3’`. The second half counts
 * on from 45 whatever the added time of the first half was, so the label needs the event log.
 */
export const formatMatchMinute = (time: number, events: readonly ZoneEvent[]): string => {
  const halfTime = halfTimeOf(events);
  if (halfTime === undefined || time < halfTime) {
    return withAddedTime(Math.floor(time / SECONDS_PER_MINUTE), HALF_MINUTES);
  }
  const minute = HALF_MINUTES + Math.floor((time - halfTime) / SECONDS_PER_MINUTE);
  return withAddedTime(minute, 2 * HALF_MINUTES);
};

/**
 * The match minute (whole minutes, as the rules count them) at a match time in seconds: the first
 * half stops at 45 whatever its added time, and the second half counts on from 45.
 */
export const matchMinuteOf = (time: number, events: readonly ZoneEvent[]): number => {
  const halfTime = halfTimeOf(events);
  if (halfTime === undefined || time < halfTime) {
    return Math.min(HALF_MINUTES, Math.floor(time / SECONDS_PER_MINUTE));
  }
  return HALF_MINUTES + Math.floor((time - halfTime) / SECONDS_PER_MINUTE);
};
