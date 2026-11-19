import { useCallback, useState } from "react";
import { type Career, parseCareer } from "../game";
import { parseSaveFile } from "../platform";
import type { FileTransfer, SaveEnvelope, SaveStore } from "../shared";
import {
  type ImportError,
  type ImportOffer,
  type ImportPickResult,
  importErrorFor,
} from "./import-save";
import { isKnownSlot, isManualSlot, type SlotActionResult } from "./save-slots";

export const clubNameOf = (career: Career): string =>
  career.league.clubs.find((c) => c.id === career.userClubId)?.name ?? career.userClubId;

export type ImportActions = {
  /** Lets the user pick a file and validates it. It is stored only by `importInto`. */
  pickImport: () => Promise<ImportPickResult>;
  /** The validated file waiting for a target slot, or null. */
  importOffer: ImportOffer | null;
  /** Why the latest picked file was rejected, or null. */
  importError: ImportError | null;
  /** Drops the waiting file and any import error. */
  cancelImport: () => void;
  /** Stores the waiting file in a manual slot (the caller has confirmed any overwrite). */
  importInto: (id: string) => Promise<SlotActionResult>;
  /** The slot the latest import went into, or null. */
  lastImportedSlot: string | null;
};

/** Picks, validates and stores a save file the user imports into a manual slot. */
export function useImportActions(saveStore: SaveStore, fileTransfer: FileTransfer): ImportActions {
  const [importOffer, setImportOffer] = useState<ImportOffer | null>(null);
  const [importError, setImportError] = useState<ImportError | null>(null);
  const [lastImportedSlot, setLastImportedSlot] = useState<string | null>(null);

  const pickImport = useCallback(async (): Promise<ImportPickResult> => {
    let file: Awaited<ReturnType<FileTransfer["pickFile"]>>;
    try {
      file = await fileTransfer.pickFile();
    } catch {
      file = null;
    }
    if (!file) return "cancelled";
    setLastImportedSlot(null);
    const parsed = parseSaveFile(file.text);
    if (!parsed.ok) {
      setImportOffer(null);
      setImportError(importErrorFor(parsed.error));
      return "error";
    }
    const careerResult = parseCareer(parsed.save.game);
    if (!careerResult.ok) {
      setImportOffer(null);
      setImportError("corrupt-career");
      return "error";
    }
    setImportError(null);
    setImportOffer({
      envelope: { ...parsed.save, game: careerResult.career },
      clubName: clubNameOf(careerResult.career),
      season: careerResult.career.season.number,
      matchday: careerResult.career.season.currentMatchday,
    });
    return "picked";
  }, [fileTransfer]);
  const cancelImport = useCallback(() => {
    setImportOffer(null);
    setImportError(null);
  }, []);
  const importInto = useCallback(
    async (id: string): Promise<SlotActionResult> => {
      if (!isManualSlot(id))
        return { ok: false, error: isKnownSlot(id) ? "not-manual" : "unknown-slot" };
      if (!importOffer) return { ok: false, error: "empty" };
      try {
        const envelope: SaveEnvelope = importOffer.envelope;
        await saveStore.save(id, envelope);
        setImportOffer(null);
        setLastImportedSlot(id);
        return { ok: true };
      } catch {
        return { ok: false, error: "store" };
      }
    },
    [importOffer, saveStore],
  );
  return {
    pickImport,
    importOffer,
    importError,
    cancelImport,
    importInto,
    lastImportedSlot,
  };
}
