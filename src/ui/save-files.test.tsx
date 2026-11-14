import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateLeague, parseCareer } from "../game";
import {
  createMemoryFileTransfer,
  createMemoryLocaleStore,
  createMemorySaveStore,
  MAX_SAVE_FILE_BYTES,
  parseSaveFile,
  saveFileName,
} from "../platform";
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
  const files = createMemoryFileTransfer();
  render(
    <App
      createRenderer={createRenderer}
      localeStore={createMemoryLocaleStore(locale)}
      saveStore={store}
      fileTransfer={files}
      now={aClock()}
      initialSeed={SEED}
      tickMs={1000}
    />,
  );
  return { store, files };
};

const firstClub = () => {
  const league = generateLeague({ seed: SEED });
  const club = league.ok ? league.league.clubs[0] : undefined;
  if (!club) throw new Error("club");
  return club;
};

const startCareer = () => {
  fireEvent.click(screen.getByTestId(`club-option-${firstClub().id}`));
  fireEvent.click(screen.getByTestId("start-career"));
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
const careerOf = (envelope: SaveEnvelope | null) => {
  const parsed = parseCareer(envelope?.game);
  if (!parsed.ok) throw new Error("invalid");
  return parsed.career;
};

/** Starts a career, saves it into slot-1 and returns the exported file text. */
const exportedSave = async (
  store: SaveStore,
  files: ReturnType<typeof createMemoryFileTransfer>,
) => {
  startCareer();
  await openSaves();
  fireEvent.click(screen.getByTestId("save-slot-1"));
  await waitFor(() => expect(info("slot-1")).toContain(firstClub().name));
  fireEvent.click(screen.getByTestId("export-slot-1"));
  await waitFor(() => expect(files.downloads.length).toBeGreaterThan(0));
  const file = files.downloads.at(-1);
  if (!file) throw new Error("no download");
  expect(await store.load("slot-1")).not.toBeNull();
  return file;
};

const importFile = async (
  files: ReturnType<typeof createMemoryFileTransfer>,
  text: string,
  slot?: string,
) => {
  files.queueFile({ name: "in.json", text });
  fireEvent.click(screen.getByTestId("import-file"));
  if (slot) fireEvent.click(await screen.findByTestId(`import-into-${slot}`));
};

describe("exporting and importing saves", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    goTo("#/");
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("exports a filled slot as the stored envelope under the standard file name", async () => {
    const { store, files } = mountApp();
    startCareer();
    quickSim();
    await openSaves();
    fireEvent.click(screen.getByTestId("save-slot-1"));
    await waitFor(() => expect(info("slot-1")).toMatch(/matchday 2/));

    fireEvent.click(screen.getByTestId("export-slot-1"));

    await waitFor(() => expect(files.downloads).toHaveLength(1));
    const [file] = files.downloads;
    expect(file?.name).toBe(saveFileName({ clubName: firstClub().name, season: 1, matchday: 2 }));
    const parsed = parseSaveFile(file?.text ?? "");
    expect(parsed.ok && parsed.save).toEqual(await store.load("slot-1"));
    expect(file?.text).toContain("\n  ");
  });

  it("offers no export on empty slots", async () => {
    mountApp();
    startCareer();
    await openSaves();

    expect(screen.queryByTestId("export-slot-1")).toBeNull();
    expect(await screen.findByTestId("export-autosave")).toBeTruthy();
  });

  it("exports the running career and hides that button without a career", async () => {
    const { files } = mountApp();
    await openSaves();
    expect(screen.queryByTestId("export-career")).toBeNull();

    goTo("#/");
    startCareer();
    quickSim();
    await openSaves();
    fireEvent.click(screen.getByTestId("export-career"));

    const [file] = files.downloads;
    expect(file?.name).toBe(saveFileName({ clubName: firstClub().name, season: 1, matchday: 2 }));
    const parsed = parseSaveFile(file?.text ?? "");
    expect(parsed.ok && careerOf(parsed.save).season.currentMatchday).toBe(2);
  });

  it("imports an exported file into another slot and loads the same career", async () => {
    const { store, files } = mountApp();
    const file = await exportedSave(store, files);
    const original = careerOf(await store.load("slot-1"));
    const originalEnvelope = await store.load("slot-1");

    await importFile(files, file.text, "slot-2");

    await waitFor(() => expect(info("slot-2")).toContain(firstClub().name));
    const stored = await store.load("slot-2");
    expect(stored?.createdAt).toBe(originalEnvelope?.createdAt);
    quickSim();
    await openSaves();
    fireEvent.click(screen.getByTestId("load-slot-2"));
    await waitFor(() => expect(window.location.hash).toBe("#/"));
    expect(careerOf(stored)).toEqual(original);
  });

  it("highlights the imported slot", async () => {
    const { store, files } = mountApp();
    const file = await exportedSave(store, files);

    await importFile(files, file.text, "slot-3");

    await waitFor(() =>
      expect(screen.getByTestId("slot-slot-3").getAttribute("data-highlighted")).toBe("true"),
    );
    expect(screen.getByTestId("slot-slot-1").getAttribute("data-highlighted")).toBeNull();
  });

  it("only offers manual slots as import targets", async () => {
    const { store, files } = mountApp();
    const file = await exportedSave(store, files);

    await importFile(files, file.text);

    await screen.findByTestId("import-into-slot-1");
    expect(screen.getByTestId("import-into-slot-3")).toBeTruthy();
    expect(screen.queryByTestId("import-into-autosave")).toBeNull();
  });

  it("confirms before overwriting a used slot and keeps it when cancelled", async () => {
    const { store, files } = mountApp();
    const file = await exportedSave(store, files);
    quickSim();
    await openSaves();
    fireEvent.click(screen.getByTestId("save-slot-2"));
    await waitFor(() => expect(info("slot-2")).toMatch(/matchday 2/));

    await importFile(files, file.text, "slot-2");
    expect(screen.getByTestId("confirm-import-overwrite")).toBeTruthy();
    fireEvent.click(screen.getByTestId("import-confirm-no"));
    expect((await store.load("slot-2"))?.game).not.toEqual((await store.load("slot-1"))?.game);

    fireEvent.click(screen.getByTestId("import-into-slot-2"));
    fireEvent.click(screen.getByTestId("import-confirm-yes"));
    await waitFor(() => expect(info("slot-2")).toMatch(/matchday 1/));
  });

  it("cancelling the picker is silent", async () => {
    mountApp();
    startCareer();
    await openSaves();

    fireEvent.click(screen.getByTestId("import-file"));
    await act(async () => {});

    expect(screen.queryByTestId("import-error")).toBeNull();
    expect(screen.queryByTestId("import-picker")).toBeNull();
  });

  const tooLarge = "x".repeat(MAX_SAVE_FILE_BYTES + 1);
  const failures: [string, () => Promise<string>, string][] = [
    ["not JSON", async () => "{nope", "not a JSON"],
    ["not a Touchline save", async () => JSON.stringify({ hello: 1 }), "not a Touchline save"],
    [
      "newer version",
      async () => JSON.stringify({ schemaVersion: 9999, createdAt: "x", savedAt: "x", game: {} }),
      "newer version",
    ],
    ["too large", async () => tooLarge, "too large"],
    [
      "corrupt career",
      async () =>
        JSON.stringify({
          schemaVersion: 2,
          createdAt: "2026-01-01T00:00:00.000Z",
          savedAt: "2026-01-01T00:00:00.000Z",
          game: { nonsense: true },
        }),
      "damaged",
    ],
  ];

  it.each(failures)("rejects a file that is %s and stores nothing", async (_name, text, shown) => {
    const { store, files } = mountApp();
    startCareer();
    await openSaves();

    await importFile(files, await text());

    const error = await screen.findByTestId("import-error");
    expect(error.textContent).toContain(shown);
    expect(screen.queryByTestId("import-picker")).toBeNull();
    expect(await store.load("slot-1")).toBeNull();
    expect(await store.load("slot-2")).toBeNull();
  });

  it("shows distinct texts for each failure", async () => {
    const { files } = mountApp();
    startCareer();
    await openSaves();
    const texts = new Set<string>();
    for (const [, text] of failures) {
      await importFile(files, await text());
      texts.add((await screen.findByTestId("import-error")).textContent ?? "");
      fireEvent.click(screen.getByTestId("import-file"));
    }
    expect(texts.size).toBe(failures.length);
  });

  it("imports from the new-career screen and lands on the saves screen with the slot highlighted", async () => {
    const first = mountApp();
    const file = await exportedSave(first.store, first.files);
    cleanup();
    goTo("#/");

    const second = mountApp();
    await screen.findByTestId("new-career");
    await importFile(second.files, file.text);
    await screen.findByTestId("import-picker");
    expect(window.location.hash).toBe("#/saves");
    fireEvent.click(await screen.findByTestId("import-into-slot-1"));

    await waitFor(() =>
      expect(screen.getByTestId("slot-slot-1").getAttribute("data-highlighted")).toBe("true"),
    );
    expect(info("slot-1")).toContain(firstClub().name);
    expect(await second.store.load("slot-1")).not.toBeNull();
  });

  it("shows import errors on the new-career screen", async () => {
    const { files } = mountApp();
    await screen.findByTestId("new-career");

    await importFile(files, "{nope");

    expect((await screen.findByTestId("import-error")).textContent).toContain("not a JSON");
    expect(window.location.hash).not.toBe("#/saves");
  });

  it("shows the Swedish texts", async () => {
    const { files } = mountApp(undefined, "sv");
    startCareer();
    await openSaves();

    await importFile(files, "{nope");

    expect((await screen.findByTestId("import-error")).textContent).toContain("inte JSON");
  });
});
