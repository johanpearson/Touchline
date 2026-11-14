import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateLeague, parseCareer } from "../game";
import { createMemoryLocaleStore, createMemorySaveStore } from "../platform";
import type { SaveEnvelope, SaveStore } from "../shared";
import { App } from "./app";

const SEED = 11;
const createRenderer = () => ({ resize: vi.fn(), render: vi.fn(), dispose: vi.fn() });

const goTo = (hash: string) =>
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });

const aClock = () => {
  let tick = 0;
  return () => new Date(Date.UTC(2026, 0, 1, 12, tick++)).toISOString();
};

const mountApp = (store: SaveStore = createMemorySaveStore(), locale?: string) => {
  render(
    <App
      createRenderer={createRenderer}
      localeStore={createMemoryLocaleStore(locale)}
      saveStore={store}
      now={aClock()}
      initialSeed={SEED}
      tickMs={1000}
    />,
  );
  return store;
};

const firstClub = () => {
  const league = generateLeague({ seed: SEED });
  const club = league.ok ? league.league.clubs[0] : undefined;
  if (!club) throw new Error("club");
  return club;
};

const startCareer = () => {
  const club = firstClub();
  fireEvent.click(screen.getByTestId(`club-option-${club.id}`));
  fireEvent.click(screen.getByTestId("start-career"));
  return club;
};

const quickSim = () => {
  goTo("#/");
  fireEvent.click(screen.getByTestId("quick-sim"));
  goTo("#/");
};

const openSaves = async () => {
  goTo("#/saves");
  await screen.findByTestId("slot-slot-1");
};

const info = (id: string) => screen.getByTestId(`slot-info-${id}`).textContent ?? "";
const matchdayOf = (envelope: SaveEnvelope | null) => {
  const parsed = parseCareer(envelope?.game);
  if (!parsed.ok) throw new Error("invalid");
  return parsed.career.season.currentMatchday;
};

