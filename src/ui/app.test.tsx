import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateLeague } from "../game";
import {
  createMemoryFileTransfer,
  createMemoryLocaleStore,
  createMemorySaveStore,
} from "../platform";
import { App } from "./app";
import { clubRating } from "./club-rating";

const fixedNow = () => "2026-01-01T12:00:00.000Z";
const createRenderer = () => ({ resize: vi.fn(), render: vi.fn(), dispose: vi.fn() });

const renderApp = (locale?: string, initialSeed = 11) =>
  render(
    <App
      createRenderer={createRenderer}
      localeStore={createMemoryLocaleStore(locale)}
      saveStore={createMemorySaveStore()}
      fileTransfer={createMemoryFileTransfer()}
      now={fixedNow}
      initialSeed={initialSeed}
    />,
  );

const goTo = (hash: string) =>
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });

const leagueFor = (seed: number) => {
  const result = generateLeague({ seed });
  if (!result.ok) throw new Error("league");
  return result.league;
};

const startCareer = (clubId: string) => {
  fireEvent.click(screen.getByTestId(`club-option-${clubId}`));
  fireEvent.click(screen.getByTestId("start-career"));
};

describe("App", () => {
  beforeEach(() => goTo("#/"));
  afterEach(cleanup);

  it("renders the game title", () => {
    renderApp();
    expect(screen.getByTestId("app-title").textContent).toBe("Touchline");
  });

  it("starts in English when nothing is saved", () => {
    renderApp();
    expect(screen.getByText(/Language/)).toBeTruthy();
  });

  it("starts in the saved locale", () => {
    renderApp("sv");
    expect(screen.getByText(/Språk/)).toBeTruthy();
  });

  it("ignores an unsupported saved locale", () => {
    renderApp("xx");
    expect(screen.getByText(/Language/)).toBeTruthy();
  });

  it("switches locale and remembers it in the store", () => {
    const store = createMemoryLocaleStore();
    render(
      <App
        createRenderer={createRenderer}
        localeStore={store}
        saveStore={createMemorySaveStore()}
        fileTransfer={createMemoryFileTransfer()}
        now={fixedNow}
        initialSeed={1}
      />,
    );
    fireEvent.change(screen.getByTestId("locale-switch"), { target: { value: "sv" } });
    expect(screen.getByText(/Språk/)).toBeTruthy();
    expect(store.load()).toBe("sv");
  });

  it("keeps the locale switch on the career hub", () => {
    renderApp();
    startCareer(leagueFor(11).clubs[0]?.id ?? "");
    expect(screen.getByTestId("career-hub")).toBeTruthy();
    expect(screen.getByTestId("locale-switch")).toBeTruthy();
  });

  it("does not show the demo match on the root route", () => {
    renderApp();
    expect(screen.queryByTestId("match-screen")).toBeNull();
  });

  it("asks to start a career on #/match without one", () => {
    renderApp();
    goTo("#/match");
    expect(screen.getByTestId("new-career")).toBeTruthy();
    expect(screen.queryByTestId("match-screen")).toBeNull();
  });

  it("shows a not-found view with a link home for unknown routes", () => {
    renderApp();
    goTo("#/nowhere");
    expect(screen.getByTestId("not-found")).toBeTruthy();
    const link = screen.getByTestId("not-found-home") as HTMLAnchorElement;
    expect(link.getAttribute("href")).toBe("#/");
  });

  it("follows browser back and forward", () => {
    renderApp();
    goTo("#/nowhere");
    expect(screen.getByTestId("not-found")).toBeTruthy();
    goTo("#/");
    expect(screen.queryByTestId("not-found")).toBeNull();
    expect(screen.getByTestId("new-career")).toBeTruthy();
  });
});

