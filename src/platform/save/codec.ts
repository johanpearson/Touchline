import type { SaveEnvelope } from "../../shared";
import { type MigrationError, migrateSave } from "./migrations";
import { CURRENT_SCHEMA_VERSION, MIGRATIONS } from "./schema";

export type ReadEnvelopeResult =
  | { ok: true; save: SaveEnvelope }
  | { ok: false; error: MigrationError };

/** Wraps a game state in a new envelope. The clock is injected so `createdAt` stays testable. */
export const createEnvelope = (game: unknown, now: () => string): SaveEnvelope => {
  const time = now();
  return { schemaVersion: CURRENT_SCHEMA_VERSION, createdAt: time, savedAt: time, game };
};

/** Re-saves a slot: new game state and `savedAt`, same `createdAt`, current schema version. */
export const updateEnvelope = (
  previous: SaveEnvelope,
  game: unknown,
  now: () => string,
): SaveEnvelope => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  createdAt: previous.createdAt,
  savedAt: now(),
  game,
});

const isTimestamp = (value: unknown): boolean =>
  typeof value === "string" && value !== "" && !Number.isNaN(Date.parse(value));

/** Turns an untrusted blob (storage or imported file) into a current-version envelope. */
export const readEnvelope = (raw: unknown): ReadEnvelopeResult => {
  const result = migrateSave(raw, MIGRATIONS, CURRENT_SCHEMA_VERSION);
  if (result.ok && !isTimestamp(result.save.savedAt)) {
    return { ok: false, error: "invalid-envelope" };
  }
  return result;
};
