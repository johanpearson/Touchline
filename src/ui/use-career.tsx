import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { TeamTactics } from "../engine";
import {
  setLineup as applyLineup,
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
  parseCareer,
  type Result,
  startNextSeason,
} from "../game";
import { createEnvelope, parseSaveFile, saveFileName, serializeSave } from "../platform";
import type { FileTransfer, SaveEnvelope, SaveStore } from "../shared";
import { createAutosaveQueue, type SaveLineage } from "./autosave-queue";
import {
  type ContinueCandidate,
  type ContinueError,
  findContinueCandidate,
} from "./find-continue-candidate";
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

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/** What the Continue button shows about the save it would load. */
export type ContinueInfo = { clubName: string; season: number; matchday: number };

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
  /** Rolls a finished season over to the next one. Returns an error while the season is running. */
  startNextSeason: () => "season-incomplete" | null;
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

type FoundCandidate = Extract<ContinueCandidate, { kind: "found" }>;

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
  const [candidate, setCandidate] = useState<FoundCandidate | null>(null);
  const [loadError, setLoadError] = useState<ContinueError | null>(null);
  const [importOffer, setImportOffer] = useState<ImportOffer | null>(null);
  const [importError, setImportError] = useState<ImportError | null>(null);
  const [lastImportedSlot, setLastImportedSlot] = useState<string | null>(null);

  const nowRef = useRef(now);
  nowRef.current = now;
  const queue = useMemo(() => createAutosaveQueue(saveStore, () => nowRef.current()), [saveStore]);
  const pending = useRef(0);

  useEffect(() => {
    let cancelled = false;
    void findContinueCandidate(saveStore).then((found) => {
      if (cancelled) return;
      if (found.kind === "found") setCandidate(found);
      if (found.kind === "error") setLoadError(found.error);
    });
    return () => {
      cancelled = true;
    };
  }, [saveStore]);

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
      setCandidate(null);
      setLoadError(null);
      setCareer(result.career);
      persist(result.career, "new");
      return null;
    },
    [persist],
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
  const rollOver = useCallback((): "season-incomplete" | null => {
    if (!career) return "season-incomplete";
    const outcome = startNextSeason(career);
    if (!outcome.ok) return outcome.error;
    setCareer(outcome.career);
    persist(outcome.career, "continue");
    return null;
  }, [career, persist]);

  const loadAutosave = useCallback(async (): Promise<boolean> => {
    if (!candidate) return false;
    queue.adopt(candidate.envelope);
    setCareer(candidate.career);
    setCandidate(null);
    return true;
  }, [candidate, queue]);
  const dismissLoadError = useCallback(() => setLoadError(null), []);

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
        setCandidate(null);
        setLoadError(null);
        setCareer(read.career);
        return { ok: true };
      } catch {
        return { ok: false, error: "store" };
      }
    },
    [saveStore, queue],
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

  const continueInfo = useMemo<ContinueInfo | null>(() => {
    if (!candidate) return null;
    const { career: saved } = candidate;
    const club = saved.league.clubs.find((c) => c.id === saved.userClubId);
    return {
      clubName: club?.name ?? saved.userClubId,
      season: saved.season.number,
      matchday: saved.season.currentMatchday,
    };
  }, [candidate]);

  const value = useMemo<CareerStore>(
    () => ({
      career,
      startCareer,
      completeMatch,
      setLineup,
      setTactics,
      autoPickLineup,
      startNextSeason: rollOver,
      saveStatus,
      lastSavedAt,
      continueAvailable: candidate !== null,
      continueInfo,
      loadAutosave,
      loadError,
      dismissLoadError,
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
      saveStatus,
      lastSavedAt,
      candidate,
      continueInfo,
      loadAutosave,
      loadError,
      dismissLoadError,
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