describe("new career screen", () => {
  beforeEach(() => goTo("#/"));
  afterEach(cleanup);

  it("lists the 14 clubs sorted by rating, highest first", () => {
    renderApp();
    const league = leagueFor(11);
    const options = screen.getAllByTestId(/^club-option-/);
    expect(options).toHaveLength(14);
    const expected = league.clubs
      .map((club) => ({ club, rating: clubRating(club, league.players) }))
      .sort((a, b) => b.rating - a.rating || a.club.name.localeCompare(b.club.name))
      .map(({ club }) => club.name);
    const shown = options.map((o) => within(o).getByTestId("club-name").textContent);
    expect(shown).toEqual(expected);
  });

  it("shows each club's rating", () => {
    renderApp();
    const league = leagueFor(11);
    const club = league.clubs[0];
    if (!club) throw new Error("no club");
    const option = screen.getByTestId(`club-option-${club.id}`);
    expect(within(option).getByTestId("club-rating").textContent).toBe(
      String(clubRating(club, league.players)),
    );
  });

  it("starts with the seed given by the composition root", () => {
    renderApp(undefined, 42);
    expect((screen.getByTestId("seed-input") as HTMLInputElement).value).toBe("42");
  });

  it("regenerates the league when the seed changes", () => {
    renderApp();
    const before = screen.getAllByTestId("club-name").map((n) => n.textContent);
    fireEvent.change(screen.getByTestId("seed-input"), { target: { value: "99" } });
    const after = screen.getAllByTestId("club-name").map((n) => n.textContent);
    expect(after).not.toEqual(before);
    fireEvent.change(screen.getByTestId("seed-input"), { target: { value: "11" } });
    expect(screen.getAllByTestId("club-name").map((n) => n.textContent)).toEqual(before);
  });

  it("ignores a seed that is not a whole number", () => {
    renderApp();
    const before = screen.getAllByTestId("club-name").map((n) => n.textContent);
    fireEvent.change(screen.getByTestId("seed-input"), { target: { value: "1.5" } });
    expect(screen.getAllByTestId("club-name").map((n) => n.textContent)).toEqual(before);
  });

  it("cannot start before a club is chosen", () => {
    renderApp();
    expect((screen.getByTestId("start-career") as HTMLButtonElement).disabled).toBe(true);
  });

  it("clears the chosen club when it is not in the regenerated league", () => {
    renderApp();
    const first = leagueFor(11).clubs[0];
    if (!first) throw new Error("no club");
    fireEvent.click(screen.getByTestId(`club-option-${first.id}`));
    fireEvent.change(screen.getByTestId("seed-input"), { target: { value: "99" } });
    expect((screen.getByTestId("start-career") as HTMLButtonElement).disabled).toBe(
      !leagueFor(99).clubs.some((c) => c.id === first.id),
    );
  });

  it("starts the career and shows the hub for the chosen club", () => {
    renderApp();
    const club = leagueFor(11).clubs[3];
    if (!club) throw new Error("no club");
    startCareer(club.id);
    expect(window.location.hash).toBe("#/");
    expect(screen.getByTestId("career-hub")).toBeTruthy();
    expect(screen.getByTestId("hub-club-name").textContent).toBe(club.name);
  });
});

describe("career navigation", () => {
  beforeEach(() => goTo("#/"));
  afterEach(cleanup);

  const startedClub = () => {
    renderApp();
    const club = leagueFor(11).clubs[0];
    if (!club) throw new Error("no club");
    startCareer(club.id);
    return club;
  };

  it("has no navigation bar before a career exists", () => {
    renderApp();
    expect(screen.queryByTestId("nav-hub")).toBeNull();
  });

  it("shows the club name and season progress", () => {
    const club = startedClub();
    expect(screen.getByTestId("nav-club-name").textContent).toBe(club.name);
    expect(screen.getByTestId("nav-progress").textContent).toContain("1");
  });

  it("links to hub, league, my club and next match", () => {
    const club = startedClub();
    const href = (name: string) => screen.getByTestId(`nav-${name}`).getAttribute("href");
    expect(href("hub")).toBe("#/");
    expect(href("league")).toBe("#/league");
    expect(href("club")).toBe(`#/club/${club.id}`);
    expect(href("match")).toBe("#/match");
  });

  it("marks the current page in the navigation", () => {
    startedClub();
    goTo("#/league");
    expect(screen.getByTestId("nav-league").getAttribute("aria-current")).toBe("page");
    expect(screen.getByTestId("nav-hub").getAttribute("aria-current")).toBeNull();
  });

  it("shows the league screen on the league route", () => {
    startedClub();
    goTo("#/league");
    expect(screen.getByTestId("screen-league")).toBeTruthy();
  });

  it("shows the club screen on the club route", () => {
    const club = startedClub();
    goTo(`#/club/${club.id}`);
    expect(screen.getByTestId("club-screen")).toBeTruthy();
  });

  it("sends the user back to the hub from #/season-end while the season runs", () => {
    startedClub();
    goTo("#/season-end");
    expect(window.location.hash).toBe("#/");
    expect(screen.getByTestId("career-hub")).toBeTruthy();
  });

  it("asks to start a career when a career route is opened without one", () => {
    renderApp();
    goTo("#/league");
    expect(screen.getByTestId("new-career")).toBeTruthy();
  });
});
