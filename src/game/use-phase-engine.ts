import { isRecord } from "./json-guards";

/**
 * Schema v7 to v8 step for the `game` payload of a save: every career plays its next matches on the
 * phase-step engine (`engineVersion` 3). Recorded results keep the engine they were played with
 * (1 and 2 stay labels; finished matches are never replayed).
 * Data that is not a record is returned unchanged; `parseCareer` rejects it afterwards.
 * Never throws and never mutates its input.
 */
export const usePhaseEngine = (raw: unknown): unknown =>
  isRecord(raw) ? { ...raw, engineVersion: 3 } : raw;
