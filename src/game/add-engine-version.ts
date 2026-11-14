import { isRecord } from "./json-guards";

/**
 * Schema v3 to v4 step for the `game` payload of a save: every v3 career and result was played on
 * the zone engine, so `engineVersion` 1 is added to the career and to each recorded result.
 * Data that is not a usable v3 career is returned unchanged; `parseCareer` rejects it afterwards.
 * Never throws and never mutates its input.
 */
export const addEngineVersion = (raw: unknown): unknown => {
  if (!isRecord(raw) || !isRecord(raw.season) || !Array.isArray(raw.season.results)) return raw;
  const results = raw.season.results.map((r: unknown) =>
    isRecord(r) ? { ...r, engineVersion: 1 } : r,
  );
  return { ...raw, engineVersion: 1, season: { ...raw.season, results } };
};
