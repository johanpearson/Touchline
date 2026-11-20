import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type Career,
  createCoachedMatch,
  generateLeague,
  getNextFixture,
  identityOf,
  type MatchSession,
  planChange,
} from "../game";
import {
  createEnvelope,
  createMemoryFileTransfer,
  createMemoryLocaleStore,
  createMemoryMatchSessionStore,
  createMemorySaveStore,
} from "../platform";
import { App } from "./app";
import { I18nProvider } from "./i18n-provider";
import { MatchSessionProvider } from "./match-session-provider";
import { careerAfter } from "./test-career";
import { CareerProvider, useCareer } from "./use-career";

const createRenderer = () => ({ resize: vi.fn(), render: vi.fn(), dispose: vi.fn() });
const now = () => "2026-01-01T12:00:00.000Z";
const END = 1_000_000;

const goTo = (hash: string) =>
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });

const career: Career = careerAfter(0);
const fixture = getNextFixture(career.season, career.userClubId);
if (!fixture) throw new Error("no fixture");

const halfTimeSeconds = (() => {
  const match = createCoachedMatch(career, fixture, { detail: "fast" });
  match.advanceTo(END);
  return match.state.time;
})();

const aSession = (overrides: Partial<MatchSession> = {}): MatchSession => ({
  ...identityOf(career, fixture),
  mode: "extended",
  changes: [],
  position: { matchTime: 630, period: "firstHalf" },
  ...overrides,
});

/** Opens the app on `career`'s hub, as after a reload and "Continue", with a match session store. */
const mountWith = async (session: MatchSession | string | null) => {
  const saveStore = createMemorySaveStore();
  await saveStore.save("autosave", createEnvelope(career, now));
  const raw = typeof session === "string" ? session : session ? JSON.stringify(session) : null;
  const matchSessionStore = createMemoryMatchSessionStore(raw);
  render(
    <App
      createRenderer={createRenderer}
      localeStore={createMemoryLocaleStore()}
      saveStore={saveStore}
      matchSessionStore={matchSessionStore}
      fileTransfer={createMemoryFileTransfer()}
      now={now}
      initialSeed={1}
      tickMs={1000}
    />,
  );
  fireEvent.click(await screen.findByTestId("continue-career"));
  await screen.findByTestId("career-hub");
  return { matchSessionStore };
};

