import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateLeague } from "../game";
import {
  createMemoryDensityStore,
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

const toClubStep = () => {
  goTo("#/new");
  fireEvent.click(screen.getByTestId("choose-club"));
  goTo("#/new/club");
};

const startCareer = (clubId: string) => {
  goTo("#/new");
  fireEvent.click(screen.getByTestId("choose-club"));
  goTo("#/new/club");
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
    goTo("#/settings");
    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeTruthy();
  });

  it("starts in the saved locale", () => {
    renderApp("sv");
    goTo("#/settings");
    expect(screen.getByRole("heading", { level: 1, name: "Inställningar" })).toBeTruthy();
  });

  it("ignores an unsupported saved locale", () => {
    renderApp("xx");
    goTo("#/settings");
    expect(screen.getByRole("heading", { level: 1, name: "Settings" })).toBeTruthy();
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
    goTo("#/settings");
    fireEvent.click(screen.getByRole("radio", { name: "Swedish" }));
    expect(screen.getByRole("heading", { level: 1, name: "Inställningar" })).toBeTruthy();
    expect(store.load()).toBe("sv");
  });

  it("has no language control on the career hub", () => {
    renderApp();
    startCareer(leagueFor(11).clubs[0]?.id ?? "");
    expect(screen.getByTestId("career-hub")).toBeTruthy();
    expect(screen.queryByTestId("locale-switch")).toBeNull();
  });

  it("has a Settings link and no language control in the new career screens", () => {
    renderApp();
    goTo("#/new");
    expect(screen.getByRole("link", { name: "Settings" }).getAttribute("href")).toBe("#/settings");
    expect(screen.queryByTestId("locale-switch")).toBeNull();
    goTo("#/new/club");
    expect(screen.getByRole("link", { name: "Settings" })).toBeTruthy();
  });

  it("has the language control in Settings only", () => {
    renderApp();
    goTo("#/settings");
    expect(screen.getByRole("radiogroup", { name: "Language" })).toBeTruthy();
    expect(screen.queryByRole("link", { name: "Settings" })).toBeNull();
    expect(screen.queryByTestId("locale-switch")).toBeNull();
  });

  it("gives the squad table the density from the density store", () => {
    const league = leagueFor(11);
    render(
      <App
        createRenderer={createRenderer}
        localeStore={createMemoryLocaleStore("en")}
        densityStore={createMemoryDensityStore("comfortable")}
        saveStore={createMemorySaveStore()}
        fileTransfer={createMemoryFileTransfer()}
        now={fixedNow}
        initialSeed={11}
      />,
    );
    startCareer(league.clubs[0]?.id ?? "");
    goTo("#/squad");
    const row = screen.getAllByTestId(/^plan-row-/)[0] as HTMLElement;
    expect(within(row).getAllByRole("cell")[1]?.className).toContain("py-3.5");
  });

  it("does not show the demo match on the root route", () => {
    renderApp();
    expect(screen.queryByTestId("match-screen")).toBeNull();
  });

  it("asks to start a career on #/match without one", () => {
    renderApp();
    goTo("#/match");
    expect(screen.getByTestId("start-screen")).toBeTruthy();
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
    expect(screen.getByTestId("start-screen")).toBeTruthy();
  });
});

