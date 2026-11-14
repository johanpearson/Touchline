import { type Career, parseCareer } from "../game";
import { readEnvelope } from "../platform";
import type { SaveEnvelope, SaveStore } from "../shared";
import { AUTOSAVE_SLOT } from "./autosave-queue";

export const MANUAL_SLOTS = ["slot-1", "slot-2", "slot-3"] as const;
export const SLOT_IDS = [AUTOSAVE_SLOT, ...MANUAL_SLOTS] as const;

export const isManualSlot = (id: string): boolean =>
  (MANUAL_SLOTS as readonly string[]).includes(id);
export const isKnownSlot = (id: string): boolean => (SLOT_IDS as readonly string[]).includes(id);

/** What a slot row shows about a readable save. */
export type SlotSummary = {
  clubName: string;
  leagueName: string;
  season: number;
  matchday: number;
  /** Time of the last write to the slot (`savedAt` of its envelope). */
  savedAt: string;
};

export type SlotState =
  | { kind: "empty" }
  | ({ kind: "filled" } & SlotSummary)
  | { kind: "corrupt" }
  | { kind: "newer-version" };

export type SlotEntry = { id: string; state: SlotState };

export type SlotError =
  | "store"
  | "unknown-slot"
  | "not-manual"
  | "no-career"
  | "empty"
  | "corrupt"
  | "newer-version";

export type SlotActionResult = { ok: true } | { ok: false; error: SlotError };
export type SlotsResult = { ok: true; slots: SlotEntry[] } | { ok: false; error: "store" };

export type ReadSlot =
  | { kind: "empty" }
  | { kind: "corrupt" }
  | { kind: "newer-version" }
  | { kind: "found"; envelope: SaveEnvelope; career: Career };

/** Reads and validates one slot. Rejects only when the store itself fails. */
export async function readSlot(store: SaveStore, id: string): Promise<ReadSlot> {
  const raw = await store.load(id);
  if (raw === null) return { kind: "empty" };
  const read = readEnvelope(raw);
  if (!read.ok) return { kind: read.error === "newer-version" ? "newer-version" : "corrupt" };
  const parsed = parseCareer(read.save.game);
  if (!parsed.ok) return { kind: "corrupt" };
  return { kind: "found", envelope: read.save, career: parsed.career };
}

export const summariseSlot = (envelope: SaveEnvelope, career: Career): SlotSummary => ({
  clubName: career.league.clubs.find((c) => c.id === career.userClubId)?.name ?? career.userClubId,
  leagueName: career.league.name,
  season: career.season.number,
  matchday: career.season.currentMatchday,
  savedAt: envelope.savedAt,
});

/** Describes every slot. A damaged slot never fails the whole list. */
export async function listSlotEntries(store: SaveStore): Promise<SlotsResult> {
  try {
    const entries: SlotEntry[] = [];
    for (const id of SLOT_IDS) {
      const read = await readSlot(store, id).catch(() => ({ kind: "corrupt" }) as const);
      entries.push({
        id,
        state:
          read.kind === "found"
            ? { kind: "filled", ...summariseSlot(read.envelope, read.career) }
            : { kind: read.kind },
      });
    }
    return { ok: true, slots: entries };
  } catch {
    return { ok: false, error: "store" };
  }
}