describe("resuming a match from its session", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
    goTo("#/");
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows the match paused at the saved position with Resume instead of the pre-match screen", async () => {
    await mountWith(aSession());
    expect(screen.getByTestId("header-action").textContent).toBe("Resume match");
    expect(screen.getByTestId("nav-match").textContent).toBe("Resume match");

    goTo("#/match");

    expect(screen.queryByTestId("pre-match")).toBeNull();
    expect(screen.getByTestId("clock").textContent).toBe("10’");
    expect(screen.getByTestId("pause-toggle").textContent).toBe("Resume");
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByTestId("clock").textContent).toBe("10’");

    fireEvent.click(screen.getByTestId("pause-toggle"));
    act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByTestId("pause-toggle").textContent).toBe("Pause");
    expect(screen.getByTestId("clock").textContent).not.toBe("10’");
  });

  it("shows half-time with its change applied when the match was saved there", async () => {
    const change = {
      side: fixture.homeClubId === career.userClubId ? ("home" as const) : ("away" as const),
      tactics: { ...career.squadPlan.tactics, tempo: "fast" as const },
    };
    await mountWith(
      aSession({
        changes: [{ time: halfTimeSeconds, change }],
        position: { matchTime: halfTimeSeconds, period: "halfTime" },
      }),
    );

    goTo("#/match");

    expect(screen.getByTestId("half-time")).toBeTruthy();
    expect(screen.getByTestId("period").textContent).toBe("Half-time");
  });

  it("shows the full-time report of a match saved at full time and drops the session on Continue", async () => {
    const { matchSessionStore } = await mountWith(
      aSession({ position: { matchTime: END, period: "fullTime" } }),
    );
    goTo("#/match");
    expect(screen.getByTestId("full-time-report")).toBeTruthy();

    fireEvent.click(screen.getByTestId("continue"));

    await waitFor(() => expect(screen.getByTestId("matchday-results")).toBeTruthy());
    expect(await matchSessionStore.load()).toEqual({ kind: "none" });
  });

  /** A substitution at minute 10, as the session stores it: the engine change, the request and the report. */
  const withSubstitution = () => {
    const off = career.squadPlan.starters[1] as string;
    const on = career.squadPlan.bench[0] as string;
    const request = { minute: 10, substitutions: [{ off, on }] };
    const planned = planChange(career, fixture, request);
    if (!planned.ok) throw new Error(planned.error);
    const session = aSession({
      changes: [{ time: 605, change: planned.change }],
      edits: [{ ...request, time: 605 }],
      report: planned.report,
      position: { matchTime: 630, period: "firstHalf" },
    });
    return { session, off, on };
  };

  it("restores a substitution made in play: the feed line, the chart marker and the rules left", async () => {
    const { session, off, on } = withSubstitution();
    await mountWith(session);
    goTo("#/match");

    expect(screen.getAllByTestId("feed-line").map((l) => l.textContent)).toContainEqual(
      expect.stringMatching(/Substitution: .* on for /),
    );
    expect(screen.getAllByTestId("momentum-change")).toHaveLength(1);
    fireEvent.click(screen.getByTestId("make-changes"));
    expect(screen.getByTestId("sub-count").textContent).toBe("4 substitutions left");
    expect(screen.getByTestId("window-count").textContent).toBe(
      "2 substitution windows left besides half-time",
    );
    expect(screen.queryByTestId(`half-time-row-${off}`)).toBeNull();
    expect(screen.getByTestId(`half-time-row-${on}`)).toBeTruthy();
  });

  it("writes a change made while paused to the session with what was asked for", async () => {
    const { matchSessionStore } = await mountWith(aSession());
    goTo("#/match");
    fireEvent.click(screen.getByTestId("make-changes"));
    fireEvent.click(screen.getByTestId("shout-pushUp"));
    fireEvent.click(screen.getByTestId("apply-changes"));

    await waitFor(async () => {
      const loaded = await matchSessionStore.load();
      expect(loaded.kind).toBe("found");
      if (loaded.kind !== "found") return;
      expect(loaded.session.changes).toHaveLength(1);
      expect(loaded.session.edits).toEqual([
        expect.objectContaining({ minute: 10, shout: "pushUp", halfTime: false }),
      ]);
      expect(loaded.session.report?.minutes).toBeDefined();
    });
  });

  it("drops a session whose edits no longer fit the career", async () => {
    const { session } = withSubstitution();
    const stale = {
      ...session,
      edits: [{ time: 605, minute: 10, substitutions: [{ off: "nobody", on: "nobody-else" }] }],
    };
    const { matchSessionStore } = await mountWith(stale);
    goTo("#/match");
    expect(await screen.findByTestId("pre-match")).toBeTruthy();
    await waitFor(async () => expect(await matchSessionStore.load()).toEqual({ kind: "none" }));
  });

  it("plays the match with the plan it kicked off with when the loaded career holds an older one", async () => {
    const attacking = { ...career.squadPlan.tactics, mentality: "attacking" as const };
    await mountWith(aSession(identityOfPlan(attacking)));
    goTo("#/match");
    expect(screen.queryByTestId("pre-match")).toBeNull();
    expect(screen.getByTestId("match-screen")).toBeTruthy();
    fireEvent.click(screen.getByTestId("nav-tactics"));
    expect(within(screen.getByTestId("match-lineup-tactics")).getByText("Attacking")).toBeTruthy();
  });

  it.each([
    ["another fixture", () => aSession({ fixtureId: "elsewhere" })],
    ["another career", () => aSession({ careerSeed: career.seed + 1 })],
    ["another engine version", () => aSession({ engineVersion: 1 })],
    ["a changed squad", () => aSession({ inputKey: "00000000" })],
    ["a session of another version", () => ({ ...aSession(), schemaVersion: 99 }) as never],
  ])(
    "discards a session of %s with a toast and shows the pre-match screen",
    async (_name, make) => {
      const { matchSessionStore } = await mountWith(make());

      goTo("#/match");

      expect(screen.getByTestId("pre-match")).toBeTruthy();
      expect(screen.getByText("Saved match not resumed")).toBeTruthy();
      await waitFor(async () => expect(await matchSessionStore.load()).toEqual({ kind: "none" }));
    },
  );

  it("discards damaged session text with a toast and shows the pre-match screen", async () => {
    const { matchSessionStore } = await mountWith("{not json");

    goTo("#/match");

    expect(screen.getByTestId("pre-match")).toBeTruthy();
    expect(await screen.findByText("Saved match not resumed")).toBeTruthy();
    await waitFor(async () => expect(await matchSessionStore.load()).toEqual({ kind: "none" }));
  });

  it("keeps the pre-match screen and the normal labels when there is no session", async () => {
    await mountWith(null);
    expect(screen.getByTestId("header-action").textContent).toBe("Continue");
    goTo("#/match");
    expect(screen.getByTestId("pre-match")).toBeTruthy();
    expect(screen.queryByText("Saved match not resumed")).toBeNull();
  });

  it("writes the match to the store from kickoff and drops it when the rest is simulated", async () => {
    const { matchSessionStore } = await mountWith(null);
    goTo("#/match");
    fireEvent.click(screen.getByTestId("kick-off"));
    expect((await matchSessionStore.load()).kind).toBe("found");

    goTo("#/");
    fireEvent.click(screen.getByTestId("leave-match-simulate"));

    await waitFor(async () => expect(await matchSessionStore.load()).toEqual({ kind: "none" }));
  });
});

