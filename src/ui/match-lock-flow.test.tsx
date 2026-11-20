import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type Career,
  createCoachedMatch,
  getNextFixture,
  identityOf,
  type MatchSession,
  playToFullTime,
} from "../game";
import {
  createEnvelope,
  createMemoryFileTransfer,
  createMemoryLocaleStore,
  createMemoryMatchSessionStore,
  createMemorySaveStore,
} from "../platform";
import { App } from "./app";
import { installBrowserStubs } from "./components/overlay-test-setup";
import { careerAfter } from "./test-career";

const createRenderer = () => ({ resize: vi.fn(), render: vi.fn(), dispose: vi.fn() });
const now = () => "2026-01-01T12:00:00.000Z";
const END = 1_000_000;

const settle = () => act(() => new Promise<void>((resolve) => setTimeout(resolve, 0)));
const goTo = async (hash: string) => {
  window.location.hash = hash;
  await settle();
};

const career: Career = careerAfter(0);
const fixture = getNextFixture(career.season, career.userClubId);
if (!fixture) throw new Error("no fixture");

const aSession = (overrides: Partial<MatchSession> = {}): MatchSession => ({
  ...identityOf(career, fixture),
  mode: "extended",
  changes: [],
  position: { matchTime: 630, period: "firstHalf" },
  ...overrides,
});

/** The app on the match screen, resumed paused at 10’, as after a reload. */
const mountMatch = async (session: MatchSession = aSession()) => {
  const saveStore = createMemorySaveStore();
  await saveStore.save("autosave", createEnvelope(career, now));
  const matchSessionStore = createMemoryMatchSessionStore(JSON.stringify(session));
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
  await goTo("#/match");
  await screen.findByTestId("match-screen");
  return { matchSessionStore };
};

const progress = () => screen.getByTestId("nav-progress").textContent;

describe("the match is locked while it is on", () => {
  beforeEach(async () => {
    installBrowserStubs();
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    await goTo("#/");
  });
  afterEach(async () => {
    cleanup();
    vi.unstubAllGlobals();
    await goTo("");
  });

  it("asks before leaving, with the score and minute, and stays on the match when the user stays", async () => {
    await mountMatch();

    await goTo("#/league");

    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByTestId("leave-match-status").textContent).toMatch(/\d–\d .+, 10’$/);
    expect(document.activeElement).toBe(screen.getByTestId("leave-match-stay"));
    expect(window.location.hash).toBe("#/match");

    fireEvent.click(screen.getByTestId("leave-match-stay"));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.getByTestId("clock").textContent).toBe("10’");
    expect(screen.queryByTestId("screen-league")).toBeNull();
    expect(window.location.hash).toBe("#/match");
  });

  it("treats Escape as Stay", async () => {
    await mountMatch();
    await goTo("#/league");
    fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(screen.getByTestId("match-screen")).toBeTruthy();
  });

  it("asks from the scoreboard back link too", async () => {
    await mountMatch();
    fireEvent.click(screen.getByTestId("leave-match"));
    await settle();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(window.location.hash).toBe("#/match");
  });

  it("asks when the sidebar links to another screen", async () => {
    await mountMatch();
    fireEvent.click(screen.getByTestId("nav-league"));
    await settle();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
  });

  it("simulates the rest, records the result, drops the session and goes where the user asked", async () => {
    const { matchSessionStore } = await mountMatch();
    const before = progress();

    await goTo("#/league");
    fireEvent.click(screen.getByTestId("leave-match-simulate"));
    await settle();

    await screen.findByTestId("screen-league");
    expect(window.location.hash).toBe("#/league");
    expect(progress()).not.toBe(before);
    expect(await matchSessionStore.load()).toEqual({ kind: "none" });
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("records the score the match has when it is played to full time with the same seed", async () => {
    const played = createCoachedMatch(career, fixture);
    playToFullTime(played);
    const { home, away } = played.state.score;
    await mountMatch();

    await goTo("#/league");
    fireEvent.click(screen.getByTestId("leave-match-simulate"));
    await screen.findByTestId("screen-league");
    await goTo("#/results");

    const score = await screen.findByTestId(`result-score-${fixture.id}`);
    expect(score.textContent?.replace(/\s/g, "")).toContain(`${home}–${away}`);
  });

  it("opens squad and tactics as read-only panels without changing the address", async () => {
    await mountMatch();

    fireEvent.click(screen.getByTestId("nav-squad"));
    await settle();
    expect(screen.getByTestId("match-panel-squad")).toBeTruthy();
    expect(screen.queryByTestId("edit-lineup")).toBeNull();
    expect(window.location.hash).toBe("#/match");
    expect(screen.queryByRole("alertdialog")).toBeNull();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByTestId("match-panel-squad")).toBeNull());

    fireEvent.click(screen.getByTestId("nav-tactics"));
    await settle();
    const lineup = screen.getByTestId("match-panel-tactics");
    expect(within(lineup).getByTestId("match-tactic-mentality")).toBeTruthy();
    expect(window.location.hash).toBe("#/match");
    expect(screen.getByTestId("match-screen")).toBeTruthy();
  });

  it("is free after full time", async () => {
    await mountMatch(aSession({ position: { matchTime: END, period: "fullTime" } }));
    await screen.findByTestId("full-time-report");
    await goTo("#/league");
    await screen.findByTestId("screen-league");
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("is free on the pre-match screen, where no match is on yet", async () => {
    const saveStore = createMemorySaveStore();
    await saveStore.save("autosave", createEnvelope(career, now));
    render(
      <App
        createRenderer={createRenderer}
        localeStore={createMemoryLocaleStore()}
        saveStore={saveStore}
        fileTransfer={createMemoryFileTransfer()}
        now={now}
        initialSeed={1}
        tickMs={1000}
      />,
    );
    fireEvent.click(await screen.findByTestId("continue-career"));
    await screen.findByTestId("career-hub");
    await goTo("#/match");
    await screen.findByTestId("pre-match");
    await goTo("#/league");
    await screen.findByTestId("screen-league");
  });
});
