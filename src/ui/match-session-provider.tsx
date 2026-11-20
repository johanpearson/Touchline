import {
  createContext,
  type MutableRefObject,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type Career,
  getNextFixture,
  isSessionOfCareer,
  type MatchSession,
  type MatchSessionError,
} from "../game";
import type { MatchSessionStore } from "../platform";

export type MatchSessions = {
  /** The session the store held when the app started, or null; it never changes afterwards. */
  initial: MatchSession | null;
  /** The stored session when the store was last read or a different match was saved; may lag the latest save. */
  session: MatchSession | null;
  /** The latest session written, read from a ref so it never rerenders anyone. */
  latest: () => MatchSession | null;
  /** Why the store refused what it held on startup (it has been cleared), or null. */
  refused: MatchSessionError | null;
  /** Whether the latest write of the session was refused by the storage, so the match is not resumable. */
  writeFailed: boolean;
  /** Writes the session. A failing storage never blocks play; it only sets `writeFailed`. */
  save: (session: MatchSession) => void;
  /** Deletes the session, when the result is recorded or another career is loaded. */
  clear: () => void;
};

const NO_SESSIONS: MatchSessions = {
  initial: null,
  session: null,
  latest: () => null,
  refused: null,
  writeFailed: false,
  save: () => undefined,
  clear: () => undefined,
};

const MatchSessionContext = createContext<MatchSessions>(NO_SESSIONS);

type State = {
  initial: MatchSession | null;
  session: MatchSession | null;
  refused: MatchSessionError | null;
};

/** Whether `a` and `b` are the same match; saves of the same match do not rerender the app. */
const sameMatch = (a: MatchSession | null, b: MatchSession | null): boolean =>
  a === b ||
  (a !== null &&
    b !== null &&
    a.careerSeed === b.careerSeed &&
    a.season === b.season &&
    a.fixtureId === b.fixtureId);

/** Reads the store once; a refused session is cleared from it, and the reason kept for a toast. */
const useStoredSession = (
  store: MatchSessionStore,
  latest: MutableRefObject<MatchSession | null>,
) => {
  const [state, setState] = useState<State>({ initial: null, session: null, refused: null });
  useEffect(() => {
    let cancelled = false;
    store.load().then(
      (loaded) => {
        if (cancelled) return;
        if (loaded.kind === "refused") void store.clear().catch(() => undefined);
        const found = loaded.kind === "found" ? loaded.session : null;
        if (found) latest.current = found;
        const refused = loaded.kind === "refused" ? loaded.error : null;
        setState({ initial: found, session: found, refused });
      },
      () => undefined,
    );
    return () => {
      cancelled = true;
    };
  }, [store, latest]);
  return [state, setState] as const;
};

/**
 * Keeps the match in progress, one at most, behind the `MatchSessionStore`. Without a provider the
 * app behaves as if no store existed: nothing is kept.
 */
export function MatchSessionProvider({
  store,
  children,
}: {
  store: MatchSessionStore;
  children: ReactNode;
}) {
  const latest = useRef<MatchSession | null>(null);
  const [state, setState] = useStoredSession(store, latest);
  const [writeFailed, setWriteFailed] = useState(false);
  const writes = useRef(0);

  const save = useCallback(
    (session: MatchSession) => {
      latest.current = session;
      const write = ++writes.current;
      // Only the latest write counts, so a slow older write cannot overrule a newer one.
      const settle = (failed: boolean) => {
        if (write === writes.current) setWriteFailed(failed);
      };
      store.save(session).then(
        () => settle(false),
        () => settle(true),
      );
      setState((s) => (sameMatch(s.session, session) ? s : { ...s, session }));
    },
    [store, setState],
  );
  const clear = useCallback(() => {
    latest.current = null;
    writes.current++;
    setWriteFailed(false);
    void store.clear().catch(() => undefined);
    setState((s) => (s.session || s.refused ? { ...s, session: null, refused: null } : s));
  }, [store, setState]);

  const value = useMemo<MatchSessions>(
    () => ({ ...state, writeFailed, latest: () => latest.current, save, clear }),
    [state, writeFailed, save, clear],
  );
  return <MatchSessionContext.Provider value={value}>{children}</MatchSessionContext.Provider>;
}

export function useMatchSessions(): MatchSessions {
  return useContext(MatchSessionContext);
}

/** Whether a match of the career's next fixture is in progress. Cheap, so the header and nav can ask. */
export function useMatchInProgress(career: Career | null): boolean {
  const { session } = useMatchSessions();
  if (!career || !session) return false;
  const next = getNextFixture(career.season, career.userClubId);
  return isSessionOfCareer(session, career) && next?.id === session.fixtureId;
}
