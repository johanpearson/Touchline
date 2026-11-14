import { measureMatchTime } from "./measure-match-time";

/**
 * Prints median and p95 of 100 matches per detail level after warm-up. Run with
 * `npm run bench:engine`, which bundles this file and runs it in plain Node: under Vitest the
 * module wrapper makes the engine about twice as slow, so the figures would be misleading.
 */
for (const detail of ["fast", "full"] as const) {
  const { medianMs, p95Ms } = measureMatchTime(detail, 100);
  console.log(`${detail}: median ${medianMs.toFixed(1)} ms, p95 ${p95Ms.toFixed(1)} ms`);
}
