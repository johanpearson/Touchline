import type { SlotError } from "../save-slots";

/** The message that explains why a slot action failed (shared by the saves and start screens). */
export const SLOT_ERROR_KEYS = {
  store: "saves.error.store",
  corrupt: "saves.error.corrupt",
  "newer-version": "saves.error.newerVersion",
  "unknown-slot": "saves.error.other",
  "not-manual": "saves.error.other",
  "no-career": "saves.error.other",
  empty: "saves.error.other",
} as const satisfies Record<SlotError, string>;
