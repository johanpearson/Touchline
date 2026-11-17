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

const league = (() => {
  const result = generateLeague({ seed: SEED });
  if (!result.ok) throw new Error("league");
  return result.league;
})();

const goTo = (hash: string) =>
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });

const startCareer = (locale = "en") => {
  render(
    <App
      createRenderer={createRenderer}
      localeStore={createMemoryLocaleStore(locale)}
      saveStore={createMemorySaveStore()}
      fileTransfer={createMemoryFileTransfer()}
      now={() => "2026-01-01T12:00:00.000Z"}
      initialSeed={SEED}
      tickMs={1000}
    />,
  );
  const club = league.clubs[0];
  if (!club) throw new Error("no club");
  goTo("#/new");
  fireEvent.click(screen.getByTestId("choose-club"));
  goTo("#/new/club");
  fireEvent.click(screen.getByTestId(`club-option-${club.id}`));
  fireEvent.click(screen.getByTestId("start-career"));
  return club;
};

const press = (init: KeyboardEventInit) =>
  act(() => {
    window.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init }),
    );
  });

const openWithShortcut = () => press({ key: "k", ctrlKey: true });
const palette = () => screen.queryByTestId("command-palette");
const input = () => screen.getByTestId("palette-input") as HTMLInputElement;
const type = (value: string) => fireEvent.change(input(), { target: { value } });
const key = (k: string) => fireEvent.keyDown(input(), { key: k });
const activeOption = () => {
  const id = input().getAttribute("aria-activedescendant");
  return id ? document.getElementById(id) : null;
};

beforeEach(() => {
  installBrowserStubs();
  goTo("#/");
});
afterEach(cleanup);

