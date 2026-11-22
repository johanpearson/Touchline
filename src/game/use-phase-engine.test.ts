import { describe, expect, it } from "vitest";
import { aCareer, deepFreeze } from "./career-builders";
import { parseCareer } from "./parse-career";
import { playMatchdays } from "./season-test-helpers";
import { usePhaseEngine } from "./use-phase-engine";

/** A v7 career that played on the action engine: one matchday, every result stamped engine 2. */
const actionCareer = () => {
  const career = playMatchdays(aCareer(), 1);
  return {
    ...career,
    engineVersion: 2,
    season: {
      ...career.season,
      results: career.season.results.map((result) => ({ ...result, engineVersion: 2 })),
    },
  };
};

describe("usePhaseEngine", () => {
  it("sets the career to engine 3 and leaves the recorded results on the engine they were played with", () => {
    const v7 = deepFreeze(actionCareer());

    const migrated = usePhaseEngine(v7) as {
      engineVersion: number;
      season: { results: { engineVersion: number }[] };
    };

    expect(migrated.engineVersion).toBe(3);
    expect(migrated.season.results).toHaveLength(7);
    expect(migrated.season.results.every((r) => r.engineVersion === 2)).toBe(true);
  });

  it("gives a career that parseCareer accepts", () => {
    const parsed = parseCareer(usePhaseEngine(actionCareer()));

    expect(parsed.ok && parsed.career.engineVersion).toBe(3);
  });

  it("leaves a career that already plays on engine 3 as it is", () => {
    const career = playMatchdays(aCareer(), 1);

    expect(usePhaseEngine(career)).toEqual(career);
  });

  it.each([null, "x", 3, []])("leaves unusable data %j for parseCareer to reject", (raw) => {
    expect(() => usePhaseEngine(raw)).not.toThrow();
    expect(parseCareer(usePhaseEngine(raw)).ok).toBe(false);
  });
});
