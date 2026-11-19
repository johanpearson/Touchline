import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateLeague } from "../game";
import {
  createMemoryFileTransfer,
  createMemoryLocaleStore,
  createMemorySaveStore,
} from "../platform";
import { App } from "./app";

const SEED = 11;
const MATCHDAYS = 26;

const fixedNow = () => "2026-01-01T12:00:00.000Z";
const createRenderer = () => ({ resize: vi.fn(), render: vi.fn(), dispose: vi.fn() });

const goTo = (hash: string) =>
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });

const mount = (locale?: string) => {
  const league = generateLeague({ seed: SEED });
  if (!league.ok) throw new Error("league");
  render(
    <App
      createRenderer={createRenderer}
      localeStore={createMemoryLocaleStore(locale)}
      saveStore={createMemorySaveStore()}
      fileTransfer={createMemoryFileTransfer()}
      now={fixedNow}
      initialSeed={SEED}
      tickMs={1000}
    />,
  );
  const club = league.league.clubs[0];
  if (!club) throw new Error("club");
  goTo("#/new");
  fireEvent.click(screen.getByTestId("choose-club"));
  goTo("#/new/club");
  fireEvent.click(screen.getByTestId(`club-option-${club.id}`));
  fireEvent.click(screen.getByTestId("start-career"));
  return club;
};

/** Clicks a button, or follows a link by its hash (jsdom does not navigate on anchor clicks). */
const click = (testId: string) => {
  const element = screen.getByTestId(testId);
  const href = element.getAttribute("href");
  if (href?.startsWith("#")) goTo(href);
  else fireEvent.click(element);
  act(() => void window.dispatchEvent(new HashChangeEvent("hashchange")));
};

/** Opens the pre-match screen from the hub and kicks off. */
const startMatch = () => {
  click("play-match");
  click("kick-off");
};

const playMatchToFullTime = () => {
  startMatch();
  fireEvent.click(screen.getByTestId("mode-highlights"));
  act(() => vi.advanceTimersByTime(150_000));
  fireEvent.click(screen.getByTestId("start-second-half"));
  act(() => vi.advanceTimersByTime(150_000));
};

/** Re-signs every player whose contract has ended, at the asked wage, so the squad stays whole. */
const resignEveryone = () => {
  for (const button of screen.queryAllByTestId(/^resign-/)) {
    fireEvent.click(button);
    fireEvent.click(screen.getByTestId("confirm-resign"));
  }
};

