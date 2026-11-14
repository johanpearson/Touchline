import { describe, expect, it } from "vitest";
import { createCareer, generateLeague } from "../game";
import { createMemorySaveStore } from "../platform";
import type { SaveEnvelope, SaveStore } from "../shared";
import { findContinueCandidate } from "./find-continue-candidate";

const aCareerValue = () => {
  const league = generateLeague({ seed: 5 });
  const clubId = league.ok ? league.league.clubs[0]?.id : undefined;
  if (!clubId) throw new Error("league");
  const result = createCareer({ seed: 5, userClubId: clubId });
  if (!result.ok) throw new Error("career");
  return result.career;
};

const envelope = (game: unknown, createdAt = "2026-01-01", schemaVersion = 1): SaveEnvelope => ({
  schemaVersion,
  createdAt,
  game,
});

describe("findContinueCandidate", () => {
  it("finds nothing in an empty store", async () => {
    expect(await findContinueCandidate(createMemorySaveStore())).toEqual({ kind: "none" });
  });

  it("returns the parsed career of the autosave", async () => {
    const store = createMemorySaveStore();
    const career = aCareerValue();
    await store.save("autosave", envelope(career));

    const found = await findContinueCandidate(store);

    expect(found).toEqual({
      kind: "found",
      slotId: "autosave",
      envelope: envelope(career),
      career,
    });
  });

  it("prefers the autosave over newer manual slots", async () => {
    const store = createMemorySaveStore();
    await store.save("autosave", envelope(aCareerValue(), "2020-01-01"));
    await store.save("slot-1", envelope(aCareerValue(), "2030-01-01"));

    const found = await findContinueCandidate(store);

    expect(found.kind === "found" && found.slotId).toBe("autosave");
  });

  it("falls back to the newest save when the autosave is missing", async () => {
    const store = createMemorySaveStore();
    await store.save("slot-1", envelope(aCareerValue(), "2026-01-01"));
    await store.save("slot-2", envelope(aCareerValue(), "2027-01-01"));
    await store.save("slot-3", envelope({ broken: true }, "2028-01-01"));

    const found = await findContinueCandidate(store);

    expect(found.kind === "found" && found.slotId).toBe("slot-2");
  });

  it("reports a corrupt autosave and does not fall back to another slot", async () => {
    const store = createMemorySaveStore();
    await store.save("autosave", envelope({ broken: true }));
    await store.save("slot-1", envelope(aCareerValue()));

    expect(await findContinueCandidate(store)).toEqual({ kind: "error", error: "invalid-career" });
  });

  it("reports an autosave that is not an envelope", async () => {
    const store = createMemorySaveStore();
    await store.save("autosave", "garbage" as unknown as SaveEnvelope);

    expect(await findContinueCandidate(store)).toEqual({
      kind: "error",
      error: "invalid-envelope",
    });
  });

  it("reports an autosave from a newer version", async () => {
    const store = createMemorySaveStore();
    await store.save("autosave", envelope(aCareerValue(), "2026-01-01", 99));

    expect(await findContinueCandidate(store)).toEqual({ kind: "error", error: "newer-version" });
  });

  it("reports only unusable saves when the autosave is missing", async () => {
    const store = createMemorySaveStore();
    await store.save("slot-1", envelope({ broken: true }));

    expect(await findContinueCandidate(store)).toEqual({ kind: "error", error: "invalid-career" });
  });

  it("reports a store that fails to read", async () => {
    const store: SaveStore = {
      ...createMemorySaveStore(),
      list: async () => {
        throw new Error("blocked");
      },
    };

    expect(await findContinueCandidate(store)).toEqual({ kind: "error", error: "store" });
  });
});
