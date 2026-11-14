import { describe, expect, it, vi } from "vitest";
import { measureMatchTime } from "./measure-match-time";

vi.setConfig({ testTimeout: 60_000 });

/**
 * The target is a median under 50 ms for a whole match on a laptop (`npm run bench:engine` reports
 * it for 100 matches). A shared CI runner under parallel tests is several times slower, so this
 * test fails only above CI_LIMIT_MS: it catches a regression, not noise.
 */
const CI_LIMIT_MS = 150;

describe("action engine performance", () => {
  it(`simulates a fast-detail match in a median under ${CI_LIMIT_MS} ms`, () => {
    const { medianMs } = measureMatchTime("fast", 15);

    expect(medianMs).toBeLessThan(CI_LIMIT_MS);
  });
});
