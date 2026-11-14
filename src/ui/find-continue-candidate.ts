import { type Career, parseCareer } from "../game";
import { readEnvelope } from "../platform";
import type { SaveEnvelope, SaveStore } from "../shared";
import { AUTOSAVE_SLOT } from "./autosave-queue";

export type ContinueError = "invalid-envelope" | "newer-version" | "invalid-career" | "store";

export type ContinueCandidate =
  | { kind: "none" }
  | { kind: "found"; slotId: string; envelope: SaveEnvelope; career: Career }
  | { kind: "error"; error: ContinueError };

type Loaded = Extract<ContinueCandidate, { kind: "found" } | { kind: "error" }>;

async function loadSlot(store: SaveStore, slotId: string): Promise<Loaded | null> {
  const raw = await store.load(slotId);
  if (raw === null) return null;
  const read = readEnvelope(raw);
  if (!read.ok) {
    return {
      kind: "error",
      error: read.error === "newer-version" ? "newer-version" : "invalid-envelope",
    };
  }
  const parsed = parseCareer(read.save.game);
  if (!parsed.ok) return { kind: "error", error: "invalid-career" };
  return { kind: "found", slotId, envelope: read.save, career: parsed.career };
}

const newest = (a: Extract<Loaded, { kind: "found" }>, b: Extract<Loaded, { kind: "found" }>) =>
  b.envelope.savedAt > a.envelope.savedAt ? b : a;

/**
 * Looks for a career to continue: the autosave, or the newest valid save when there is none.
 * A damaged or newer-version autosave is reported and never replaced by another slot.
 * Never throws; storage failures come back as `{ kind: "error", error: "store" }`.
 */
export async function findContinueCandidate(store: SaveStore): Promise<ContinueCandidate> {
  try {
    const autosave = await loadSlot(store, AUTOSAVE_SLOT);
    if (autosave) return autosave;
    const others: Loaded[] = [];
    for (const id of await store.list()) {
      if (id === AUTOSAVE_SLOT) continue;
      const loaded = await loadSlot(store, id);
      if (loaded) others.push(loaded);
    }
    const found = others.filter((o): o is Extract<Loaded, { kind: "found" }> => o.kind === "found");
    const best = found.reduce<Extract<Loaded, { kind: "found" }> | null>(
      (acc, o) => (acc ? newest(acc, o) : o),
      null,
    );
    if (best) return best;
    return others[0] ?? { kind: "none" };
  } catch {
    return { kind: "error", error: "store" };
  }
}
