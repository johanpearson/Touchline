import { isRecord } from "./json-guards";

/**
 * Schema v4 to v5 step for the `game` payload of a save: the zone engine was removed, so every
 * career plays its next matches on the action engine (`engineVersion` 2). Recorded results keep
 * the engine they were played with (1 stays a label; finished matches are never replayed).
 * Data that is not a record is returned unchanged; `parseCareer` rejects it afterwards.
 * Never throws and never mutates its input.
 */
export const useActionEngine = (raw: unknown): unknown =>
  isRecord(raw) ? { ...raw, engineVersion: 2 } : raw;
