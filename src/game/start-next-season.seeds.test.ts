import { describe, expect, it } from "vitest";
import { aCareer } from "./career-builders";
import { finishSeason } from "./finish-season";
import { playSeasons } from "./season-test-helpers";

const finished = (career: ReturnType<typeof aCareer>) => {
  const result = finishSeason(career);
  if (!result.ok) throw new Error(result.error);
  return result.career;
};

// Two full seasons for each of three seeds: 364 simulated matches per seed. They live in their own file so that
// Vitest runs them in parallel with the quick tests of start-next-season.test.ts.
describe("startNextSeason over several seeds", () => {
  it.each([2, 5, 9])("plays two full seasons consistently for seed %i", (seed) => {
    const career = finished(playSeasons(aCareer(seed), 2));

    expect(career.history).toHaveLength(2);
    expect(career.history[1]?.seasonNumber).toBe(2);
    expect(career.history[0]?.finalTable).not.toEqual(career.history[1]?.finalTable);
  });
});