/** The identity of the match kicked off with `tactics`, as the session stores it. */
const identityOfPlan = (tactics: Career["squadPlan"]["tactics"]) => {
  const { squadPlan, inputKey } = identityOf(
    { ...career, squadPlan: { ...career.squadPlan, tactics } },
    fixture,
  );
  return { squadPlan, inputKey };
};

describe("which actions end or keep the match session", () => {
  afterEach(cleanup);

  let matchStore = createMemoryMatchSessionStore();
  let saves = createMemorySaveStore();
  let transfer = createMemoryFileTransfer();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <I18nProvider store={createMemoryLocaleStore()}>
      <MatchSessionProvider store={matchStore}>
        <CareerProvider saveStore={saves} now={now} fileTransfer={transfer}>
          {children}
        </CareerProvider>
      </MatchSessionProvider>
    </I18nProvider>
  );
  const open = (store: typeof matchStore, saveStore = createMemorySaveStore()) => {
    matchStore = store;
    saves = saveStore;
    transfer = createMemoryFileTransfer();
    return renderHook(() => useCareer(), { wrapper });
  };

  const withSession = () => createMemoryMatchSessionStore(JSON.stringify(aSession()));

  it("ends the session when another career is started", async () => {
    const store = withSession();
    const { result } = open(store);
    await act(async () => void (await Promise.resolve()));
    const other = generateLeague({ seed: 5 });
    if (!other.ok) throw new Error("league");
    const club = other.league.clubs[0];
    if (!club) throw new Error("club");
    act(() => void result.current.startCareer(5, club.id));
    await waitFor(async () => expect(await store.load()).toEqual({ kind: "none" }));
  });

  it("ends the session when a manual slot is loaded", async () => {
    const store = withSession();
    const saveStore = createMemorySaveStore();
    await saveStore.save("slot-1", createEnvelope(career, now));
    const { result } = open(store, saveStore);
    await act(async () => void (await result.current.loadSlot("slot-1")));
    expect(await store.load()).toEqual({ kind: "none" });
  });

  it("keeps the session when the autosave found on startup is continued", async () => {
    const store = withSession();
    const saveStore = createMemorySaveStore();
    await saveStore.save("autosave", createEnvelope(career, now));
    const { result } = open(store, saveStore);
    await waitFor(() => expect(result.current.continueAvailable).toBe(true));
    await act(async () => void (await result.current.loadAutosave()));
    expect((await store.load()).kind).toBe("found");
  });

  it("leaves the match out of exported save files", async () => {
    const store = withSession();
    const saveStore = createMemorySaveStore();
    await saveStore.save("autosave", createEnvelope(career, now));
    const { result } = open(store, saveStore);
    await waitFor(() => expect(result.current.continueAvailable).toBe(true));
    await act(async () => void (await result.current.loadAutosave()));
    act(() => void result.current.exportCareer());
    expect(transfer.downloads).toHaveLength(1);
    expect(transfer.downloads[0]?.text).not.toContain("inputKey");
    expect(transfer.downloads[0]?.text).not.toContain("matchTime");
  });
});
