import type { Rng } from "../rng";

const oneDecimal = (value: number): number => Math.round(value * 10) / 10;

/**
 * `count` match times in ascending order from `start` to `end` (one decimal): the first event opens
 * the step and the last closes it, the ones between are spread by the presentation stream.
 */
export const spreadTimes = (count: number, start: number, end: number, rng: Rng): number[] => {
  if (count <= 1) return [start];
  const inner = Array.from({ length: count - 2 }, () =>
    oneDecimal(start + rng.next() * (end - start)),
  );
  return [start, ...inner.sort((a, b) => a - b), end];
};
