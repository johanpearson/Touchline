import type { MatchEvent, MatchEventType } from "./match-event";

/** Events that put the opponent under pressure; their intensity is the danger they create. */
const DANGEROUS_EVENTS: ReadonlySet<MatchEventType> = new Set([
  "progress",
  "lateral",
  "shot",
  "corner",
]);

/**
 * Signed danger per time bucket for the momentum chart: home danger counts positive, away danger
 * negative. Covers `0..upTo` seconds in buckets of `bucketSeconds` (the last one may be partial).
 */
export const momentumSeries = (
  events: readonly MatchEvent[],
  upTo: number,
  bucketSeconds: number,
): number[] => {
  if (!(bucketSeconds > 0)) throw new RangeError(`Invalid bucket size: ${bucketSeconds}`);
  const buckets: number[] = new Array(Math.max(0, Math.ceil(upTo / bucketSeconds))).fill(0);
  for (const event of events) {
    if (!DANGEROUS_EVENTS.has(event.type) || event.time > upTo) continue;
    const index = Math.min(buckets.length - 1, Math.floor(event.time / bucketSeconds));
    if (index < 0) continue;
    buckets[index] =
      (buckets[index] ?? 0) + (event.team === "home" ? event.intensity : -event.intensity);
  }
  return buckets;
};
