import { describe, expect, it } from "vitest";
import { addEngineVersion } from "./add-engine-version";
import { aCareer, deepFreeze } from "./career-builders";
import { parseCareer } from "./parse-career";
import { playMatchdays } from "./season-test-helpers";
import { useActionEngine } from "./use-action-engine";

/** A v3 career: one played matchday, no engine version anywhere. */
const withoutEngineVersion = () => {
  const career = playMatchdays(aCareer(), 1);
  const { engineVersion: _career, ...rest } = career;
  return {
    ...rest,
    season: {
      ...career.season,
      results: career.season.results.map(({ engineVersion: _result, ...result }) => result),
    },
  };
};

describe("addEngineVersion", () => {
  it("marks the career and every recorded result as played on engine 1", () => {
    const v3 = deepFreeze(withoutEngineVersion());

    const migrated = addEngineVersion(v3) as {
      engineVersion: number;
      season: { results: { engineVersion: number }[] };
    };

    expect(migrated.engineVersion).toBe(1);
    expect(migrated.season.results).toHaveLength(7);
    expect(migrated.season.results.every((r) => r.engineVersion === 1)).toBe(true);
  });

  it("gives a career that parseCareer accepts once the next migration moved it to engine 2", () => {
    const parsed = parseCareer(useActionEngine(addEngineVersion(withoutEngineVersion())));

    expect(parsed.ok).toBe(true);
  });

  it.each([null, "x", 3, [], { season: 5 }, { season: { results: "no" } }])(
    "leaves unusable data %j for parseCareer to reject",
    (raw) => {
      expect(() => addEngineVersion(raw)).not.toThrow();
      expect(parseCareer(addEngineVersion(raw)).ok).toBe(false);
    },
  );
});
