import { describe, expect, it } from "vitest";
import { aCareer, deepFreeze } from "./career-builders";
import { parseCareer } from "./parse-career";
import { playMatchdays } from "./season-test-helpers";
import { useActionEngine } from "./use-action-engine";

/** A v4 career that played on the zone engine: one matchday, every result stamped engine 1. */
const zoneCareer = () => {
  const career = playMatchdays(aCareer(), 1);
  return {
    ...career,
    engineVersion: 1,
    season: {
      ...career.season,
      results: career.season.results.map((result) => ({ ...result, engineVersion: 1 })),
    },
  };
};

describe("useActionEngine", () => {
  it("sets the career to engine 2 and leaves the recorded results on the engine they were played with", () => {
    const v4 = deepFreeze(zoneCareer());

    const migrated = useActionEngine(v4) as {
      engineVersion: number;
      season: { results: { engineVersion: number }[] };
    };

    expect(migrated.engineVersion).toBe(2);
    expect(migrated.season.results).toHaveLength(7);
    expect(migrated.season.results.every((r) => r.engineVersion === 1)).toBe(true);
  });

  it("gives a career that parseCareer accepts", () => {
    const parsed = parseCareer(useActionEngine(zoneCareer()));

    expect(parsed.ok).toBe(true);
  });

  it("leaves a career that already plays on engine 2 as it is", () => {
    const career = playMatchdays(aCareer(), 1);

    expect(useActionEngine(career)).toEqual(career);
  });

  it.each([null, "x", 3, []])("leaves unusable data %j for parseCareer to reject", (raw) => {
    expect(() => useActionEngine(raw)).not.toThrow();
    expect(parseCareer(useActionEngine(raw)).ok).toBe(false);
  });
});
