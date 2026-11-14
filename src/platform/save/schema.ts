import type { Migration } from "./migrations";

/**
 * Schema version 1 is the M3 `Career` shape. Version 2 adds `savedAt` to the envelope (the
 * `Career` shape is unchanged). Every later change to the stored shape bumps this.
 */
export const CURRENT_SCHEMA_VERSION = 2;

/** One migration per version bump, forming a gapless chain from 1 to `CURRENT_SCHEMA_VERSION`. */
export const MIGRATIONS: Migration[] = [
  // v1 had no `savedAt`: the best known time of the last write is `createdAt`.
  { from: 1, migrate: (save) => ({ ...save, schemaVersion: 2, savedAt: save.createdAt }) },
];
