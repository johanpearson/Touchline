import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Career, parseCareer } from "../../game";
import {
  createEnvelope,
  createMemoryFileTransfer,
  createMemoryLocaleStore,
  createMemorySaveStore,
} from "../../platform";
import type { SaveEnvelope, SaveStore } from "../../shared";
import { App } from "../app";
import { careerInWindow } from "../test-career";
import { marketSummary } from "./market-status";

const NOW = () => "2026-01-01T12:00:00.000Z";
const createRenderer = () => ({ resize: vi.fn(), render: vi.fn(), dispose: vi.fn() });

const goTo = (hash: string) =>
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });

const open = careerInWindow();

const mountWith = async (career: Career, locale = "en") => {
  const store = createMemorySaveStore();
  await store.save("autosave", createEnvelope(career, NOW));
  render(
    <App
      createRenderer={createRenderer}
      localeStore={createMemoryLocaleStore(locale)}
      saveStore={store}
      fileTransfer={createMemoryFileTransfer()}
      now={NOW}
      initialSeed={11}
      tickMs={1000}
    />,
  );
  fireEvent.click(await screen.findByTestId("continue-career"));
  await screen.findByTestId("nav-hub");
  await act(async () => {});
  goTo("#/market");
  return store;
};

const savedCareer = async (store: SaveStore): Promise<Career> => {
  const envelope = (await store.load("autosave")) as SaveEnvelope;
  const parsed = parseCareer(envelope.game);
  if (!parsed.ok) throw new Error("career");
  return parsed.career;
};

const ownIds = (career: Career) =>
  career.league.clubs.find((c) => c.id === career.userClubId)?.playerIds ?? [];

const firstBuyId = (): string => {
  const button = screen.getAllByTestId(/^buy-/)[0];
  return (button?.getAttribute("data-testid") ?? "").replace("buy-", "");
};

beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  goTo("#/");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("market screen", () => {
  it("shows the three tabs, the window state and the club's money and squad count", async () => {
    await mountWith(open);
    const summary = marketSummary(open);
    expect(screen.getByTestId("market-screen")).toBeTruthy();
    for (const tab of ["players", "free-agents", "offers"]) {
      expect(screen.getByTestId(`market-tab-${tab}`)).toBeTruthy();
    }
    expect(screen.getByTestId("market-window").textContent).toMatch(/open/);
    expect(screen.getByTestId("market-squad-count").textContent).toContain(
      `${summary.squadCount} of 30`,
    );
    expect(screen.getAllByTestId(/^market-row-/).length).toBeGreaterThan(0);
  });

  it("buys a player at the prefilled asking price and moves him to the squad", async () => {
    const store = await mountWith(open);
    const id = firstBuyId();
    fireEvent.click(screen.getByTestId(`buy-${id}`));
    const input = screen.getByTestId("fee-input") as HTMLInputElement;
    expect(Number(input.value)).toBeGreaterThan(0);
    fireEvent.click(screen.getByTestId("confirm-buy"));

    await waitFor(() => expect(screen.queryByTestId("confirm-buy")).toBeNull());
    expect(screen.getByTestId("market-done")).toBeTruthy();
    expect(screen.queryByTestId(`market-row-${id}`)).toBeNull();
    const count = marketSummary(open).squadCount + 1;
    expect(screen.getByTestId("market-squad-count").textContent).toContain(`${count} of 30`);
    await waitFor(async () => expect(ownIds(await savedCareer(store))).toContain(id));
    goTo("#/squad");
    expect(screen.getByTestId(`plan-row-${id}`)).toBeTruthy();
  });

  it("shows the refusal as text when the fee is below the asking price", async () => {
    await mountWith(open);
    const id = firstBuyId();
    fireEvent.click(screen.getByTestId(`buy-${id}`));
    fireEvent.change(screen.getByTestId("fee-input"), { target: { value: "1" } });
    fireEvent.click(screen.getByTestId("confirm-buy"));
    expect(screen.getByTestId("transfer-error").textContent).toMatch(/below the asking price/);
    expect(screen.getByTestId(`market-row-${id}`)).toBeTruthy();
  });

  it("shows the refusal when the club cannot afford the fee", async () => {
    const poor: Career = {
      ...open,
      finances: {
        ...open.finances,
        [open.userClubId]: { balance: 0, baseIncome: 1_000_000 },
      },
    };
    await mountWith(poor);
    fireEvent.click(screen.getByTestId(`buy-${firstBuyId()}`));
    fireEvent.click(screen.getByTestId("confirm-buy"));
    expect(screen.getByTestId("transfer-error").textContent).toMatch(/cannot afford/);
  });

  it("disables buying with a visible reason while the window is closed, but still signs free agents", async () => {
    const store = await mountWith({ ...open, window: "closed" });
    expect(screen.getByTestId("market-blocked").textContent).toMatch(/closed/);
    for (const button of screen.getAllByTestId(/^buy-/)) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
    fireEvent.mouseDown(screen.getByTestId("market-tab-free-agents"), { button: 0 });
    await waitFor(() =>
      expect(screen.getAllByTestId(/^free-agent-sign-/).length).toBeGreaterThan(0),
    );
    const sign = screen.getAllByTestId(/^free-agent-sign-/)[0] as HTMLButtonElement;
    expect(sign.disabled).toBe(false);
    const id = sign.getAttribute("data-testid")?.replace("free-agent-sign-", "") ?? "";
    fireEvent.click(sign);
    fireEvent.click(screen.getByTestId("confirm-sign"));
    await waitFor(() => expect(screen.queryByTestId("confirm-sign")).toBeNull());
    await waitFor(async () => expect(ownIds(await savedCareer(store))).toContain(id));
  });

  it("asks for a wage when signing a free agent and refuses a low wage", async () => {
    await mountWith(open);
    fireEvent.mouseDown(screen.getByTestId("market-tab-free-agents"), { button: 0 });
    const sign = (await screen.findAllByTestId(/^free-agent-sign-/))[0] as HTMLElement;
    fireEvent.click(sign);
    fireEvent.change(screen.getByTestId("wage-input"), { target: { value: "0" } });
    fireEvent.click(screen.getByTestId("confirm-sign"));
    expect(screen.getByTestId("transfer-error").textContent).toMatch(/wage is below/);
  });

  it("explains a full squad and disables buying", async () => {
    const donors = open.league.clubs.filter((c) => c.id !== open.userClubId);
    const missing = 30 - ownIds(open).length;
    const extra = donors.slice(0, missing).map((c) => c.playerIds.at(-1) ?? "");
    const full: Career = {
      ...open,
      league: {
        ...open.league,
        clubs: open.league.clubs.map((c) => {
          if (c.id === open.userClubId) return { ...c, playerIds: [...c.playerIds, ...extra] };
          return { ...c, playerIds: c.playerIds.filter((id) => !extra.includes(id)) };
        }),
      },
    };
    await mountWith(full);
    expect(screen.getByTestId("market-blocked").textContent).toMatch(/Squad full: 30 of 30/);
    expect((screen.getAllByTestId(/^buy-/)[0] as HTMLButtonElement).disabled).toBe(true);
  });

  it("accepts an offer and removes the player from the squad", async () => {
    const store = await mountWith(open);
    fireEvent.mouseDown(screen.getByTestId("market-tab-offers"), { button: 0 });
    const offer = open.offers[0];
    if (!offer) throw new Error("no offer");
    fireEvent.click(await screen.findByTestId(`offer-accept-${offer.id}`));
    await waitFor(() => expect(screen.queryByTestId(`offer-row-${offer.id}`)).toBeNull());
    expect(screen.getByTestId("market-done")).toBeTruthy();
    expect(screen.queryByTestId(`own-row-${offer.playerId}`)).toBeNull();
    await waitFor(async () =>
      expect(ownIds(await savedCareer(store))).not.toContain(offer.playerId),
    );
  });

  it("releases a player only after a confirmation", async () => {
    await mountWith(open);
    fireEvent.mouseDown(screen.getByTestId("market-tab-offers"), { button: 0 });
    const rows = await screen.findAllByTestId(/^release-/);
    const id = (rows[0]?.getAttribute("data-testid") ?? "").replace("release-", "");
    fireEvent.click(screen.getByTestId(`release-${id}`));
    expect(screen.getByTestId(`own-row-${id}`)).toBeTruthy();
    fireEvent.click(screen.getByTestId("confirm-release"));
    await waitFor(() => expect(screen.queryByTestId(`own-row-${id}`)).toBeNull());
    expect(screen.getByTestId("market-done").textContent).toMatch(/released/);
  });

  it("refuses a release that would break the squad minimums and says why", async () => {
    const keep = [...open.squadPlan.starters, ...open.squadPlan.bench];
    const dropped = ownIds(open).filter((id) => !keep.includes(id));
    const small: Career = {
      ...open,
      league: {
        ...open.league,
        clubs: open.league.clubs.map((c, index) => {
          if (c.id === open.userClubId) return { ...c, playerIds: keep };
          return index === 0 || (index === 1 && open.league.clubs[0]?.id === open.userClubId)
            ? { ...c, playerIds: [...c.playerIds, ...dropped] }
            : c;
        }),
      },
    };
    await mountWith(small);
    fireEvent.mouseDown(screen.getByTestId("market-tab-offers"), { button: 0 });
    const id = keep[0] ?? "";
    fireEvent.click(await screen.findByTestId(`release-${id}`));
    fireEvent.click(screen.getByTestId("confirm-release"));
    await waitFor(() => expect(screen.getByTestId("market-error")).toBeTruthy());
    expect(screen.getByTestId("market-error").textContent).toMatch(/minimum/);
    expect(screen.getByTestId(`own-row-${id}`)).toBeTruthy();
  });

  it("filters the players by maximum age", async () => {
    await mountWith(open);
    const before = screen.getAllByTestId(/^market-row-/).length;
    fireEvent.change(screen.getByTestId("market-filter-age"), { target: { value: "20" } });
    const after = screen.getAllByTestId(/^market-row-/).length;
    expect(after).toBeLessThan(before);
    for (const age of screen.getAllByTestId(/^market-player-/)) expect(age).toBeTruthy();
  });

  it("labels its tables for assistive technology and works in Swedish", async () => {
    await mountWith(open, "sv");
    expect(screen.getByTestId("market-screen").textContent).toContain("Transfermarknad");
    expect(
      within(screen.getByTestId("market-screen")).getAllByRole("table").length,
    ).toBeGreaterThan(0);
  });
});
