/** Versioned wrapper around everything that is written to a save. */
export type SaveEnvelope = {
  schemaVersion: number;
  /** ISO 8601 timestamp of when the save was first created. */
  createdAt: string;
  /** Game state. Its shape is owned by `game` and described by `schemaVersion`. */
  game: unknown;
};

/** Async key-value storage for saves. Implemented by platform adapters. */
export type SaveStore = {
  /** Ids of all stored saves, sorted alphabetically. */
  list: () => Promise<string[]>;
  /** Resolves to `null` when no save with this id exists. */
  load: (id: string) => Promise<SaveEnvelope | null>;
  /** Creates or replaces the save with this id. */
  save: (id: string, data: SaveEnvelope) => Promise<void>;
  /** Removes the save. Deleting an unknown id is not an error. */
  delete: (id: string) => Promise<void>;
};
