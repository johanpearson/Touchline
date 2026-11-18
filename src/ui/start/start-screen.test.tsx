import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { type Career, createCareer, generateLeague } from "../../game";
import {
  createEnvelope,
  createMemoryFileTransfer,
  createMemoryLocaleStore,
  createMemorySaveStore,
} from "../../platform";
import type { SaveEnvelope, SaveStore } from "../../shared";
import { App } from "../app";

const SEED = 11;
const NOW = "2026-03-10T12:00:00.000Z";
const TWO_HOURS_AGO = "2026-03-10T10:00:00.000Z";
const createRenderer = () => ({ resize: () => {}, render: () => {}, dispose: () => {} });

const goTo = (hash: string) =>
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });

const aCareer = (clubIndex = 0): Career => {
  const generated = generateLeague({ seed: SEED });
  if (!generated.ok) throw new Error("league");
  const club = generated.league.clubs[clubIndex];
  if (!club) throw new Error("club");
  const created = createCareer({ seed: SEED, userClubId: club.id });
  if (!created.ok) throw new Error("career");
  return created.career;
};

const envelopeAt = (career: Career, savedAt: string): SaveEnvelope => ({
  ...createEnvelope(career, () => savedAt),
  savedAt,
});

const clubName = (career: Career) =>
  career.league.clubs.find((c) => c.id === career.userClubId)?.name ?? "";

const mountApp = (store: SaveStore, locale?: string, files = createMemoryFileTransfer()) => {
  render(
    <App
      createRenderer={createRenderer}
      localeStore={createMemoryLocaleStore(locale)}
      saveStore={store}
      fileTransfer={files}
      now={() => NOW}
      initialSeed={SEED}
      tickMs={1000}
    />,
  );
  return files;
};

const focusableIn = (root: HTMLElement) =>
  Array.from(root.querySelectorAll<HTMLElement>("a[href], button:not([disabled]), select, input"));

