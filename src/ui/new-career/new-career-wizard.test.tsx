import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { generateLeague } from "../../game";
import {
  createMemoryFileTransfer,
  createMemoryLocaleStore,
  createMemorySaveStore,
} from "../../platform";
import { App } from "../app";
import { PLAYABLE_LEAGUE_ID, previewLeague } from "./league-preview";

const SEED = 11;
const createRenderer = () => ({ resize: () => {}, render: () => {}, dispose: () => {} });

const renderApp = (locale?: string) =>
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

const league = () => {
  const result = generateLeague({ seed: SEED });
  if (!result.ok) throw new Error("league");
  return result.league;
};

const firstCard = () => screen.getByTestId(`league-card-${PLAYABLE_LEAGUE_ID}`);
const lockedCards = () =>
  screen.getAllByRole("radio").filter((card) => card.getAttribute("aria-disabled") === "true");

describe("new career, step 1 (league)", () => {
  beforeEach(() => goTo("#/new"));
  afterEach(cleanup);

  it("shows the step label and the title", () => {
    renderApp();
    expect(screen.getByTestId("wizard-step").textContent).toBe("New career, step 1 of 2");
    expect(screen.getByRole("heading", { name: "Pick a league" })).toBeTruthy();
  });

  it("links back to the start screen", () => {
    renderApp();
    expect(screen.getByTestId("wizard-back").getAttribute("href")).toBe("#/");
  });

  it("offers the generated league as the only selectable card, already selected", () => {
    renderApp();
    const cards = within(screen.getByRole("radiogroup", { name: "Leagues" })).getAllByRole("radio");
    expect(cards).toHaveLength(4);
    expect(firstCard().getAttribute("aria-checked")).toBe("true");
    expect(firstCard().getAttribute("aria-disabled")).toBeNull();
    expect(lockedCards()).toHaveLength(3);
  });

  it("shows the league name and the real format on its card", () => {
    renderApp();
    expect(within(firstCard()).getByText(league().name)).toBeTruthy();
    expect(within(firstCard()).getByText("14 clubs")).toBeTruthy();
    expect(within(firstCard()).getByText("26 rounds, home and away")).toBeTruthy();
  });

  it("announces locked cards as disabled with the reason and a Coming later badge", () => {
    renderApp();
    for (const card of lockedCards()) {
      expect(within(card).getByText("Coming later")).toBeTruthy();
      expect(card.getAttribute("aria-checked")).toBe("false");
      const reason = document.getElementById(card.getAttribute("aria-describedby") ?? "");
      expect(reason?.textContent).toBe("Not playable yet. Coming later.");
    }
  });

  it("cannot select a locked card by click, Enter or Space", () => {
    renderApp();
    const locked = lockedCards()[0];
    if (!locked) throw new Error("no locked card");
    fireEvent.click(locked);
    fireEvent.keyDown(locked, { key: "Enter" });
    fireEvent.keyDown(locked, { key: " " });
    expect(locked.getAttribute("aria-checked")).toBe("false");
    expect(firstCard().getAttribute("aria-checked")).toBe("true");
  });

  it("keeps arrow keys on the only selectable league and never lands on a locked one", () => {
    renderApp();
    firstCard().focus();
    for (const key of ["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft", "End", "Home"]) {
      fireEvent.keyDown(firstCard(), { key });
      expect(document.activeElement).toBe(firstCard());
    }
    expect(lockedCards().every((c) => c.getAttribute("aria-checked") === "false")).toBe(true);
  });

  it("has one tab stop: the selected card", () => {
    renderApp();
    const stops = screen.getAllByRole("radio").filter((card) => card.tabIndex === 0);
    expect(stops).toEqual([firstCard()]);
  });

  it("previews the league from the same data as generateLeague", () => {
    renderApp();
    const expected = previewLeague(SEED);
    if (!expected) throw new Error("preview");
    const panel = screen.getByTestId("league-preview");
    expect(within(panel).getByTestId("preview-name").textContent).toBe(expected.name);
    const rows = within(screen.getByTestId("preview-top")).getAllByRole("listitem");
    expect(rows.map((row) => row.textContent)).toEqual(
      expected.topClubs.map((club) => `${club.name}${club.rating}`),
    );
    expect(screen.getByTestId("preview-more").textContent).toBe(
      `and ${expected.moreCount} more, ratings ${expected.minRating} to ${expected.maxRating}`,
    );
  });

  it("tells the truth about the format: derived rounds, no promotion text", () => {
    renderApp();
    const text = screen.getByTestId("league-step").textContent ?? "";
    expect(screen.getByTestId("preview-format").textContent).toBe("26 rounds, home and away");
    expect(text).not.toMatch(/30 rounds/);
    expect(text).not.toMatch(/promotion|promoted|relegat/i);
  });

  it("shows the Swedish texts", () => {
    renderApp("sv");
    expect(screen.getByTestId("wizard-step").textContent).toBe("Ny karriär, steg 1 av 2");
    expect(screen.getByTestId("choose-club").textContent).toBe("Välj din klubb");
    expect(within(lockedCards()[0] as HTMLElement).getByText("Kommer senare")).toBeTruthy();
  });
});

describe("new career wizard flow", () => {
  beforeEach(() => goTo("#/new"));
  afterEach(cleanup);

  it("goes to step 2 with Choose your club", () => {
    renderApp();
    fireEvent.click(screen.getByTestId("choose-club"));
    expect(window.location.hash).toBe("#/new/club");
    goTo("#/new/club");
    expect(screen.getByTestId("wizard-step").textContent).toBe("New career, step 2 of 2");
    expect(screen.getByTestId("new-career")).toBeTruthy();
  });

  it("goes back to step 1 with the back link of step 2", () => {
    renderApp();
    fireEvent.click(screen.getByTestId("choose-club"));
    goTo("#/new/club");
    expect(screen.getByTestId("wizard-back").getAttribute("href")).toBe("#/new");
  });

  it("keeps the league and the seed when going Back and Next", () => {
    renderApp();
    fireEvent.click(screen.getByTestId("choose-club"));
    goTo("#/new/club");
    fireEvent.change(screen.getByTestId("seed-input"), { target: { value: "99" } });
    goTo("#/new");
    expect(screen.getByTestId("preview-name").textContent).toBe(previewLeague(99)?.name);
    expect(firstCard().getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByTestId("choose-club"));
    goTo("#/new/club");
    expect((screen.getByTestId("seed-input") as HTMLInputElement).value).toBe("99");
  });

  it("redirects a direct visit of step 2 to step 1", () => {
    goTo("#/new/club");
    renderApp();
    expect(window.location.hash).toBe("#/new");
  });
});
