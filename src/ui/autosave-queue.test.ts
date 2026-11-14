import { describe, expect, it } from "vitest";
import { CURRENT_SCHEMA_VERSION, createMemorySaveStore } from "../platform";
import type { SaveEnvelope, SaveStore } from "../shared";
import { AUTOSAVE_SLOT, createAutosaveQueue } from "./autosave-queue";

const clockFrom = (...times: string[]) => {
  let index = 0;
  return () => times[Math.min(index++, times.length - 1)] ?? "";
};

/** A store whose writes finish only when the test says so, so interleaving can be observed. */
const aDelayedStore = () => {
  const inner = createMemorySaveStore();
  const log: string[] = [];
  const releases: Array<() => void> = [];
  let running = 0;
  let maxRunning = 0;
  const store: SaveStore = {
    ...inner,
    save: async (id, data) => {
      running += 1;
      maxRunning = Math.max(maxRunning, running);
      log.push(`start:${String(data.game)}`);
      await new Promise<void>((resolve) => releases.push(resolve));
      await inner.save(id, data);
      log.push(`end:${String(data.game)}`);
      running -= 1;
    },
  };
  return { store, log, releases, maxRunning: () => maxRunning };
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("autosave queue", () => {
  it("writes the game to the autosave slot with the injected time as createdAt", async () => {
    const store = createMemorySaveStore();
    const queue = createAutosaveQueue(store, clockFrom("2026-01-01T10:00:00.000Z"));

    await queue.save("career-1", "new");

    expect(await store.load(AUTOSAVE_SLOT)).toEqual({
      schemaVersion: CURRENT_SCHEMA_VERSION,
      createdAt: "2026-01-01T10:00:00.000Z",
      savedAt: "2026-01-01T10:00:00.000Z",
      game: "career-1",
    });
  });

  it("keeps createdAt when the same career is saved again", async () => {
    const store = createMemorySaveStore();
    const queue = createAutosaveQueue(store, clockFrom("2026-01-01T10:00:00.000Z", "2027-01-01"));

    await queue.save("first", "new");
    await queue.save("second", "continue");

    const saved = await store.load(AUTOSAVE_SLOT);
    expect(saved?.createdAt).toBe("2026-01-01T10:00:00.000Z");
    expect(saved?.savedAt).toBe("2027-01-01");
    expect(saved?.game).toBe("second");
  });

  it("starts a new createdAt when a new career replaces the old one", async () => {
    const store = createMemorySaveStore();
    const queue = createAutosaveQueue(store, clockFrom("2026-01-01", "2027-01-01"));

    await queue.save("old", "new");
    await queue.save("fresh", "new");

    expect((await store.load(AUTOSAVE_SLOT))?.createdAt).toBe("2027-01-01");
  });

  it("keeps the createdAt of an adopted save", async () => {
    const store = createMemorySaveStore();
    const queue = createAutosaveQueue(store, clockFrom("2099-01-01"));
    const loaded: SaveEnvelope = {
      schemaVersion: CURRENT_SCHEMA_VERSION,
      createdAt: "2025-05-05",
      savedAt: "2025-06-06",
      game: "loaded",
    };

    queue.adopt(loaded);
    await queue.save("next", "continue");

    const saved = await store.load(AUTOSAVE_SLOT);
    expect(saved?.createdAt).toBe("2025-05-05");
    expect(saved?.savedAt).toBe("2099-01-01");
  });

  it("never runs two writes at once and lets the last state win", async () => {
    const { store, log, releases, maxRunning } = aDelayedStore();
    const queue = createAutosaveQueue(store, clockFrom("2026-01-01"));

    const saves = [
      queue.save("A", "new"),
      queue.save("B", "continue"),
      queue.save("C", "continue"),
    ];
    await flush();
    expect(log).toEqual(["start:A"]);
    for (let i = 0; i < 3; i += 1) {
      releases[i]?.();
      await flush();
    }
    await Promise.all(saves);

    expect(log).toEqual(["start:A", "end:A", "start:B", "end:B", "start:C", "end:C"]);
    expect(maxRunning()).toBe(1);
    expect((await store.load(AUTOSAVE_SLOT))?.game).toBe("C");
  });

  it("rejects a failed save but still performs later ones", async () => {
    const inner = createMemorySaveStore();
    let fail = true;
    const store: SaveStore = {
      ...inner,
      save: async (id, data) => {
        if (fail) throw new Error("disk full");
        await inner.save(id, data);
      },
    };
    const queue = createAutosaveQueue(store, clockFrom("2026-01-01"));

    await expect(queue.save("lost", "new")).rejects.toThrow("disk full");
    fail = false;
    await queue.save("kept", "continue");

    expect((await inner.load(AUTOSAVE_SLOT))?.game).toBe("kept");
  });
});
