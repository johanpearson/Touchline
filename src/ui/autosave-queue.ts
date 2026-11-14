import { createEnvelope, updateEnvelope } from "../platform";
import type { SaveEnvelope, SaveStore } from "../shared";

export const AUTOSAVE_SLOT = "autosave";

/** "new": a new career starts a fresh `createdAt`. "continue": the same career keeps its own. */
export type SaveLineage = "new" | "continue";

export type AutosaveQueue = {
  /** Saves the game after every earlier save has finished. Rejects when this write fails. */
  save: (game: unknown, lineage: SaveLineage) => Promise<void>;
  /** Marks a loaded envelope as the one later saves continue, so its `createdAt` is kept. */
  adopt: (envelope: SaveEnvelope) => void;
};

/**
 * Serialises writes to the autosave slot so rapid saves cannot interleave: they run in call
 * order and the last state wins. A failed write rejects its own promise only.
 */
export function createAutosaveQueue(store: SaveStore, now: () => string): AutosaveQueue {
  let tail: Promise<unknown> = Promise.resolve();
  let previous: SaveEnvelope | null = null;

  const enqueue = <T>(task: () => Promise<T>): Promise<T> => {
    const result = tail.then(task);
    tail = result.catch(() => undefined);
    return result;
  };

  return {
    save: (game, lineage) =>
      enqueue(async () => {
        const envelope =
          lineage === "continue" && previous !== null
            ? updateEnvelope(previous, game, now)
            : createEnvelope(game, now);
        await store.save(AUTOSAVE_SLOT, envelope);
        previous = envelope;
      }),
    adopt: (envelope) => {
      void enqueue(async () => {
        previous = envelope;
      });
    },
  };
}
