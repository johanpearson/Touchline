import type { SaveEnvelope } from "../../shared";

/** Upgrades a save from version `from` to a later version. */
export type Migration = {
  from: number;
  migrate: (save: SaveEnvelope) => SaveEnvelope;
};

export type MigrationError = "invalid-envelope" | "newer-version" | "missing-migration";

export type MigrationResult =
  | { ok: true; save: SaveEnvelope }
  | { ok: false; error: MigrationError };

function isEnvelope(raw: unknown): raw is SaveEnvelope {
  if (typeof raw !== "object" || raw === null) return false;
  const candidate = raw as Record<string, unknown>;
  return (
    Number.isInteger(candidate.schemaVersion) &&
    (candidate.schemaVersion as number) >= 1 &&
    typeof candidate.createdAt === "string" &&
    "game" in candidate
  );
}

/**
 * Brings an untrusted save (loaded from storage or an imported file) up to `currentVersion`
 * by applying migrations one step at a time. Expected failures are returned, not thrown.
 */
export function migrateSave(
  raw: unknown,
  migrations: readonly Migration[],
  currentVersion: number,
): MigrationResult {
  if (!isEnvelope(raw)) return { ok: false, error: "invalid-envelope" };
  if (raw.schemaVersion > currentVersion) return { ok: false, error: "newer-version" };

  let save = structuredClone(raw);
  while (save.schemaVersion < currentVersion) {
    const step = migrations.find((m) => m.from === save.schemaVersion);
    if (step === undefined) return { ok: false, error: "missing-migration" };
    const next = step.migrate(save);
    if (next.schemaVersion <= save.schemaVersion) return { ok: false, error: "missing-migration" };
    save = next;
  }
  return { ok: true, save };
}
