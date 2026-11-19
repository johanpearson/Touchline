import { describe, expect, it } from "vitest";
import { identityOf, MATCH_SESSION_VERSION, type MatchSession } from "../game";
import { aCareer } from "../game/career-builders";
import type { MatchSessionStore } from "./match-session-store";

const career = aCareer(1);
const fixture = career.season.fixtures[0];
if (!fixture) throw new Error("no fixture");

export const aMatchSession = (matchTime = 600): MatchSession => ({
  ...identityOf(career, fixture),
  mode: "extended",
  changes: [],
  position: { matchTime, period: "firstHalf" },
});

/**
 * Behaviour every `MatchSessionStore` implementation must have. `createStore(raw)` makes a store
 * that already holds the text `raw`, which the contract uses to hand the store damaged data.
 */
export function runMatchSessionStoreContract(
  name: string,
  createStore: (raw?: string) => MatchSessionStore,
): void {
  describe(`${name} satisfies the MatchSessionStore contract`, () => {
    it("holds no session when empty", async () => {
      expect(await createStore().load()).toEqual({ kind: "none" });
    });

    it("loads what was saved", async () => {
      const store = createStore();
      await store.save(aMatchSession(900));
      expect(await store.load()).toEqual({ kind: "found", session: aMatchSession(900) });
    });

    it("replaces the session it holds", async () => {
      const store = createStore();
      await store.save(aMatchSession(100));
      await store.save(aMatchSession(200));
      expect(await store.load()).toEqual({ kind: "found", session: aMatchSession(200) });
    });

    it("clears the session, and clearing nothing is not an error", async () => {
      const store = createStore();
      await store.save(aMatchSession());
      await store.clear();
      expect(await store.load()).toEqual({ kind: "none" });
      await expect(store.clear()).resolves.toBeUndefined();
    });

    it("is not affected by later changes to the saved object", async () => {
      const store = createStore();
      const session = aMatchSession(100);
      await store.save(session);
      session.position.matchTime = 999;
      expect(await store.load()).toEqual({ kind: "found", session: aMatchSession(100) });
    });

    it("refuses a session of another version", async () => {
      const raw = JSON.stringify({ ...aMatchSession(), schemaVersion: MATCH_SESSION_VERSION + 1 });
      expect(await createStore(raw).load()).toEqual({ kind: "refused", error: "unknown-version" });
    });

    it.each([
      ["text that is not JSON", "{not json"],
      ["JSON of another shape", JSON.stringify({ schemaVersion: MATCH_SESSION_VERSION, seed: 1 })],
    ])("refuses %s without throwing", async (_what, raw) => {
      expect(await createStore(raw).load()).toEqual({ kind: "refused", error: "corrupt" });
    });

    it("loads again after a refusal once something valid is saved", async () => {
      const store = createStore("{not json");
      await store.save(aMatchSession(300));
      expect(await store.load()).toEqual({ kind: "found", session: aMatchSession(300) });
    });
  });
}
