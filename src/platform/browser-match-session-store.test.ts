import { beforeEach, describe, expect, it } from "vitest";
import {
  createBrowserMatchSessionStore,
  MATCH_SESSION_STORAGE_KEY,
} from "./browser-match-session-store";
import { aMatchSession, runMatchSessionStoreContract } from "./match-session-store-contract";

beforeEach(() => window.localStorage.clear());

runMatchSessionStoreContract("browser match session store", (raw) => {
  window.localStorage.clear();
  if (raw !== undefined) window.localStorage.setItem(MATCH_SESSION_STORAGE_KEY, raw);
  return createBrowserMatchSessionStore();
});

const blocked = (): Storage => {
  throw new Error("blocked");
};

describe("browser match session store", () => {
  it("keeps the session between store instances, under one key", async () => {
    await createBrowserMatchSessionStore().save(aMatchSession(42));
    expect(await createBrowserMatchSessionStore().load()).toEqual({
      kind: "found",
      session: aMatchSession(42),
    });
    expect(window.localStorage.getItem(MATCH_SESSION_STORAGE_KEY)).not.toBeNull();
  });

  it("finds no session, without throwing, when storage is blocked", async () => {
    expect(await createBrowserMatchSessionStore(blocked).load()).toEqual({ kind: "none" });
  });

  it("rejects a write when storage is blocked", async () => {
    await expect(createBrowserMatchSessionStore(blocked).save(aMatchSession())).rejects.toThrow();
  });
});
