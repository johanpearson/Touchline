import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateLeague } from "../game";
import { createMemoryLocaleStore } from "../platform";
import { App } from "./app";

const SEED = 11;
const MATCHDAYS = 26;

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
      initialSeed={SEED}
      tickMs={1000}
    />,
  );
  const club = league.league.clubs[0];
  if (!club) throw new Error("club");
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

const playMatchToFullTime = () => {
  click("play-match");
  fireEvent.click(screen.getByTestId("speed-4"));
  act(() => vi.advanceTimersByTime(40_000));
  fireEvent.click(screen.getByTestId("start-second-half"));
  act(() => vi.advanceTimersByTime(40_000));
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

  it("play match shows the match screen with real club names", () => {
    const club = mount();
    click("play-match");
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
    click("play-match");
    goTo("#/league");
    for (const cell of screen.getAllByTestId(/^table-row-/)) {
      expect(within(cell).getAllByRole("cell")[2]?.textContent).toBe("0");
    }
  });

  it("restarts the match from kickoff after leaving it", () => {
    mount();
    click("play-match");
    fireEvent.click(screen.getByTestId("speed-4"));
    act(() => vi.advanceTimersByTime(5_000));
    goTo("#/");
    click("play-match");
    expect(screen.getByTestId("clock").textContent).toBe("0’");
  });

  it("redirects #/match and #/results to the hub when there is nothing to show", () => {
    mount();
    goTo("#/results");
    expect(screen.getByTestId("career-hub")).toBeTruthy();
  });

  it("quick-sims a season, shows the season end screen and starts season 2", () => {
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
    expect(screen.getByTestId("career-hub")).toBeTruthy();
    expect(screen.getByTestId("next-match-matchday").textContent).toContain("1");
    expect(screen.getByTestId("nav-progress").textContent).toContain("2");
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
});
