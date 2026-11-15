import { describe, expect, it } from "vitest";
import type { Career } from "./career";
import { aCareer } from "./career-builders";
import { completeMatchday } from "./complete-matchday";
import { getNextFixture } from "./get-next-fixture";
import { simulateFixture } from "./simulate-fixture";

const playMatchday = (career: Career): Career => {
  const fixture = getNextFixture(career.season, career.userClubId);
  if (!fixture) throw new Error("season over");
  const outcome = completeMatchday(career, simulateFixture(career, fixture));
  if (!outcome.ok) throw new Error(outcome.error);
  return outcome.career;
};

describe("completeMatchday performance", () => {
  it("plays an engine 2 season of 26 matchdays within the time budget", () => {
    // Budget: 13 background matches per matchday at about 50 ms each on a laptop (see
    // "Performance and the fast path" in docs/architecture.md); tripled for slow CI runners.
    const budgetMs = 26 * 13 * 50 * 3;
    let career = aCareer(1, 2);
    const start = performance.now();

    for (let i = 0; i < 26; i++) career = playMatchday(career);

    expect(performance.now() - start).toBeLessThan(budgetMs);
    expect(career.season.results).toHaveLength(182);
  }, 120_000);
});
