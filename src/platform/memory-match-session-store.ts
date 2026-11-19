import { type MatchSessionStore, readStoredSession } from "./match-session-store";

/** In-memory `MatchSessionStore` for tests. `raw` is the text it starts with, for damaged data. */
export function createMemoryMatchSessionStore(raw: string | null = null): MatchSessionStore {
  let stored = raw;
  return {
    load: async () => readStoredSession(stored),
    save: async (session) => {
      stored = JSON.stringify(session);
    },
    clear: async () => {
      stored = null;
    },
  };
}