describe("command palette", () => {
  it("opens with Ctrl+K and Cmd+K from a career screen and closes with Escape", () => {
    startCareer();
    expect(palette()).toBeNull();
    openWithShortcut();
    expect(palette()).not.toBeNull();
    key("Escape");
    expect(palette()).toBeNull();
    press({ key: "k", metaKey: true });
    expect(palette()).not.toBeNull();
  });

  it("works from every career screen", () => {
    startCareer();
    for (const hash of ["#/", "#/squad", "#/league", "#/saves", `#/club/${league.clubs[1]?.id}`]) {
      goTo(hash);
      openWithShortcut();
      expect(palette(), hash).not.toBeNull();
      key("Escape");
      expect(palette(), hash).toBeNull();
    }
  });

  it("prevents the browser's own Ctrl+K", () => {
    startCareer();
    const event = new KeyboardEvent("keydown", { key: "k", ctrlKey: true, cancelable: true });
    act(() => {
      window.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
  });

  it("toggles closed with a second Ctrl+K", () => {
    startCareer();
    openWithShortcut();
    openWithShortcut();
    expect(palette()).toBeNull();
  });

  it("does not open when a field opted out of the shortcut", () => {
    startCareer();
    const field = document.createElement("input");
    const wrapper = document.createElement("div");
    wrapper.setAttribute("data-palette-shortcut", "off");
    wrapper.append(field);
    document.body.append(wrapper);
    act(() => {
      field.dispatchEvent(new KeyboardEvent("keydown", { key: "k", ctrlKey: true, bubbles: true }));
    });
    expect(palette()).toBeNull();
    wrapper.remove();
  });

  it("opens from the header search button and returns focus to it on close", async () => {
    startCareer();
    const button = screen.getByTestId("palette-open");
    button.focus();
    fireEvent.click(button);
    expect(palette()).not.toBeNull();
    expect(document.activeElement).toBe(input());
    key("Escape");
    await waitFor(() => expect(document.activeElement).toBe(button));
  });

  it("lists screens and actions before anything is typed", () => {
    startCareer();
    openWithShortcut();
    const listbox = screen.getByRole("listbox");
    expect(within(listbox).getByRole("group", { name: "Screens" })).toBeTruthy();
    expect(within(listbox).getByRole("group", { name: "Actions" })).toBeTruthy();
    expect(within(listbox).queryByRole("group", { name: "Clubs" })).toBeNull();
  });

  it("exposes a combobox with a listbox, options and the highlighted option", () => {
    startCareer();
    openWithShortcut();
    const combobox = screen.getByRole("combobox");
    const listbox = screen.getByRole("listbox");
    expect(combobox.getAttribute("aria-controls")).toBe(listbox.id);
    const options = screen.getAllByRole("option");
    expect(options.length).toBeGreaterThan(3);
    expect(activeOption()).toBe(options[0]);
    expect(options[0]?.getAttribute("aria-selected")).toBe("true");
    expect(options[1]?.getAttribute("aria-selected")).toBe("false");
  });

  it("moves the highlight with the arrow keys, Home and End", () => {
    startCareer();
    openWithShortcut();
    const options = screen.getAllByRole("option");
    key("ArrowDown");
    expect(activeOption()).toBe(options[1]);
    key("ArrowDown");
    expect(activeOption()).toBe(options[2]);
    key("ArrowUp");
    expect(activeOption()).toBe(options[1]);
    key("End");
    expect(activeOption()).toBe(options[options.length - 1]);
    key("Home");
    expect(activeOption()).toBe(options[0]);
    key("ArrowUp");
    expect(activeOption()).toBe(options[options.length - 1]);
  });

  it("finds a club by its start, ignoring diacritics, and opens it with Enter", () => {
    const [mine, other] = league.clubs;
    if (!mine || !other) throw new Error("clubs");
    startCareer();
    openWithShortcut();
    type(other.name.slice(0, 4).toUpperCase());
    const option = screen.getByTestId(`palette-option-club-${other.id}`);
    expect(within(option).getByText(other.name)).toBeTruthy();
    expect(activeOption()).toBe(screen.getAllByRole("option")[0]);
    key("Enter");
    expect(window.location.hash).toBe(`#/club/${encodeURIComponent(other.id)}`);
    expect(palette()).toBeNull();
  });

  it("finds a player by name, shows position and club, and opens the player's profile", () => {
    startCareer();
    const club = league.clubs[3];
    const player = league.players.find((p) => p.id === club?.playerIds[0]);
    if (!club || !player) throw new Error("player");
    openWithShortcut();
    type(player.name);
    const option = screen.getByTestId(`palette-option-player-${player.id}`);
    expect(option.textContent).toContain(player.name);
    expect(option.textContent).toContain(club.name);
    fireEvent.click(option);
    expect(window.location.hash).toBe(`#/player/${encodeURIComponent(player.id)}`);
  });

  it("shows an empty state when nothing matches", () => {
    startCareer();
    openWithShortcut();
    type("zzzzqqq");
    const empty = screen.getByTestId("palette-empty");
    expect(empty.textContent).toContain("zzzzqqq");
    expect(screen.queryByRole("option")).toBeNull();
    expect(input().getAttribute("aria-activedescendant")).toBeNull();
  });

  it("shows at most eight results per group", () => {
    startCareer();
    openWithShortcut();
    type(" ");
    type("a");
    for (const name of ["Clubs", "Players"]) {
      const group = screen.queryByRole("group", { name });
      if (group) expect(within(group).getAllByRole("option").length).toBeLessThanOrEqual(8);
    }
  });

  it("changes the theme from an action", () => {
    startCareer();
    openWithShortcut();
    type("theme light");
    fireEvent.click(screen.getByTestId("palette-option-action-theme-light"));
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(palette()).toBeNull();
  });

  it("changes the language from an action and labels the palette in Swedish", () => {
    startCareer("sv");
    openWithShortcut();
    expect(screen.getByRole("group", { name: "Sidor" })).toBeTruthy();
    expect(screen.getByRole("combobox", { name: /Sök bland sidor/ })).toBeTruthy();
    fireEvent.click(screen.getByTestId("palette-option-action-locale-en"));
    openWithShortcut();
    expect(screen.getByRole("group", { name: "Screens" })).toBeTruthy();
  });

  it("does not open from the shortcut while a match is running, but does when paused", () => {
    startCareer();
    goTo("#/match");
    fireEvent.click(screen.getByTestId("kick-off"));
    openWithShortcut();
    expect(palette()).toBeNull();
    fireEvent.click(screen.getByTestId("pause-toggle"));
    openWithShortcut();
    expect(palette()).not.toBeNull();
  });

  it("lets the shortcut work again after leaving the match", () => {
    startCareer();
    goTo("#/match");
    fireEvent.click(screen.getByTestId("kick-off"));
    openWithShortcut();
    expect(palette()).toBeNull();
    goTo("#/");
    openWithShortcut();
    expect(palette()).not.toBeNull();
  });
});

describe("command palette on a phone", () => {
  it("opens from the search button as a full-height sheet with tall results", () => {
    installBrowserStubs({ phone: true });
    startCareer();
    fireEvent.click(screen.getByTestId("palette-open"));
    const sheet = screen.getByTestId("command-palette");
    expect(sheet.className).toContain("max-sm:inset-0");
    for (const option of screen.getAllByRole("option")) {
      expect(option.className).toContain("min-h-12");
    }
  });
});
