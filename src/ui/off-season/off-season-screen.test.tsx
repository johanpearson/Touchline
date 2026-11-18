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
import { careerInOffSeason } from "../test-career";
import { expiringPlayers, startBlock } from "./off-season-status";

const NOW = () => "2026-01-01T12:00:00.000Z";
const createRenderer = () => ({ resize: vi.fn(), render: vi.fn(), dispose: vi.fn() });

const goTo = (hash: string) =>
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });

const offSeason = careerInOffSeason();

/** Saves the career as the autosave, opens the app, continues it and goes to `hash`. */
const mountWith = async (career: Career, hash = "#/off-season", locale = "en") => {
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
  goTo(hash);
  return store;
};

const savedCareer = async (store: SaveStore): Promise<Career> => {
  const envelope = (await store.load("autosave")) as SaveEnvelope;
  const parsed = parseCareer(envelope.game);
  if (!parsed.ok) throw new Error("career");
  return parsed.career;
};

const idOf = (testId: string | null, prefix: string) => (testId ?? "").slice(prefix.length);

beforeEach(() => {
  goTo("#/");
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});
afterEach(cleanup);

describe("off-season screen", () => {
  it("shows the review of the finished rollover", async () => {
    await mountWith(offSeason);

    expect(screen.getByTestId("screen-off-season")).toBeTruthy();
    expect(screen.getByTestId("risers")).toBeTruthy();
    expect(screen.getByTestId("fallers")).toBeTruthy();
    expect(screen.getByTestId("retirements")).toBeTruthy();
    expect(screen.getAllByTestId(/^youth-/)).toHaveLength(3);
    expect(screen.getByTestId("money-wages").textContent).toMatch(/€/);
  });

  it("lists a re-sign button for every player whose contract has ended", async () => {
    await mountWith(offSeason);

    const expected = expiringPlayers(offSeason).map((r) => r.player.id);

    const shown = screen
      .getAllByTestId(/^resign-/)
      .map((b) => idOf(b.getAttribute("data-testid"), "resign-"));
    expect(shown.sort()).toEqual(expected.sort());
  });

  it("re-signs a player at his asking wage and saves the new contract", async () => {
    const store = await mountWith(offSeason);
    const row = expiringPlayers(offSeason)[0];
    if (!row) throw new Error("no expiring player");

    fireEvent.click(screen.getByTestId(`resign-${row.player.id}`));
    fireEvent.click(screen.getByTestId("confirm-resign"));

    await waitFor(async () => {
      const saved = await savedCareer(store);
      expect(saved.contracts[row.player.id]).toEqual({
        wage: row.ask,
        expiresSeason: offSeason.season.number + 3,
      });
    });
    expect(screen.queryByTestId(`resign-${row.player.id}`)).toBeNull();
    expect(screen.getByTestId("renewal-done").textContent).toContain(row.player.name);
  });

  it("explains a wage below the ask as translated text and keeps the dialog open", async () => {
    await mountWith(offSeason);
    const row = expiringPlayers(offSeason)[0];
    if (!row) throw new Error("no expiring player");

    fireEvent.click(screen.getByTestId(`resign-${row.player.id}`));
    fireEvent.change(screen.getByTestId("wage-input"), { target: { value: "1" } });
    fireEvent.click(screen.getByTestId("confirm-resign"));

    expect(screen.getByTestId("renewal-error").textContent).toBe(
      "The wage is below what the player asks.",
    );
    expect(screen.getByTestId(`resign-${row.player.id}`)).toBeTruthy();
  });

  it("explains a wage that breaks the wage budget, in Swedish too", async () => {
    const poor: Career = {
      ...offSeason,
      finances: {
        ...offSeason.finances,
        [offSeason.userClubId]: { balance: 0, baseIncome: 1 },
      },
    };
    await mountWith(poor, "#/off-season", "sv");
    const row = expiringPlayers(poor)[0];
    if (!row) throw new Error("no expiring player");

    fireEvent.click(screen.getByTestId(`resign-${row.player.id}`));
    fireEvent.click(screen.getByTestId("confirm-resign"));

    expect(screen.getByTestId("renewal-error").textContent).toBe(
      "Lönen skulle göra att lönekostnaden går över lönebudgeten.",
    );
  });

  it("disables the start button with a visible reason while the squad is below the minimum", async () => {
    const mine = offSeason.league.clubs.find((c) => c.id === offSeason.userClubId)?.playerIds ?? [];
    const allEnded: Career = {
      ...offSeason,
      contracts: {
        ...offSeason.contracts,
        ...Object.fromEntries(mine.map((id) => [id, { wage: 1, expiresSeason: 1 }])),
      },
    };
    expect(startBlock(allEnded)?.kind).toBe("under");
    await mountWith(allEnded);

    const button = screen.getByTestId("start-next-season") as HTMLButtonElement;

    expect(button.disabled).toBe(true);
    expect(screen.getByTestId("start-blocked-reason").textContent).toMatch(/At least 18/);
  });

  it("enables the start button once everyone is re-signed and starts season 2 at matchday 1", async () => {
    const store = await mountWith(offSeason);
    for (const button of screen.getAllByTestId(/^resign-/)) {
      fireEvent.click(button);
      fireEvent.click(screen.getByTestId("confirm-resign"));
    }

    expect(screen.queryByTestId("start-blocked-reason")).toBeNull();
    const button = screen.getByTestId("start-next-season") as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    fireEvent.click(button);

    expect(screen.getByTestId("next-match-matchday").textContent).toContain("1");
    await waitFor(async () => {
      const saved = await savedCareer(store);
      expect(saved.season.number).toBe(2);
      expect(saved.window).toBe("closed");
    });
  });

  it("links to the transfer market", async () => {
    await mountWith(offSeason);

    expect(screen.getByTestId("off-season-market").getAttribute("href")).toBe("#/market");
  });

  it("is in Swedish when the language is Swedish", async () => {
    await mountWith(offSeason, "#/off-season", "sv");

    expect(within(screen.getByTestId("screen-off-season")).getByText("Kontrakt")).toBeTruthy();
  });

  it("reloads a career saved in the window straight into the window", async () => {
    await mountWith(offSeason, "#/");

    expect(screen.getByTestId("to-off-season").getAttribute("href")).toBe("#/off-season");
    goTo("#/off-season");
    expect(screen.getByTestId("screen-off-season")).toBeTruthy();
  });

  it("sends the user to the hub when the window is closed", async () => {
    await mountWith({ ...offSeason, window: "closed" });

    expect(screen.queryByTestId("screen-off-season")).toBeNull();
    expect(screen.getByTestId("career-hub")).toBeTruthy();
  });
});
