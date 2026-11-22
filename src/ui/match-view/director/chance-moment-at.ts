import type { SegmentChance, Timeline } from "./timeline";

/**
 * The chance moment on screen at presentation time `clock` (the stage of a clear chance, its side,
 * shooter, keeper and result), or undefined when the clock is outside one.
 */
export const chanceMomentAt = (timeline: Timeline, clock: number): SegmentChance | undefined => {
  if (clock < 0 || clock >= timeline.duration) return undefined;
  const { segments } = timeline;
  let low = 0;
  let high = segments.length;
  while (low < high) {
    const mid = (low + high) >> 1;
    if ((segments[mid]?.presentationEnd ?? 0) > clock) high = mid;
    else low = mid + 1;
  }
  return segments[low]?.chance;
};
