import { useCallback, useEffect, useState } from "react";
import type { SaveStore } from "../shared";
import {
  type ContinueCandidate,
  type ContinueError,
  findContinueCandidate,
} from "./find-continue-candidate";
import type { SlotActionResult } from "./save-slots";

export type FoundCandidate = Extract<ContinueCandidate, { kind: "found" }>;

type State = {
  candidate: FoundCandidate | null;
  loadError: ContinueError | null;
  loadErrorSlot: string | null;
  checked: boolean;
};

const UNCHECKED: State = { candidate: null, loadError: null, loadErrorSlot: null, checked: false };

const stateOf = (found: ContinueCandidate): State => ({
  candidate: found.kind === "found" ? found : null,
  loadError: found.kind === "error" ? found.error : null,
  loadErrorSlot: found.kind === "error" ? (found.slotId ?? null) : null,
  checked: true,
});

/** The save found on startup (or why none could be used) and the ways to clear or discard it. */
export function useContinueCandidate(saveStore: SaveStore) {
  const [state, setState] = useState<State>(UNCHECKED);

  useEffect(() => {
    let cancelled = false;
    void findContinueCandidate(saveStore).then((found) => {
      if (!cancelled) setState(stateOf(found));
    });
    return () => {
      cancelled = true;
    };
  }, [saveStore]);

  /** A career was started or loaded: nothing is left to continue and no error to show. */
  const clear = useCallback(
    () => setState((s) => ({ ...s, candidate: null, loadError: null })),
    [],
  );
  const dismissError = useCallback(() => setState((s) => ({ ...s, loadError: null })), []);
  const discardError = useCallback(async (): Promise<SlotActionResult> => {
    if (state.loadErrorSlot === null) return { ok: false, error: "unknown-slot" };
    try {
      await saveStore.delete(state.loadErrorSlot);
      setState(stateOf(await findContinueCandidate(saveStore)));
      return { ok: true };
    } catch {
      return { ok: false, error: "store" };
    }
  }, [state.loadErrorSlot, saveStore]);

  return { ...state, clear, dismissError, discardError };
}
