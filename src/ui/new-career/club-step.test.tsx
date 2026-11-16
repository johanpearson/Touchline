import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateLeague } from "../../game";
import {
  createMemoryFileTransfer,
  createMemoryLocaleStore,
  createMemorySaveStore,
} from "../../platform";
import { App } from "../app";
import { buildClubCards } from "./club-cards";

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

const cardsFor = (seed: number) => {
  const result = generateLeague({ seed });
  if (!result.ok) throw new Error("league");
  return buildClubCards(result.league.clubs, result.league.players);
};

const openClubStep = (locale?: string) => {
  goTo("#/new");
  renderApp(locale);
  fireEvent.click(screen.getByTestId("choose-club"));
  goTo("#/new/club");
};

const scrollIntoView = vi.fn();
beforeEach(() => {
  scrollIntoView.mockClear();
  Element.prototype.scrollIntoView = scrollIntoView;
});

const options = () => within(screen.getByRole("listbox")).getAllByRole("option");
const selectedName = () => screen.getByTestId("club-name").textContent;

describe("club picker card", () => {
  beforeEach(() => openClubStep());
  afterEach(cleanup);

  it("shows the first club's card data for a fixed seed", () => {
    const first = cardsFor(SEED)[0];
    if (!first) throw new Error("no card");
    expect(selectedName()).toBe(first.club.name);
    expect(screen.getByTestId("club-difficulty").textContent).toBe("Easy");
    expect(screen.getByTestId("club-expectation").textContent).toBe(
      "The board expects the championship",
    );
    expect(screen.getByTestId("club-attack").textContent).toBe(String(first.attack));
    expect(screen.getByTestId("club-midfield").textContent).toBe(String(first.midfield));
    expect(screen.getByTestId("club-defence").textContent).toBe(String(first.defence));
    expect(screen.getByTestId("club-rating").textContent).toBe(String(first.rating));
    expect(screen.getByTestId("club-budget").textContent).toBe(`€${first.budgetMillions}M`);
    expect(screen.getByTestId("club-star").textContent).toContain(first.star?.name);
    expect(screen.getByTestId("club-kits").textContent).toContain("Worn when colours clash");
  });

  it("shows a very hard club for the weakest rank", () => {
    fireEvent.click(options()[13] as HTMLElement);
    expect(screen.getByTestId("club-difficulty").textContent).toBe("Very hard");
    expect(screen.getByTestId("club-expectation").textContent).toBe(
      "The board hopes for steady progress",
    );
  });

  it("starts the career with the club on the card", () => {
    fireEvent.click(options()[2] as HTMLElement);
    const name = selectedName();
    fireEvent.click(screen.getByTestId("start-career"));
    expect(window.location.hash).toBe("#/");
    expect(screen.getByTestId("hub-club-name").textContent).toBe(name);
  });
});

describe("club picker navigation", () => {
  beforeEach(() => openClubStep());
  afterEach(cleanup);

  it("moves with the arrows and wraps around at both ends", () => {
    const names = cardsFor(SEED).map((c) => c.club.name);
    fireEvent.click(screen.getByTestId("club-prev"));
    expect(selectedName()).toBe(names[13]);
    fireEvent.click(screen.getByTestId("club-next"));
    expect(selectedName()).toBe(names[0]);
    fireEvent.click(screen.getByTestId("club-next"));
    expect(selectedName()).toBe(names[1]);
  });

  it("keeps the strip in sync with the arrows and the arrows with the strip", () => {
    fireEvent.click(screen.getByTestId("club-next"));
    expect(options().map((o) => o.getAttribute("aria-selected"))).toEqual(
      options().map((_, i) => String(i === 1)),
    );
    fireEvent.click(options()[6] as HTMLElement);
    expect(selectedName()).toBe(cardsFor(SEED)[6]?.club.name);
  });

  it("announces the position as polite live text", () => {
    const live = screen.getByTestId("club-position");
    expect(live.getAttribute("aria-live")).toBe("polite");
    expect(live.textContent).toBe("1 of 14, sorted by rating");
    fireEvent.click(screen.getByTestId("club-next"));
    expect(live.textContent).toBe("2 of 14, sorted by rating");
  });

  it("changes club with Left and Right on the card region and keeps focus where it was", () => {
    const next = screen.getByTestId("club-next");
    next.focus();
    fireEvent.keyDown(next, { key: "ArrowRight" });
    expect(selectedName()).toBe(cardsFor(SEED)[1]?.club.name);
    expect(document.activeElement).toBe(next);
    fireEvent.keyDown(next, { key: "ArrowLeft" });
    expect(selectedName()).toBe(cardsFor(SEED)[0]?.club.name);
  });

  it("moves selection and focus along the strip with arrows, Home and End", () => {
    const first = options()[0] as HTMLElement;
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(document.activeElement).toBe(options()[1]);
    fireEvent.keyDown(options()[1] as HTMLElement, { key: "End" });
    expect(document.activeElement).toBe(options()[13]);
    expect(options()[13]?.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(options()[13] as HTMLElement, { key: "ArrowRight" });
    expect(document.activeElement).toBe(options()[0]);
    fireEvent.keyDown(options()[0] as HTMLElement, { key: "Home" });
    expect(options()[0]?.getAttribute("aria-selected")).toBe("true");
  });

  it("does not move the club while typing in the seed field", () => {
    fireEvent.click(screen.getByText("Advanced: league seed"));
    fireEvent.keyDown(screen.getByTestId("seed-input"), { key: "ArrowRight" });
    expect(selectedName()).toBe(cardsFor(SEED)[0]?.club.name);
  });

  it("scrolls the newly selected club to the middle of the strip", () => {
    fireEvent.click(screen.getByTestId("club-next"));
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", inline: "center" });
  });

  it("has a listbox with one tab stop: the selected club", () => {
    expect(screen.getByRole("listbox", { name: "Clubs" })).toBeTruthy();
    expect(options().filter((o) => o.tabIndex === 0)).toHaveLength(1);
    expect(options()[0]?.tabIndex).toBe(0);
  });
});

describe("club picker in Swedish", () => {
  afterEach(cleanup);

  it("uses Swedish texts and the Swedish button label", () => {
    openClubStep("sv");
    expect(screen.getByTestId("club-position").textContent).toBe("1 av 14, sorterat efter betyg");
    expect(screen.getByTestId("start-career").textContent).toBe(`Ta över ${selectedName()}`);
    expect(screen.getByTestId("club-expectation").textContent).toBe(
      "Styrelsen förväntar sig guldet",
    );
  });

  it("renders every generated club name on the card without losing the name", () => {
    openClubStep("sv");
    for (const card of cardsFor(SEED)) {
      fireEvent.click(screen.getByTestId(`club-option-${card.club.id}`));
      expect(selectedName()).toBe(card.club.name);
      expect(screen.getByTestId("start-career").textContent).toContain(card.club.name);
    }
  });
});
