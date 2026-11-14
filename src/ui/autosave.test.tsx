import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateLeague, parseCareer } from "../game";
import {
  createMemoryFileTransfer,
  createMemoryLocaleStore,
  createMemorySaveStore,
} from "../platform";
import type { SaveEnvelope, SaveStore } from "../shared";
import { App } from "./app";
import { I18nProvider } from "./i18n-provider";
import { CareerProvider, useCareer } from "./use-career";

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

type Options = {
  store?: SaveStore;
  locale?: string;
  storageAvailable?: boolean;
  now?: () => string;
};

const mountApp = ({
  store = createMemorySaveStore(),
  locale,
  storageAvailable,
  now,
}: Options = {}) => {
  const view = render(
    <App
      createRenderer={createRenderer}
      localeStore={createMemoryLocaleStore(locale)}
      saveStore={store}
      fileTransfer={createMemoryFileTransfer()}
      now={now ?? aClock()}
      storageAvailable={storageAvailable}
      initialSeed={SEED}
      tickMs={1000}
    />,
  );
  return { ...view, store };
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
  fireEvent.click(screen.getByTestId("quick-sim"));
  goTo("#/");
};

const autosaved = async (store: SaveStore): Promise<SaveEnvelope> => {
  let found: SaveEnvelope | null = null;
  await waitFor(async () => {
    found = await store.load("autosave");
    expect(found).not.toBeNull();
  });
  if (!found) throw new Error("no autosave");
  return found;
};

const savedCareer = (envelope: SaveEnvelope) => {
  const parsed = parseCareer(envelope.game);
  if (!parsed.ok) throw new Error("saved career is invalid");
  return parsed.career;
};