describe("saves screen", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    goTo("#/");
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows the autosave and three empty manual slots", async () => {
    mountApp();
    startCareer();
    await openSaves();

    await waitFor(() => expect(info("autosave")).toContain(firstClub().name));
    expect(info("autosave")).toMatch(/season 1, matchday 1/);
    for (const id of ["slot-1", "slot-2", "slot-3"]) expect(info(id)).toBe("Empty slot");
    expect(screen.queryByTestId("save-autosave")).toBeNull();
  });

  it("saves the running career into an empty slot without asking", async () => {
    const store = mountApp();
    startCareer();
    quickSim();
    await openSaves();

    fireEvent.click(screen.getByTestId("save-slot-1"));

    await waitFor(() => expect(info("slot-1")).toContain(firstClub().name));
    expect(info("slot-1")).toMatch(/matchday 2/);
    expect(matchdayOf(await store.load("slot-1"))).toBe(2);
  });

  it("asks before overwriting a used slot and keeps it when cancelled", async () => {
    const store = mountApp();
    startCareer();
    await openSaves();
    fireEvent.click(screen.getByTestId("save-slot-1"));
    await waitFor(() => expect(info("slot-1")).toMatch(/matchday 1/));
    quickSim();
    await openSaves();

    fireEvent.click(screen.getByTestId("save-slot-1"));
    expect(screen.getByTestId("confirm-overwrite")).toBeTruthy();
    fireEvent.click(screen.getByTestId("confirm-no"));

    expect(screen.queryByTestId("confirm-overwrite")).toBeNull();
    expect(document.activeElement).toBe(screen.getByTestId("save-slot-1"));
    expect(matchdayOf(await store.load("slot-1"))).toBe(1);

    fireEvent.click(screen.getByTestId("save-slot-1"));
    fireEvent.click(screen.getByTestId("confirm-yes"));
    await waitFor(async () => expect(matchdayOf(await store.load("slot-1"))).toBe(2));
  });

  it("loads a slot, replaces the running career and goes to the hub", async () => {
    mountApp();
    startCareer();
    await openSaves();
    fireEvent.click(screen.getByTestId("save-slot-1"));
    await waitFor(() => expect(info("slot-1")).toMatch(/matchday 1/));
    quickSim();
    expect(screen.getByTestId("nav-progress").textContent).toMatch(/matchday 2/);
    await openSaves();

    fireEvent.click(screen.getByTestId("load-slot-1"));

    await waitFor(() => expect(window.location.hash).toBe("#/"));
    await waitFor(() =>
      expect(screen.getByTestId("nav-progress").textContent).toMatch(/matchday 1/),
    );
  });

  it("deletes a slot only after confirmation", async () => {
    const store = mountApp();
    startCareer();
    await openSaves();
    fireEvent.click(screen.getByTestId("save-slot-2"));
    await waitFor(() => expect(info("slot-2")).toContain(firstClub().name));

    fireEvent.click(screen.getByTestId("delete-slot-2"));
    expect(screen.getByTestId("confirm-delete")).toBeTruthy();
    expect(await store.load("slot-2")).not.toBeNull();
    fireEvent.click(screen.getByTestId("confirm-yes"));

    await waitFor(() => expect(info("slot-2")).toBe("Empty slot"));
    expect(await store.load("slot-2")).toBeNull();
  });

  it("shows a corrupt slot with only a delete action and keeps the others usable", async () => {
    const store = createMemorySaveStore();
    await store.save("slot-3", {
      schemaVersion: 1,
      createdAt: "2026-01-01T00:00:00Z",
      savedAt: "2026-01-01T00:00:00Z",
      game: 42,
    });
    mountApp(store);
    startCareer();
    await openSaves();

    expect(info("slot-3")).toBe("Corrupt save");
    expect(screen.getByTestId("delete-slot-3")).toBeTruthy();
    expect(screen.queryByTestId("save-slot-3")).toBeNull();
    expect(screen.queryByTestId("load-slot-3")).toBeNull();
    expect(info("slot-1")).toBe("Empty slot");
  });

  it("explains a slot saved by a newer version", async () => {
    const store = createMemorySaveStore();
    await store.save("slot-1", {
      schemaVersion: 9999,
      createdAt: "2026-01-01T00:00:00Z",
      savedAt: "2026-01-01T00:00:00Z",
      game: {},
    });
    mountApp(store);
    await openSaves();

    expect(info("slot-1")).toBe("Saved by a newer version");
    expect(screen.queryByTestId("load-slot-1")).toBeNull();
  });

  it("works without a career: only loading is possible", async () => {
    const store = createMemorySaveStore();
    const source = mountApp(store);
    startCareer();
    await openSaves();
    fireEvent.click(screen.getByTestId("save-slot-1"));
    await waitFor(() => expect(info("slot-1")).toContain(firstClub().name));
    cleanup();
    goTo("#/saves");
    mountApp(source);
    await screen.findByTestId("slot-slot-1");

    expect(screen.getByTestId("saves-no-career")).toBeTruthy();
    expect(screen.queryByTestId("save-slot-2")).toBeNull();
    fireEvent.click(screen.getByTestId("load-slot-1"));
    await waitFor(() =>
      expect(screen.getByTestId("nav-club-name").textContent).toBe(firstClub().name),
    );
  });

  it("shows an error for a failing action and leaves the other slots untouched", async () => {
    const base = createMemorySaveStore();
    const failing: SaveStore = {
      ...base,
      save: async (id, data) => {
        if (id === "slot-2") throw new Error("disk full");
        return base.save(id, data);
      },
    };
    mountApp(failing);
    startCareer();
    await openSaves();
    fireEvent.click(screen.getByTestId("save-slot-1"));
    await waitFor(() => expect(info("slot-1")).toContain(firstClub().name));

    fireEvent.click(screen.getByTestId("save-slot-2"));

    expect(await screen.findByTestId("slot-error-slot-2")).toBeTruthy();
    expect(info("slot-2")).toBe("Empty slot");
    expect(info("slot-1")).toContain(firstClub().name);
  });

  it("has a Saves link in the navigation and on the new-career screen", async () => {
    mountApp();
    expect(screen.getByTestId("nav-saves").getAttribute("href")).toBe("#/saves");
    startCareer();
    expect(screen.getByTestId("nav-saves").getAttribute("href")).toBe("#/saves");
  });

  it("builds slot rows in Swedish", async () => {
    mountApp(createMemorySaveStore(), "sv");
    await openSaves();
    expect(info("slot-1")).toBe("Tom plats");
  });
});
