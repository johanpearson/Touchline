import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Route } from "../routes";

/** The screens that open as panels over the match instead of replacing it. */
export type MatchPanel = "squad" | "tactics";

export type MatchLock = {
  /** A match is on screen and not over: it is the only screen of the career. */
  locked: boolean;
  /** The panel open over the match, if any. */
  panel: MatchPanel | null;
  openPanel: (panel: MatchPanel) => void;
  closePanel: () => void;
  /** Called by the match screen while the match runs. */
  setLocked: (locked: boolean) => void;
};

const NOT_LOCKED: MatchLock = {
  locked: false,
  panel: null,
  openPanel: () => undefined,
  closePanel: () => undefined,
  setLocked: () => undefined,
};

const MatchLockContext = createContext<MatchLock>(NOT_LOCKED);

/** Holds whether the match screen is locked and which panel is open over it. */
export function MatchLockProvider({ children }: { children: ReactNode }) {
  const [locked, setLockedState] = useState(false);
  const [panel, setPanel] = useState<MatchPanel | null>(null);
  const setLocked = useCallback((next: boolean) => {
    setLockedState(next);
    if (!next) setPanel(null);
  }, []);
  const closePanel = useCallback(() => setPanel(null), []);
  const value = useMemo<MatchLock>(
    () => ({ locked, panel, openPanel: setPanel, closePanel, setLocked }),
    [locked, panel, closePanel, setLocked],
  );
  return <MatchLockContext.Provider value={value}>{children}</MatchLockContext.Provider>;
}

/** Without a provider (a screen on its own) nothing is ever locked. */
export const useMatchLock = (): MatchLock => useContext(MatchLockContext);

/** Locks the career to the match screen while `active`. */
export function useLockMatch(active: boolean): void {
  const { setLocked } = useMatchLock();
  useEffect(() => {
    if (!active) return;
    setLocked(true);
    return () => setLocked(false);
  }, [active, setLocked]);
}

/** The panel a route opens during a match, or null for a route that leaves the match. */
export const panelOfRoute = (route: Route): MatchPanel | null =>
  route.name === "squad" || route.name === "tactics" ? route.name : null;

/**
 * What a link to `route` does right now: the function that opens its panel when the match is locked
 * and the route is a panel, or undefined when the link should navigate as usual.
 */
export const panelOpener = (lock: MatchLock, route: Route): (() => void) | undefined => {
  const panel = panelOfRoute(route);
  return lock.locked && panel ? () => lock.openPanel(panel) : undefined;
};