describe("autosave and continue", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    goTo("#/");
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("autosaves right after the career is created", async () => {
    const { store } = mountApp();
    startCareer();

    const career = savedCareer(await autosaved(store));

    expect(career.userClubId).toBe(firstClub().id);
    expect(career.season.currentMatchday).toBe(1);
    await waitFor(() => expect(screen.getByTestId("save-status").textContent).toMatch(/Saved at/));
  });

  it("autosaves after every completed matchday and keeps createdAt", async () => {
    const { store } = mountApp({ now: aClock() });
    startCareer();
    const first = await autosaved(store);

    quickSim();
    await waitFor(async () =>
      expect(
        savedCareer((await store.load("autosave")) as SaveEnvelope).season.currentMatchday,
      ).toBe(2),
    );

    expect((await store.load("autosave"))?.createdAt).toBe(first.createdAt);
  });

  it("autosaves after starting the next season", async () => {
    const { store } = mountApp();
    startCareer();
    for (let i = 0; i < 26; i++) quickSim();
    goTo("#/season-end");
    fireEvent.click(screen.getByTestId("next-season"));

    await waitFor(async () =>
      expect(savedCareer((await store.load("autosave")) as SaveEnvelope).season.number).toBe(2),
    );
  });

  it("offers to continue the autosave with club, season and matchday", async () => {
    const store = createMemorySaveStore();
    const first = mountApp({ store });
    const club = startCareer();
    quickSim();
    await waitFor(async () =>
      expect(
        savedCareer((await store.load("autosave")) as SaveEnvelope).season.currentMatchday,
      ).toBe(2),
    );
    first.unmount();

    mountApp({ store });
    const button = await screen.findByTestId("continue-career");
    expect(button.textContent).toContain(club.name);
    expect(button.textContent).toMatch(/season 1/i);
    expect(button.textContent).toMatch(/matchday 2/i);
    fireEvent.click(button);

    expect(screen.getByTestId("career-hub")).toBeTruthy();
    expect(screen.getByTestId("nav-progress").textContent).toContain("2");
    expect(screen.queryByTestId("continue-career")).toBeNull();
  });

  it("does not load the autosave without being asked", async () => {
    const store = createMemorySaveStore();
    const first = mountApp({ store });
    startCareer();
    await autosaved(store);
    first.unmount();

    mountApp({ store });
    await screen.findByTestId("continue-career");

    expect(screen.getByTestId("new-career")).toBeTruthy();
    expect(screen.queryByTestId("career-hub")).toBeNull();
  });

  it("shows no continue button when nothing is saved", async () => {
    mountApp();
    await act(async () => {});
    expect(screen.queryByTestId("continue-career")).toBeNull();
  });

  it.each([
    [
      "a corrupt",
      { schemaVersion: 2, createdAt: "2026-01-01", savedAt: "2026-01-01", game: { broken: true } },
      /damaged/i,
    ],
    [
      "a newer-version",
      { schemaVersion: 99, createdAt: "2026-01-01", savedAt: "2026-01-01", game: {} },
      /newer version/i,
    ],
  ])("refuses %s autosave and offers a new career", async (_name, envelope, message) => {
    const store = createMemorySaveStore();
    await store.save("autosave", envelope);
    mountApp({ store });

    const error = await screen.findByTestId("load-error");
    expect(error.textContent).toMatch(message);
    expect(screen.queryByTestId("continue-career")).toBeNull();
    fireEvent.click(screen.getByTestId("start-new-career"));
    expect(screen.queryByTestId("load-error")).toBeNull();
    startCareer();
    expect(screen.getByTestId("career-hub")).toBeTruthy();
  });

  it("shows an error when saving fails but play continues", async () => {
    const inner = createMemorySaveStore();
    const store: SaveStore = {
      ...inner,
      save: async () => {
        throw new Error("quota exceeded");
      },
    };
    mountApp({ store });
    startCareer();

    await waitFor(() =>
      expect(screen.getByTestId("save-status").textContent).toMatch(/Could not save/),
    );
    quickSim();
    expect(screen.getByTestId("career-hub")).toBeTruthy();
    expect(screen.getByTestId("nav-progress").textContent).toContain("2");
  });

  it("warns that progress is lost when storage is unavailable", () => {
    mountApp({ storageAvailable: false });
    expect(screen.getByTestId("storage-warning").textContent).toMatch(/lost on reload/i);
  });

  it("shows no storage warning when storage works", () => {
    mountApp();
    expect(screen.queryByTestId("storage-warning")).toBeNull();
  });

  it("shows the save messages in Swedish", async () => {
    const { store } = mountApp({ locale: "sv" });
    startCareer();
    await autosaved(store);
    await waitFor(() => expect(screen.getByTestId("save-status").textContent).toMatch(/Sparad/));
  });

  it("restarts a match from kickoff after a reload and records nothing", async () => {
    const store = createMemorySaveStore();
    const first = mountApp({ store });
    startCareer();
    await autosaved(store);
    goTo("#/match");
    expect(screen.getByTestId("match-screen")).toBeTruthy();
    first.unmount();
    goTo("#/");

    mountApp({ store });
    fireEvent.click(await screen.findByTestId("continue-career"));
    goTo("#/match");

    expect(screen.getByTestId("clock").textContent).toBe("0’");
    expect(savedCareer(await autosaved(store)).season.results).toEqual([]);
  });
});

describe("useCareer persistence", () => {
  afterEach(cleanup);

  let activeStore: SaveStore = createMemorySaveStore();
  const clock = aClock();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nProvider store={createMemoryLocaleStore()}>
      <CareerProvider saveStore={activeStore} now={clock} fileTransfer={createMemoryFileTransfer()}>
        {children}
      </CareerProvider>
    </I18nProvider>
  );
  const renderStore = (store: SaveStore) => {
    activeStore = store;
    return renderHook(() => useCareer(), { wrapper });
  };

  it("loads exactly the career that was saved", async () => {
    const store = createMemorySaveStore();
    const first = renderStore(store);
    act(() => void first.result.current.startCareer(SEED, firstClub().id));
    await autosaved(store);
    const saved = first.result.current.career;
    first.unmount();

    const second = renderStore(store);
    await waitFor(() => expect(second.result.current.continueAvailable).toBe(true));
    let loaded = false;
    await act(async () => {
      loaded = await second.result.current.loadAutosave();
    });

    expect(loaded).toBe(true);
    expect(second.result.current.career).toEqual(saved);
    expect(second.result.current.continueAvailable).toBe(false);
  });

  it("reports that nothing was loaded when there is no save", async () => {
    const { result } = renderStore(createMemorySaveStore());
    let loaded = true;
    await act(async () => {
      loaded = await result.current.loadAutosave();
    });
    expect(loaded).toBe(false);
    expect(result.current.career).toBeNull();
    expect(result.current.saveStatus).toBe("idle");
  });
});
