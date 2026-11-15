import { aMatchInput } from "./action-builders";
import type { MatchDetail } from "./action-match";
import { createActionMatch } from "./create-action-match";

export type MatchTiming = { medianMs: number; p95Ms: number };

const percentile = (sorted: readonly number[], fraction: number): number =>
  sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] as number;

const playOne = (detail: MatchDetail, seed: number): void => {
  const match = createActionMatch(aMatchInput().build(), seed, { detail });
  match.advanceTo(10_000);
  match.resume();
  match.advanceTo(20_000);
};

/** Wall-clock time of whole matches (two halves) after a warm-up, so JIT compilation is not counted. */
export const measureMatchTime = (detail: MatchDetail, matches: number, warmUp = 5): MatchTiming => {
  for (let i = 0; i < warmUp; i++) playOne(detail, 1000 + i);
  const times: number[] = [];
  for (let i = 0; i < matches; i++) {
    const start = performance.now();
    playOne(detail, i + 1);
    times.push(performance.now() - start);
  }
  times.sort((a, b) => a - b);
  return { medianMs: percentile(times, 0.5), p95Ms: percentile(times, 0.95) };
};