describe("start screen", () => {
  beforeEach(() => goTo("#/"));
  afterEach(cleanup);

  describe("without any saved career", () => {
    it("shows the hero, New career and an open load panel with the empty state and import", async () => {
      mountApp(createMemorySaveStore());

      expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("Win the league.");
      expect(screen.getByTestId("new-career-link").getAttribute("href")).toBe("#/new");
      expect(await screen.findByTestId("saved-empty")).toBeTruthy();
      expect(screen.getByTestId("import-file")).toBeTruthy();
      expect(screen.getByTestId("load-toggle").getAttribute("aria-expanded")).toBe("true");
      expect(screen.queryByTestId("continue-career")).toBeNull();
    });

    it("toggles the load panel with aria-expanded", async () => {
      mountApp(createMemorySaveStore());
      await screen.findByTestId("saved-empty");
      const toggle = screen.getByTestId("load-toggle");

      fireEvent.click(toggle);
      expect(toggle.getAttribute("aria-expanded")).toBe("false");
      expect(screen.queryByTestId("saved-careers")).toBeNull();

      fireEvent.click(toggle);
      expect(toggle.getAttribute("aria-expanded")).toBe("true");
      expect(toggle.getAttribute("aria-controls")).toBe(
        screen.getByTestId("saved-careers").getAttribute("id"),
      );
    });

    it("does nothing when Escape is pressed", async () => {
      mountApp(createMemorySaveStore());
      await screen.findByTestId("saved-empty");

      fireEvent.keyDown(document.body, { key: "Escape" });

      expect(screen.getByTestId("saved-careers")).toBeTruthy();
      expect(window.location.hash).toBe("#/");
    });

    it("links the settings button to the settings screen", () => {
      mountApp(createMemorySaveStore());
      const link = screen.getByTestId("nav-settings");
      expect(link.getAttribute("href")).toBe("#/settings");
      expect(link.getAttribute("aria-label")).toBe("Settings");
    });

    it("hides the decorative artwork from assistive technology", () => {
      mountApp(createMemorySaveStore());
      expect(screen.getByTestId("hero-artwork").getAttribute("aria-hidden")).toBe("true");
    });

    it("has no language control", () => {
      mountApp(createMemorySaveStore());
      expect(screen.queryByTestId("locale-switch")).toBeNull();
    });

    it("shows the storage warning when saving is unavailable", () => {
      render(
        <App
          createRenderer={createRenderer}
          localeStore={createMemoryLocaleStore()}
          saveStore={createMemorySaveStore()}
          fileTransfer={createMemoryFileTransfer()}
          now={() => NOW}
          storageAvailable={false}
          initialSeed={SEED}
        />,
      );
      expect(screen.getByTestId("storage-warning")).toBeTruthy();
    });
  });

  describe("with an autosave", () => {
    const seed = async () => {
      const store = createMemorySaveStore();
      const career = aCareer();
      await store.save("autosave", envelopeAt(career, TWO_HOURS_AGO));
      return { store, career };
    };

    it("shows the Continue card with club, round, position and save time", async () => {
      const { store, career } = await seed();
      mountApp(store);

      const card = await screen.findByTestId("continue-career");

      expect(card.textContent).toContain(clubName(career));
      expect(card.textContent).toMatch(/Season 1, round 1, \d+(st|nd|rd|th), saved 2 hours ago/);
    });

    it("writes the Continue card in Swedish", async () => {
      const { store } = await seed();
      mountApp(store, "sv");

      const card = await screen.findByTestId("continue-career");

      expect(card.textContent).toMatch(/Säsong 1, omgång 1, \d+:[ae], sparad för 2 timmar sedan/);
    });

    it("makes the Continue card the first action the keyboard reaches", async () => {
      const { store } = await seed();
      mountApp(store);
      await screen.findByTestId("continue-career");

      const first = focusableIn(screen.getByTestId("start-screen"))[0];

      expect(first).toBe(screen.getByTestId("continue-career"));
    });

    it("keeps the load panel closed and loads the career into the hub", async () => {
      const { store, career } = await seed();
      mountApp(store);

      fireEvent.click(await screen.findByTestId("continue-career"));

      await screen.findByTestId("career-hub");
      expect(screen.getByTestId("hub-club-name").textContent).toBe(clubName(career));
    });

    it("starts closed and lists the saved careers when opened", async () => {
      const { store } = await seed();
      mountApp(store);
      await screen.findByTestId("continue-career");
      expect(screen.getByTestId("load-toggle").getAttribute("aria-expanded")).toBe("false");

      fireEvent.click(screen.getByTestId("load-toggle"));

      const row = await screen.findByTestId("saved-autosave");
      expect(row.textContent).toContain("Autosave");
      expect(within(row).getByTestId("start-load-autosave")).toBeTruthy();
    });
  });

  describe("saved careers", () => {
    it("lists autosave and manual slots with a Load button and loads the chosen one", async () => {
      const store = createMemorySaveStore();
      const auto = aCareer(0);
      const manual = aCareer(1);
      await store.save("autosave", envelopeAt(auto, TWO_HOURS_AGO));
      await store.save("slot-2", envelopeAt(manual, "2026-03-09T12:00:00.000Z"));
      mountApp(store);
      await screen.findByTestId("continue-career");
      fireEvent.click(screen.getByTestId("load-toggle"));

      const row = await screen.findByTestId("saved-slot-2");
      expect(row.textContent).toContain(clubName(manual));
      expect(row.textContent).toContain("Slot 2");
      expect(row.textContent).toContain("saved yesterday");
      fireEvent.click(within(row).getByTestId("start-load-slot-2"));

      await screen.findByTestId("career-hub");
      expect(screen.getByTestId("hub-club-name").textContent).toBe(clubName(manual));
    });

    it("shows a damaged slot as Corrupt save without a Load button", async () => {
      const store = createMemorySaveStore();
      await store.save("slot-1", envelopeAt(aCareer(), TWO_HOURS_AGO));
      await store.save("slot-3", {
        schemaVersion: 2,
        createdAt: TWO_HOURS_AGO,
        savedAt: "2026-03-01T00:00:00.000Z",
        game: { broken: true },
      });
      mountApp(store);
      await screen.findByTestId("continue-career");
      fireEvent.click(screen.getByTestId("load-toggle"));

      const row = await screen.findByTestId("saved-slot-3");

      expect(row.textContent).toContain("Corrupt save");
      expect(within(row).queryByRole("button")).toBeNull();
    });

    it("explains a load that fails and stays on the start screen", async () => {
      const inner = createMemorySaveStore();
      await inner.save("slot-1", envelopeAt(aCareer(), TWO_HOURS_AGO));
      await inner.save("slot-2", envelopeAt(aCareer(1), "2026-03-09T12:00:00.000Z"));
      let reads = 0;
      const store: SaveStore = {
        ...inner,
        load: async (id) => {
          if (id === "slot-2" && ++reads > 2) throw new Error("blocked");
          return inner.load(id);
        },
      };
      mountApp(store);
      await screen.findByTestId("continue-career");
      fireEvent.click(screen.getByTestId("load-toggle"));

      fireEvent.click(await screen.findByTestId("start-load-slot-2"));

      expect((await screen.findByTestId("load-failure")).textContent).toContain("storage problem");
      expect(screen.queryByTestId("career-hub")).toBeNull();
    });

    it("shows a busy state on the row while a career loads", async () => {
      const inner = createMemorySaveStore();
      await inner.save("slot-1", envelopeAt(aCareer(), TWO_HOURS_AGO));
      await inner.save("slot-2", envelopeAt(aCareer(1), "2026-03-09T12:00:00.000Z"));
      let release: () => void = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      let reads = 0;
      const store: SaveStore = {
        ...inner,
        load: async (id) => {
          if (id === "slot-2" && ++reads > 2) await gate;
          return inner.load(id);
        },
      };
      mountApp(store);
      await screen.findByTestId("continue-career");
      fireEvent.click(screen.getByTestId("load-toggle"));

      const button = await screen.findByTestId("start-load-slot-2");
      fireEvent.click(button);

      await waitFor(() => expect(button.getAttribute("aria-busy")).toBe("true"));
      expect((screen.getByTestId("start-load-slot-1") as HTMLButtonElement).disabled).toBe(true);
      await act(async () => release());
      await screen.findByTestId("career-hub");
    });

    it("shows an import error as a message that is announced", async () => {
      const files = createMemoryFileTransfer();
      mountApp(createMemorySaveStore(), undefined, files);
      await screen.findByTestId("saved-empty");
      files.queueFile({ name: "x.json", text: "{nope" });

      fireEvent.click(screen.getByTestId("import-file"));

      const error = await screen.findByTestId("import-error");
      expect(error.getAttribute("role")).toBe("alert");
      expect(window.location.hash).toBe("#/");
    });
  });

  describe("with an unusable autosave", () => {
    const damaged = {
      schemaVersion: 2,
      createdAt: TWO_HOURS_AGO,
      savedAt: TWO_HOURS_AGO,
      game: { broken: true },
    };

    it("shows the error in the card instead of a blank one, and opens the load panel", async () => {
      const store = createMemorySaveStore();
      await store.save("autosave", damaged);
      mountApp(store);

      const error = await screen.findByTestId("load-error");

      expect(error.textContent).toMatch(/damaged/i);
      expect(screen.queryByTestId("continue-career")).toBeNull();
      expect(screen.getByTestId("import-file")).toBeTruthy();
    });

    it("deletes the damaged autosave and shows the plain start screen", async () => {
      const store = createMemorySaveStore();
      await store.save("autosave", damaged);
      mountApp(store);

      fireEvent.click(await screen.findByTestId("delete-save"));

      await waitFor(() => expect(screen.queryByTestId("load-error")).toBeNull());
      expect(await store.load("autosave")).toBeNull();
      expect(screen.queryByTestId("continue-career")).toBeNull();
    });

    it("offers a valid manual save to continue after the damaged autosave is deleted", async () => {
      const store = createMemorySaveStore();
      const career = aCareer();
      await store.save("autosave", damaged);
      await store.save("slot-1", envelopeAt(career, TWO_HOURS_AGO));
      mountApp(store);

      fireEvent.click(await screen.findByTestId("delete-save"));

      expect((await screen.findByTestId("continue-career")).textContent).toContain(
        clubName(career),
      );
    });

    it("keeps the error and says so when the save cannot be deleted", async () => {
      const inner = createMemorySaveStore();
      await inner.save("autosave", damaged);
      const store: SaveStore = {
        ...inner,
        delete: async () => {
          throw new Error("blocked");
        },
      };
      mountApp(store);

      fireEvent.click(await screen.findByTestId("delete-save"));

      expect((await screen.findByTestId("delete-error")).textContent).toMatch(
        /could not be deleted/i,
      );
      expect(screen.getByTestId("load-error")).toBeTruthy();
    });

    it("lets the user start a new career", async () => {
      const store = createMemorySaveStore();
      await store.save("autosave", damaged);
      mountApp(store);

      fireEvent.click(await screen.findByTestId("start-new-career"));

      expect(window.location.hash).toBe("#/new");
      expect(screen.getByTestId("league-step")).toBeTruthy();
    });

    it("explains a newer-version autosave", async () => {
      const store = createMemorySaveStore();
      await store.save("autosave", { ...damaged, schemaVersion: 99 });
      mountApp(store);

      expect((await screen.findByTestId("load-error")).textContent).toMatch(/newer version/i);
    });
  });
});
