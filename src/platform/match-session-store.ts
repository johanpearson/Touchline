import { type MatchSession, type MatchSessionError, parseMatchSession } from "../game";

/** What a store holds: nothing, a session, or something it refuses (another version, damaged). */
export type MatchSessionLoad =
  | { kind: "none" }
  | { kind: "found"; session: MatchSession }
  | { kind: "refused"; error: MatchSessionError };

/**
 * Where the match in progress is kept: at most one, because a career plays one match at a time.
 * It is separate from `SaveStore`, so saves and exported save files never contain it. `load` never
 * throws on bad data; `save` and `clear` reject when the storage refuses the write.
 */
export type MatchSessionStore = {
  load: () => Promise<MatchSessionLoad>;
  save: (session: MatchSession) => Promise<void>;
  clear: () => Promise<void>;
};

/** Reads the stored text of a session; `null` means nothing is stored. */
export const readStoredSession = (raw: string | null): MatchSessionLoad => {
  if (raw === null) return { kind: "none" };
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { kind: "refused", error: "corrupt" };
  }
  const parsed = parseMatchSession(value);
  return parsed.ok
    ? { kind: "found", session: parsed.session }
    : { kind: "refused", error: parsed.error };
};
