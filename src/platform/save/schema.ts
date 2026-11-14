import { addSquadPlanAndCondition } from "../../game";
import type { Migration } from "./migrations";

/**
 * Schema version 1 is the M3 `Career` shape. Version 2 adds `savedAt` to the envelope (the
 * `Career` shape is unchanged). Every later change to the stored shape bumps this.
 */
export const CURRENT_SCHEMA_VERSION = 3;

/** One migration per version bump, forming a gapless chain from 1 to `CURRENT_SCHEMA_VERSION`. */
export const MIGRATIONS: Migration[] = [
  // v1 had no `savedAt`: the best known time of the last write is `createdAt`.
  { from: 1, migrate: (save) => ({ ...save, schemaVersion: 2, savedAt: save.createdAt }) },
  // v2 had no squad plan or condition: give the 4-4-2 best eleven, neutral tactics, full condition.
  {
    from: 2,
    migrate: (save) => ({
      ...save,
      schemaVersion: 3,
      game: addSquadPlanAndCondition(save.game),
    }),
  },
];
