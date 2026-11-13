import type { SaveEnvelope } from "../../shared";
import { type MigrationError, migrateSave } from "./migrations";
import { CURRENT_SCHEMA_VERSION, MIGRATIONS } from "./schema";

export type ReadEnvelopeResult =
  | { ok: true; save: SaveEnvelope }
  | { ok: false; error: MigrationError };

/** Wraps a game state in a new envelope. The clock is injected so `createdAt` stays testable. */
export const createEnvelope = (game: unknown, now: () => string): SaveEnvelope => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  createdAt: now(),
  game,
});

/** Re-saves a slot: new game state, same `createdAt`, current schema version. */
export const updateEnvelope = (previous: SaveEnvelope, game: unknown): SaveEnvelope => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  createdAt: previous.createdAt,
  game,
});

/** Turns an untrusted blob (storage or imported file) into a current-version envelope. */
export const readEnvelope = (raw: unknown): ReadEnvelopeResult =>
  migrateSave(raw, MIGRATIONS, CURRENT_SCHEMA_VERSION);
