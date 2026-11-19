import {
  type MatchSessionLoad,
  type MatchSessionStore,
  readStoredSession,
} from "./match-session-store";

export const MATCH_SESSION_STORAGE_KEY = "touchline.match-session";

/**
 * `MatchSessionStore` on `localStorage` (a session is a few kilobytes). Reading a blocked storage
 * gives no session; writing to one rejects, and the match goes on without being resumable.
 */
export function createBrowserMatchSessionStore(
  storage: () => Storage = () => window.localStorage,
): MatchSessionStore {
  return {
    load: async (): Promise<MatchSessionLoad> => {
      try {
        return readStoredSession(storage().getItem(MATCH_SESSION_STORAGE_KEY));
      } catch {
        return { kind: "none" };
      }
    },
    save: async (session) => {
      storage().setItem(MATCH_SESSION_STORAGE_KEY, JSON.stringify(session));
    },
    clear: async () => {
      storage().removeItem(MATCH_SESSION_STORAGE_KEY);
    },
  };
}
