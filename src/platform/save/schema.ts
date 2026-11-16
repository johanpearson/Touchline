import { addEngineVersion, addSquadPlanAndCondition, useActionEngine } from "../../game";
import type { Migration } from "./migrations";

/**
 * Schema version 1 is the M3 `Career` shape. Version 2 adds `savedAt` to the envelope (the
 * `Career` shape is unchanged). Version 3 adds the squad plan and condition, version 4 the engine
 * version of the career and of every result, version 5 moves every career to the action engine (the zone engine was removed), version 6 adds the optional `scorers` list to results. Every later change to the stored shape bumps this.
 */
export const CURRENT_SCHEMA_VERSION = 6;

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
  // v3 matches were all played on the zone engine: mark career and results as engine 1.
  {
    from: 3,
    migrate: (save) => ({ ...save, schemaVersion: 4, game: addEngineVersion(save.game) }),
  },
  // v4 careers may still play on the zone engine: from now on every match uses the action engine.
  {
    from: 4,
    migrate: (save) => ({ ...save, schemaVersion: 5, game: useActionEngine(save.game) }),
  },
  // v5 results have no scorers; the field is optional, so the data stays as it is.
  { from: 5, migrate: (save) => ({ ...save, schemaVersion: 6 }) },
];
