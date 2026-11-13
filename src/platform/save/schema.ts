import type { Migration } from "./migrations";

/** Schema version 1 is the M3 `Career` shape. Every later change to `Career` bumps this. */
export const CURRENT_SCHEMA_VERSION = 1;

/** One migration per version bump, forming a gapless chain from 1 to `CURRENT_SCHEMA_VERSION`. */
export const MIGRATIONS: Migration[] = [];
