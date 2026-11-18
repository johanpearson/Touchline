import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";
import type { TeamTactics } from "../engine";
import {
  acceptOffer as applyAcceptOffer,
  buyPlayer as applyBuyPlayer,
  setLineup as applyLineup,
  releasePlayer as applyReleasePlayer,
  signFreeAgent as applySignFreeAgent,
  setTactics as applyTactics,
  autoPickUserLineup,
  type Career,
  type CareerError,
  completeMatchday,
  createCareer,
  type Formation,
  type Lineup,
  type LineupError,
  type MatchdayError,
  type MatchReport,
  type NextSeasonError,
  parseCareer,
  type Result,
  rollOverSeason,
  type TransferError,
  type TransferResult,
} from "../game";
import { createEnvelope, parseSaveFile, saveFileName, serializeSave } from "../platform";
import type { FileTransfer, SaveEnvelope, SaveStore } from "../shared";
import { createAutosaveQueue, type SaveLineage } from "./autosave-queue";
import { type ContinueInfo, continueInfoOf } from "./continue-info";
import type { ContinueError } from "./find-continue-candidate";
import {
  type ImportError,
  type ImportOffer,
  type ImportPickResult,
  importErrorFor,
} from "./import-save";
import {
  isKnownSlot,
  isManualSlot,
  listSlotEntries,
  readSlot,
  type SlotActionResult,
  type SlotsResult,
} from "./save-slots";
import { useContinueCandidate } from "./use-continue-candidate";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type { ContinueInfo };

