import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateLeague } from "../../game";
import {
  createMemoryFileTransfer,
  createMemoryLocaleStore,
  createMemorySaveStore,
} from "../../platform";
import { App } from "../app";
import { installBrowserStubs } from "../components/overlay-test-setup";

const SEED = 11;
const createRenderer = () => ({ resize: vi.fn(), render: vi.fn(), dispose: vi.fn() });

const renderApp = (locale = "en") =>
  render(
    <App
      createRenderer={createRenderer}
      localeStore={createMemoryLocaleStore(locale)}
      saveStore={createMemorySaveStore()}
      fileTransfer={createMemoryFileTransfer()}
      now={() => "2026-01-01T12:00:00.000Z"}
      initialSeed={SEED}
    />,
  );

const goTo = (hash: string) =>
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });

const startCareer = () => {
  const result = generateLeague({ seed: SEED });
  if (!result.ok) throw new Error("league");
  const club = result.league.clubs[0];
  if (!club) throw new Error("no club");
  renderApp();
  goTo("#/new");
  fireEvent.click(screen.getByTestId(`club-option-${club.id}`));
  fireEvent.click(screen.getByTestId("start-career"));
  return club;
};

/** A matchMedia stub that answers the shell's two width queries for the given viewport width. */
const setViewport = (width: number) => {
  window.matchMedia = ((query: string) => {
    const max = /max-width:\s*([\d.]+)px/.exec(query);
    return {
      matches: max ? width <= Number(max[1]) : false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
  }) as unknown as typeof window.matchMedia;
};

beforeEach(() => {
  installBrowserStubs();
  goTo("#/");
  document.title = "";
});
afterEach(cleanup);

describe("app shell on a desktop", () => {
  it("shows the sidebar with a label for every item", () => {
    startCareer();
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    for (const id of ["hub", "squad", "match", "league", "club", "saves"]) {
      expect(within(nav).getByTestId(`nav-${id}`).textContent).not.toBe("");
    }
    expect(screen.getByTestId("app-shell").dataset.mode).toBe("sidebar");
  });

  it("has landmarks for the header, the navigation and the main content", () => {
    startCareer();
    expect(screen.getByRole("banner")).toBeTruthy();
    expect(screen.getByRole("navigation")).toBeTruthy();
    expect(screen.getByRole("main")).toBeTruthy();
  });

  it("keeps the language switch reachable", () => {
    startCareer();
    expect(screen.getByTestId("locale-switch")).toBeTruthy();
  });

  it("shows the club identity and a Continue action in the header", () => {
    const club = startCareer();
    const header = screen.getByRole("banner");
    expect(within(header).getByTestId("nav-club-name").textContent).toBe(club.name);
    const action = within(header).getByTestId("header-action");
    expect(action.getAttribute("href")).toBe("#/match");
    expect(action.textContent).toBe("Continue");
  });

  it("puts the skip link first, before the navigation", () => {
    startCareer();
    const skip = screen.getByRole("button", { name: "Skip to content" });
    const nav = screen.getByRole("navigation");
    expect(skip.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("moves focus to the main content from the skip link", () => {
    startCareer();
    fireEvent.click(screen.getByRole("button", { name: "Skip to content" }));
    expect(document.activeElement).toBe(screen.getByRole("main"));
  });

  it("moves focus to the page heading on a route change", () => {
    startCareer();
    goTo("#/league");
    const heading = within(screen.getByRole("main")).getAllByRole("heading")[0];
    expect(document.activeElement).toBe(heading);
  });

  it("does not steal focus on the first render", () => {
    startCareer();
    expect(document.activeElement).toBe(document.body);
  });

  it("updates the document title and announces it on a route change", () => {
    startCareer();
    goTo("#/league");
    const heading = within(screen.getByRole("main")).getAllByRole("heading")[0];
    expect(document.title).toBe(`${heading?.textContent} - Touchline`);
    expect(screen.getByTestId("page-announcement").textContent).toBe(heading?.textContent);
  });

  it("does not render the shell before a career exists", () => {
    renderApp();
    expect(screen.queryByTestId("app-shell")).toBeNull();
    expect(screen.getByTestId("app-title").textContent).toBe("Touchline");
  });
});

describe("app shell on a tablet", () => {
  beforeEach(() => setViewport(1024));

  it("shows an icon rail whose items keep their accessible names", () => {
    startCareer();
    expect(screen.getByTestId("app-shell").dataset.mode).toBe("rail");
    expect(screen.getByTestId("nav-league").getAttribute("aria-label")).toBe("League");
    expect(screen.getByTestId("nav-league").textContent).toBe("");
  });

  it("expands to labelled items and collapses with Escape", () => {
    startCareer();
    const toggle = screen.getByRole("button", { name: "Show menu labels" });
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByTestId("nav-league").textContent).toBe("League");
    fireEvent.keyDown(screen.getByTestId("nav-league"), { key: "Escape" });
    expect(screen.getByRole("button", { name: "Show menu labels" })).toBeTruthy();
  });

  it("collapses after a navigation", () => {
    startCareer();
    fireEvent.click(screen.getByRole("button", { name: "Show menu labels" }));
    fireEvent.click(screen.getByTestId("nav-league"));
    expect(screen.getByRole("button", { name: "Show menu labels" })).toBeTruthy();
  });
});

describe("app shell on a phone", () => {
  beforeEach(() => setViewport(390));

  it("shows a bottom tab bar with Home, Squad, Match, League and More", () => {
    startCareer();
    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    const labels = within(nav)
      .getAllByRole("link")
      .map((a) => a.textContent);
    expect(labels).toEqual(["Home", "Squad", "Next match", "League"]);
    expect(within(nav).getByRole("button", { name: "More" })).toBeTruthy();
    expect(screen.getByTestId("app-shell").dataset.mode).toBe("tabs");
  });

  it("lists My club, Saves, language and theme in the More sheet", () => {
    startCareer();
    expect(screen.queryByTestId("nav-saves")).toBeNull();
    fireEvent.click(screen.getByTestId("nav-more"));
    const sheet = screen.getByRole("dialog", { name: "More" });
    expect(within(sheet).getByTestId("nav-club")).toBeTruthy();
    expect(within(sheet).getByTestId("nav-saves")).toBeTruthy();
    expect(within(sheet).getByTestId("locale-switch")).toBeTruthy();
    expect(within(sheet).getByTestId("theme-switch")).toBeTruthy();
  });

  it("closes the More sheet after choosing a screen", () => {
    startCareer();
    fireEvent.click(screen.getByTestId("nav-more"));
    fireEvent.click(screen.getByTestId("nav-saves"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("returns focus to the More button when the sheet closes", async () => {
    startCareer();
    const more = screen.getByTestId("nav-more");
    more.focus();
    fireEvent.click(more);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(more);
  });

  it("names the brand for screen readers in the header", () => {
    startCareer();
    expect(screen.getByTestId("app-title").textContent).toBe("Touchline");
  });
});