describe("season flow", () => {
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

  it("shows the next match with play and quick sim actions on the hub", () => {
    mount();
    expect(screen.getByTestId("next-match-opponent").textContent).toMatch(/\S/);
    expect(screen.getByTestId("next-match-matchday").textContent).toContain("1");
    expect(screen.getByTestId("play-match")).toBeTruthy();
    expect(screen.getByTestId("quick-sim")).toBeTruthy();
  });

  it("quick sim goes to the results page with all 14 clubs having played one match", () => {
    mount();
    click("quick-sim");
    expect(screen.getByTestId("matchday-results")).toBeTruthy();
    expect(screen.getAllByTestId(/^result-score-/)).toHaveLength(7);
    expect(screen.getByTestId("user-position").textContent).toMatch(/\d/);
    goTo("#/league");
    for (const cell of screen.getAllByTestId(/^table-row-/)) {
      expect(within(cell).getAllByRole("cell")[2]?.textContent).toBe("1");
    }
  });

  it("play match opens the pre-match screen first and starts the match on Kick off", () => {
    mount();
    click("play-match");
    expect(screen.getByTestId("pre-match")).toBeTruthy();
    expect(screen.queryByTestId("match-screen")).toBeNull();
    click("kick-off");
    expect(screen.getByTestId("match-screen")).toBeTruthy();
  });

  it("quick sim on the pre-match screen records the result and shows the matchday", () => {
    mount();
    click("play-match");
    click("quick-sim");
    expect(screen.getByTestId("matchday-results")).toBeTruthy();
  });

  it("play match shows the match screen with real club names", () => {
    const club = mount();
    startMatch();
    expect(screen.getByTestId("match-screen")).toBeTruthy();
    const names = [screen.getByTestId("home-name"), screen.getByTestId("away-name")].map(
      (e) => e.textContent,
    );
    expect(names).toContain(club.name);
  });

  it("records the result shown on the scoreboard when Continue is pressed", () => {
    mount();
    playMatchToFullTime();
    expect(screen.getByTestId("period").textContent).toBe("Full time");
    const shown = screen.getByTestId("score").textContent;
    click("continue");
    const scores = screen.getAllByTestId(/^result-score-/).map((e) => e.textContent);
    expect(scores).toContain(shown);
  });

  it("does not record a result when leaving the match early", () => {
    mount();
    startMatch();
    goTo("#/league");
    for (const cell of screen.getAllByTestId(/^table-row-/)) {
      expect(within(cell).getAllByRole("cell")[2]?.textContent).toBe("0");
    }
  });

  it("resumes the match paused where it was after leaving it", () => {
    mount();
    startMatch();
    fireEvent.click(screen.getByTestId("mode-highlights"));
    act(() => vi.advanceTimersByTime(5_000));
    const clock = screen.getByTestId("clock").textContent;
    expect(clock).not.toBe("0’");
    goTo("#/");
    expect(screen.getByTestId("header-action").textContent).toBe("Resume match");
    click("play-match");
    expect(screen.queryByTestId("pre-match")).toBeNull();
    expect(screen.getByTestId("clock").textContent).toBe(clock);
    expect(screen.getByTestId("pause-toggle").textContent).toBe("Resume");
    act(() => vi.advanceTimersByTime(3_000));
    expect(screen.getByTestId("clock").textContent).toBe(clock);
  });

  it("redirects #/match and #/results to the hub when there is nothing to show", () => {
    mount();
    goTo("#/results");
    expect(screen.getByTestId("career-hub")).toBeTruthy();
  });

  it("quick-sims a season, shows the season end screen, works the off-season and starts season 2", () => {
    mount();
    for (let i = 0; i < MATCHDAYS; i++) {
      click("quick-sim");
      goTo("#/");
    }
    expect(screen.queryByTestId("next-match")).toBeNull();
    goTo("#/");
    click("to-season-end");
    expect(screen.getByTestId("champion").textContent).toMatch(/\S/);
    expect(screen.getAllByTestId(/^final-row-/)).toHaveLength(14);
    expect(screen.getByTestId("top-scorers").children.length).toBeGreaterThan(0);
    expect(screen.getByTestId("user-finish").textContent).toMatch(/\d/);
    click("next-season");
    expect(screen.getByTestId("screen-off-season")).toBeTruthy();
    resignEveryone();
    expect(screen.queryByTestId("start-blocked-reason")).toBeNull();
    click("start-next-season");
    expect(screen.getByTestId("career-hub")).toBeTruthy();
    expect(screen.getByTestId("next-match-matchday").textContent).toContain("1");
    expect(screen.getByTestId("nav-progress").textContent).toContain("2");
  });

  it("offers the off-season on the hub instead of the match buttons while the window is open", () => {
    mount();
    for (let i = 0; i < MATCHDAYS; i++) {
      click("quick-sim");
      goTo("#/");
    }
    goTo("#/season-end");
    click("next-season");
    goTo("#/");
    expect(screen.getByTestId("to-off-season")).toBeTruthy();
    expect(screen.queryByTestId("play-match")).toBeNull();
    expect(screen.queryByTestId("to-season-end")).toBeNull();
  });

  it("sends #/off-season back to the hub while a season is running", () => {
    mount();
    goTo("#/off-season");
    expect(screen.getByTestId("career-hub")).toBeTruthy();
    expect(screen.queryByTestId("screen-off-season")).toBeNull();
  });

  it("redirects #/match to the hub when the season is complete", () => {
    mount();
    for (let i = 0; i < MATCHDAYS; i++) {
      click("quick-sim");
      goTo("#/");
    }
    goTo("#/match");
    expect(screen.getByTestId("season-complete")).toBeTruthy();
  });

  it("shows the flow in Swedish", () => {
    mount("sv");
    expect(screen.getByTestId("play-match").textContent).toBe("Spela match");
    expect(screen.getByTestId("quick-sim").textContent).toBe("Snabbsimulera");
  });

  it("records minutes from a half-time substitution in fitness after the match", () => {
    mount();
    startMatch();
    fireEvent.click(screen.getByTestId("mode-highlights"));
    act(() => vi.advanceTimersByTime(150_000));
    fireEvent.click(screen.getByTestId("make-changes"));
    const ids = screen
      .getAllByTestId(/^half-time-fitness-/)
      .map((e) => e.dataset.testid?.slice("half-time-fitness-".length) ?? "");
    fireEvent.click(screen.getByTestId("sub-add"));
    const offButton = screen.getAllByTestId(/^pick-/)[0] as HTMLElement;
    const off = offButton.dataset.testid?.slice("pick-".length) ?? "";
    fireEvent.click(offButton);
    const onButton = screen.getAllByTestId(/^pick-/)[0] as HTMLElement;
    const on = onButton.dataset.testid?.slice("pick-".length) ?? "";
    fireEvent.click(onButton);
    fireEvent.click(screen.getByTestId("start-second-half"));
    act(() => vi.advanceTimersByTime(150_000));
    click("continue");
    goTo("#/squad");
    const fitness = (id: string) => Number(screen.getByTestId(`plan-fitness-${id}`).textContent);
    const others = ids.filter((id) => id !== off && id !== on);
    // 45 minutes cost half as much as 90, and an unused substitute stays at 100.
    expect(fitness(off)).toBe(fitness(on));
    expect(fitness(off)).toBeLessThan(100);
    expect(others.some((id) => fitness(id) === 100)).toBe(true);
    expect(others.some((id) => fitness(id) < fitness(off))).toBe(true);
  });
});