export type CareerStore = {
  /** The running career, or null before one has been started. */
  career: Career | null;
  /** Starts a career and replaces any running one. Returns an error for an unknown club. */
  startCareer: (seed: number, userClubId: string) => CareerError | null;
  /** Records the user's result, simulates the rest of the round and moves to the next matchday. */
  completeMatch: (userResult: Result, report?: MatchReport) => MatchdayError | null;
  /** Replaces the user's lineup. An invalid lineup returns the error and changes nothing. */
  setLineup: (lineup: Lineup) => { ok: true } | { ok: false; error: LineupError };
  /** Replaces the user's tactics. */
  setTactics: (tactics: TeamTactics) => void;
  /** Auto-picks starters and bench for a formation, keeping the tactics. */
  autoPickLineup: (formation: Formation) => void;
  /**
   * Rolls a finished season over to the next one with `rollOverSeason` (the off-season, the user's
   * squad on autopilot until the off-season screen lets the user decide, then the new season).
   * Returns an error while the season is running.
   */
  startNextSeason: () => NextSeasonError | null;
  /** Buys a player from an AI club (the window must be open). Returns the refusal, or null when done. */
  buyPlayer: (playerId: string, fee: number, seasons: number) => TransferError | null;
  /** Signs a free agent at any time. Returns the refusal, or null when done. */
  signFreeAgent: (playerId: string, wage: number, seasons: number) => TransferError | null;
  /** Accepts an incoming offer (the window must be open). Returns the refusal, or null when done. */
  acceptOffer: (offerId: string) => TransferError | null;
  /** Releases one of the user's players to the free agents. Returns the refusal, or null when done. */
  releasePlayer: (playerId: string) => TransferError | null;
  /** State of the latest autosave. */
  saveStatus: SaveStatus;
  /** Time (from the injected clock) of the latest successful autosave, or null. */
  lastSavedAt: string | null;
  /** True when a usable save was found on startup and `loadAutosave` can load it. */
  continueAvailable: boolean;
  /** Describes the save `loadAutosave` would load, or null. */
  continueInfo: ContinueInfo | null;
  /** Loads the save found on startup as the running career. Resolves to false when there is none. */
  loadAutosave: () => Promise<boolean>;
  /** Why the save found on startup could not be loaded, or null. */
  loadError: ContinueError | null;
  /** Hides the load error so the user can start a new career. */
  dismissLoadError: () => void;
  /**
   * Deletes the unusable save behind `loadError`, then looks again for a save to continue.
   * Fails (and keeps the error) when the storage refuses or the damaged slot is not known.
   */
  discardLoadError: () => Promise<SlotActionResult>;
  /** False until the first look for a save to continue has finished. */
  startupChecked: boolean;
  /** Describes the autosave and the manual slots. Never throws. */
  listSlots: () => Promise<SlotsResult>;
  /** Writes the running career into a manual slot with a fresh save time. */
  saveToSlot: (id: string) => Promise<SlotActionResult>;
  /** Replaces the running career with the one in the slot. */
  loadSlot: (id: string) => Promise<SlotActionResult>;
  /** Removes a slot (also a damaged one). Deleting an empty slot is not an error. */
  deleteSlot: (id: string) => Promise<SlotActionResult>;
  /** Hands a slot's stored save to the user as a file. */
  exportSlot: (id: string) => Promise<SlotActionResult>;
  /** Hands the running career to the user as a file. */
  exportCareer: () => SlotActionResult;
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

const clubNameOf = (career: Career): string =>
  career.league.clubs.find((c) => c.id === career.userClubId)?.name ?? career.userClubId;

const fileNameFor = (career: Career): string =>
  saveFileName({
    clubName: clubNameOf(career),
    season: career.season.number,
    matchday: career.season.currentMatchday,
  });

const CareerContext = createContext<CareerStore | null>(null);

export type CareerProviderProps = {
  children: ReactNode;
  saveStore: SaveStore;
  /** Injected clock returning an ISO 8601 timestamp; the UI never reads the time itself. */
  now: () => string;
  /** Downloads and file picking for export and import. */
  fileTransfer: FileTransfer;
};

/**
 * Holds the career and autosaves it through the `SaveStore`: after it is created, after every
 * completed matchday and after starting the next season. Save failures are reported through
 * `saveStatus` and never block play.
 */
export function CareerProvider({ children, saveStore, now, fileTransfer }: CareerProviderProps) {
  const [career, setCareer] = useState<Career | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [importOffer, setImportOffer] = useState<ImportOffer | null>(null);
  const [importError, setImportError] = useState<ImportError | null>(null);
  const [lastImportedSlot, setLastImportedSlot] = useState<string | null>(null);

  const nowRef = useRef(now);
  nowRef.current = now;
  const queue = useMemo(() => createAutosaveQueue(saveStore, () => nowRef.current()), [saveStore]);
  const pending = useRef(0);

  const {
    candidate,
    loadError,
    checked: startupChecked,
    clear: clearCandidate,
    dismissError: dismissLoadError,
    discardError: discardLoadError,
  } = useContinueCandidate(saveStore);

  const persist = useCallback(
    (game: Career, lineage: SaveLineage) => {
      pending.current += 1;
      setSaveStatus("saving");
      const finish = (status: "saved" | "error") => {
        pending.current -= 1;
        if (status === "saved") setLastSavedAt(nowRef.current());
        if (pending.current === 0) setSaveStatus(status);
      };
      queue.save(game, lineage).then(
        () => finish("saved"),
        () => finish("error"),
      );
    },
    [queue],
  );

  const startCareer = useCallback(
    (seed: number, userClubId: string): CareerError | null => {
      const result = createCareer({ seed, userClubId });
      if (!result.ok) return result.error;
      clearCandidate();
      setCareer(result.career);
      persist(result.career, "new");
      return null;
    },
    [persist, clearCandidate],
  );
  const completeMatch = useCallback(
    (userResult: Result, report?: MatchReport): MatchdayError | null => {
      if (!career) return "season-complete";
      const outcome = completeMatchday(career, userResult, report);
      if (!outcome.ok) return outcome.error;
      setCareer(outcome.career);
      persist(outcome.career, "continue");
      return null;
    },
    [career, persist],
  );
  // Plan edits are not saved on their own; the next autosave (matchday, new season) carries them.
  const setLineup = useCallback(
    (lineup: Lineup): { ok: true } | { ok: false; error: LineupError } => {
      if (!career) return { ok: false, error: "unknown-player" };
      const outcome = applyLineup(career, lineup);
      if (!outcome.ok) return outcome;
      setCareer(outcome.career);
      return { ok: true };
    },
    [career],
  );
  const setTactics = useCallback(
    (tactics: TeamTactics) =>
      setCareer((current) => (current ? applyTactics(current, tactics) : current)),
    [],
  );
  const autoPickLineup = useCallback(
    (formation: Formation) =>
      setCareer((current) => (current ? autoPickUserLineup(current, formation) : current)),
    [],
  );
  const rollOver = useCallback((): NextSeasonError | null => {
    if (!career) return "season-incomplete";
    const outcome = rollOverSeason(career);
    if (!outcome.ok) return outcome.error;
    setCareer(outcome.career);
    persist(outcome.career, "continue");
    return null;
  }, [career, persist]);

  const applyTransfer = useCallback(
    (outcome: TransferResult): TransferError | null => {
      if (!outcome.ok) return outcome.error;
      setCareer(outcome.career);
      persist(outcome.career, "continue");
      return null;
    },
    [persist],
  );
  const buyPlayer = useCallback(
    (playerId: string, fee: number, seasons: number) =>
      career ? applyTransfer(applyBuyPlayer(career, playerId, fee, seasons)) : "unknown-player",
    [career, applyTransfer],
  );
  const signFreeAgent = useCallback(
    (playerId: string, wage: number, seasons: number) =>
      career
        ? applyTransfer(applySignFreeAgent(career, playerId, wage, seasons))
        : "unknown-player",
    [career, applyTransfer],
  );
  const acceptOffer = useCallback(
    (offerId: string) => {
      const offer = career?.offers.find((o) => o.id === offerId);
      return career && offer
        ? applyTransfer(applyAcceptOffer(career, offer))
        : ("unknown-offer" as const);
    },
    [career, applyTransfer],
  );
  const releasePlayer = useCallback(
    (playerId: string) =>
      career ? applyTransfer(applyReleasePlayer(career, playerId)) : "unknown-player",
    [career, applyTransfer],
  );

  const loadAutosave = useCallback(async (): Promise<boolean> => {
    if (!candidate) return false;
    queue.adopt(candidate.envelope);
    setCareer(candidate.career);
    clearCandidate();
    return true;
  }, [candidate, queue, clearCandidate]);
  const listSlots = useCallback(() => listSlotEntries(saveStore), [saveStore]);
  const saveToSlot = useCallback(
    async (id: string): Promise<SlotActionResult> => {
      if (!isManualSlot(id))
        return { ok: false, error: isKnownSlot(id) ? "not-manual" : "unknown-slot" };
      if (!career) return { ok: false, error: "no-career" };
      try {
        await saveStore.save(id, createEnvelope(career, nowRef.current));
        return { ok: true };
      } catch {
        return { ok: false, error: "store" };
      }
    },
    [career, saveStore],
  );
  const loadSlot = useCallback(
    async (id: string): Promise<SlotActionResult> => {
      if (!isKnownSlot(id)) return { ok: false, error: "unknown-slot" };
      try {
        const read = await readSlot(saveStore, id);
        if (read.kind !== "found") return { ok: false, error: read.kind };
        queue.adopt(read.envelope);
        clearCandidate();
        setCareer(read.career);
        return { ok: true };
      } catch {
        return { ok: false, error: "store" };
      }
    },
    [saveStore, queue, clearCandidate],
  );
  const deleteSlot = useCallback(
    async (id: string): Promise<SlotActionResult> => {
      if (!isKnownSlot(id)) return { ok: false, error: "unknown-slot" };
      try {
        await saveStore.delete(id);
        return { ok: true };
      } catch {
        return { ok: false, error: "store" };
      }
    },
    [saveStore],
  );

  const exportCareer = useCallback((): SlotActionResult => {
    if (!career) return { ok: false, error: "no-career" };
    const envelope = createEnvelope(career, nowRef.current);
    fileTransfer.download(fileNameFor(career), serializeSave(envelope));
    return { ok: true };
  }, [career, fileTransfer]);
  const exportSlot = useCallback(
    async (id: string): Promise<SlotActionResult> => {
      if (!isKnownSlot(id)) return { ok: false, error: "unknown-slot" };
      try {
        const read = await readSlot(saveStore, id);
        if (read.kind !== "found") return { ok: false, error: read.kind };
        fileTransfer.download(fileNameFor(read.career), serializeSave(read.envelope));
        return { ok: true };
      } catch {
        return { ok: false, error: "store" };
      }
    },
    [saveStore, fileTransfer],
  );

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

  const continueInfo = useMemo<ContinueInfo | null>(
    () => (candidate ? continueInfoOf(candidate.career, candidate.envelope) : null),
    [candidate],
  );

  const value = useMemo<CareerStore>(
    () => ({
      career,
      startCareer,
      completeMatch,
      setLineup,
      setTactics,
      autoPickLineup,
      startNextSeason: rollOver,
      buyPlayer,
      signFreeAgent,
      acceptOffer,
      releasePlayer,
      saveStatus,
      lastSavedAt,
      continueAvailable: candidate !== null,
      continueInfo,
      loadAutosave,
      loadError,
      dismissLoadError,
      discardLoadError,
      startupChecked,
      listSlots,
      saveToSlot,
      loadSlot,
      deleteSlot,
      exportSlot,
      exportCareer,
      pickImport,
      importOffer,
      importError,
      cancelImport,
      importInto,
      lastImportedSlot,
    }),
    [
      career,
      startCareer,
      completeMatch,
      setLineup,
      setTactics,
      autoPickLineup,
      rollOver,
      buyPlayer,
      signFreeAgent,
      acceptOffer,
      releasePlayer,
      saveStatus,
      lastSavedAt,
      candidate,
      continueInfo,
      loadAutosave,
      loadError,
      dismissLoadError,
      discardLoadError,
      startupChecked,
      listSlots,
      saveToSlot,
      loadSlot,
      deleteSlot,
      exportSlot,
      exportCareer,
      pickImport,
      importOffer,
      importError,
      cancelImport,
      importInto,
      lastImportedSlot,
    ],
  );
  return <CareerContext.Provider value={value}>{children}</CareerContext.Provider>;
}

export function useCareer(): CareerStore {
  const value = useContext(CareerContext);
  if (!value) throw new Error("useCareer must be used inside CareerProvider");
  return value;
}