describe("new career, club step", () => {
  beforeEach(() => goTo("#/"));
  afterEach(cleanup);

  it("lists the 14 clubs sorted by rating, highest first, in the club strip", () => {
    renderApp();
    toClubStep();
    const league = leagueFor(11);
    const options = screen.getAllByTestId(/^club-option-(?!name)/);
    expect(options).toHaveLength(14);
    const expected = league.clubs
      .map((club) => ({ club, rating: clubRating(club, league.players) }))
      .sort((a, b) => b.rating - a.rating || a.club.name.localeCompare(b.club.name))
      .map(({ club }) => club.name);
    const shown = options.map((o) => within(o).getByTestId("club-option-name").textContent);
    expect(shown).toEqual(expected);
  });

  it("shows the selected club's rating on the card", () => {
    renderApp();
    toClubStep();
    const league = leagueFor(11);
    const club = league.clubs[0];
    if (!club) throw new Error("no club");
    fireEvent.click(screen.getByTestId(`club-option-${club.id}`));
    expect(screen.getByTestId("club-rating").textContent).toBe(
      String(clubRating(club, league.players)),
    );
  });

  it("starts with the seed given by the composition root", () => {
    renderApp(undefined, 42);
    toClubStep();
    expect((screen.getByTestId("seed-input") as HTMLInputElement).value).toBe("42");
  });

  it("regenerates the league when the seed changes", () => {
    renderApp();
    toClubStep();
    const before = screen.getAllByTestId("club-option-name").map((n) => n.textContent);
    fireEvent.change(screen.getByTestId("seed-input"), { target: { value: "99" } });
    const after = screen.getAllByTestId("club-option-name").map((n) => n.textContent);
    expect(after).not.toEqual(before);
    fireEvent.change(screen.getByTestId("seed-input"), { target: { value: "11" } });
    expect(screen.getAllByTestId("club-option-name").map((n) => n.textContent)).toEqual(before);
  });

  it("ignores a seed that is not a whole number", () => {
    renderApp();
    toClubStep();
    const before = screen.getAllByTestId("club-option-name").map((n) => n.textContent);
    fireEvent.change(screen.getByTestId("seed-input"), { target: { value: "1.5" } });
    expect(screen.getAllByTestId("club-option-name").map((n) => n.textContent)).toEqual(before);
  });

  it("can start at once: the card shows the first club and the button names it", () => {
    renderApp();
    toClubStep();
    const button = screen.getByTestId("start-career") as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    expect(button.textContent).toBe(`Manage ${screen.getByTestId("club-name").textContent}`);
  });

  it("keeps the selection by position when the seed regenerates the league", () => {
    renderApp();
    toClubStep();
    fireEvent.click(screen.getAllByTestId(/^club-option-(?!name)/)[4] as HTMLElement);
    fireEvent.change(screen.getByTestId("seed-input"), { target: { value: "99" } });
    const options = screen.getAllByTestId(/^club-option-(?!name)/);
    expect(options[4]?.getAttribute("aria-selected")).toBe("true");
    expect(screen.getByTestId("club-position").textContent).toBe("5 of 14, sorted by rating");
  });

  it("starts the career and shows the hub for the chosen club", () => {
    renderApp();
    toClubStep();
    const club = leagueFor(11).clubs[3];
    if (!club) throw new Error("no club");
    startCareer(club.id);
    expect(window.location.hash).toBe("#/");
    expect(screen.getByTestId("career-hub")).toBeTruthy();
    expect(screen.getByTestId("hub-club-name").textContent).toBe(club.name);
  });

  it("does not offer a choice of match engine", () => {
    renderApp();
    toClubStep();
    expect(screen.queryByTestId("engine-version")).toBeNull();
  });

  it("starts a career that plays on the action engine and quick-sims its matchday", () => {
    renderApp();
    toClubStep();
    startCareer(leagueFor(11).clubs[0]?.id ?? "");
    expect(screen.getByTestId("play-match")).toBeTruthy();

    fireEvent.click(screen.getByTestId("quick-sim"));

    expect(window.location.hash).toBe("#/results");
  });

  it("plays the career's match in the match view", () => {
    renderApp();
    toClubStep();
    startCareer(leagueFor(11).clubs[0]?.id ?? "");
    goTo("#/match");
    expect(screen.getByTestId("pre-match")).toBeTruthy();
    fireEvent.click(screen.getByTestId("kick-off"));
    expect(screen.getByTestId("match-screen")).toBeTruthy();
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

  it("wraps the screens in the app shell once a career exists", () => {
    startedClub();
    expect(screen.getByTestId("app-shell")).toBeTruthy();
    expect(within(screen.getByRole("main")).getByTestId("career-hub")).toBeTruthy();
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

  it("links to the squad screen", () => {
    startedClub();
    expect(screen.getByTestId("nav-squad").getAttribute("href")).toBe("#/squad");
  });

  it("shows a player profile on the player route and not-found for an unknown player", () => {
    const club = startedClub();
    const playerId = club.playerIds[0] ?? "";
    goTo(`#/player/${encodeURIComponent(playerId)}`);
    expect(screen.getByTestId("player-screen")).toBeTruthy();
    goTo("#/player/nope");
    expect(screen.getByTestId("not-found")).toBeTruthy();
  });

  it("links to the tactics screen and opens it", () => {
    startedClub();
    expect(screen.getByTestId("nav-tactics").getAttribute("href")).toBe("#/tactics");
    goTo("#/tactics");
    expect(screen.getByTestId("tactics-screen")).toBeTruthy();
  });

  it("shows the start screen on the squad route without a career", () => {
    renderApp();
    goTo("#/squad");
    expect(screen.getByTestId("start-screen")).toBeTruthy();
    expect(screen.queryByTestId("squad-screen")).toBeNull();
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

  it("shows the settings screen on the settings route without a career", () => {
    renderApp();
    goTo("#/settings");
    expect(screen.getByTestId("settings-screen")).toBeTruthy();
    expect(screen.queryByTestId("start-screen")).toBeNull();
  });

  it("shows the settings screen inside the app shell with a career", () => {
    startedClub();
    goTo("#/settings");
    expect(screen.getByTestId("settings-screen")).toBeTruthy();
    expect(screen.getByTestId("app-shell")).toBeTruthy();
  });

  it("asks to start a career when a career route is opened without one", () => {
    renderApp();
    goTo("#/league");
    expect(screen.getByTestId("start-screen")).toBeTruthy();
  });
});
