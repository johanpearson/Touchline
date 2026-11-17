import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Career, createCareer, generateLeague, getNextFixture } from "../game";
import {
  createMemoryDensityStore,
  createMemoryFileTransfer,
  createMemoryLocaleStore,
  createMemorySaveStore,
} from "../platform";
import type { SaveStore } from "../shared";
import { App } from "./app";
import { I18nProvider } from "./i18n-provider";
import { matchSetupFor } from "./match-setup";
import { SquadScreen } from "./squad-screen";
import { DensityProvider } from "./theme/density-provider";
import { CareerProvider } from "./use-career";

const SEED = 11;
const createRenderer = () => ({ resize: vi.fn(), render: vi.fn(), dispose: vi.fn() });

const goTo = (hash: string) =>
  act(() => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  });

const mountApp = (store: SaveStore = createMemorySaveStore(), locale = "en") =>
  render(
    <App
      createRenderer={createRenderer}
      localeStore={createMemoryLocaleStore(locale)}
      saveStore={store}
      fileTransfer={createMemoryFileTransfer()}
      now={() => "2026-01-01T12:00:00.000Z"}
      initialSeed={SEED}
      tickMs={1000}
    />,
  );

const startCareer = () => {
  const league = generateLeague({ seed: SEED });
  const club = league.ok ? league.league.clubs[0] : undefined;
  if (!club) throw new Error("club");
  goTo("#/new");
  fireEvent.click(screen.getByTestId("choose-club"));
  goTo("#/new/club");
  fireEvent.click(screen.getByTestId(`club-option-${club.id}`));
  fireEvent.click(screen.getByTestId("start-career"));
  goTo("#/squad");
  return club;
};

const renderSquad = (career: Career, density: string | null = null) =>
  render(
    <I18nProvider store={createMemoryLocaleStore("en")}>
      <DensityProvider store={createMemoryDensityStore(density)}>
        <CareerProvider
          saveStore={createMemorySaveStore()}
          now={() => "2026-01-01T12:00:00.000Z"}
          fileTransfer={createMemoryFileTransfer()}
        >
          <SquadScreen career={career} />
        </CareerProvider>
      </DensityProvider>
    </I18nProvider>,
  );

describe("squad screen", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    goTo("#/");
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("lists all 22 players with their status", () => {
    mountApp();
    startCareer();
    expect(screen.getAllByTestId(/^plan-row-/)).toHaveLength(22);
    const statuses = screen
      .getAllByTestId(/^plan-status-/)
      .map((e) => e.getAttribute("data-status"));
    expect(statuses.filter((s) => s === "starter")).toHaveLength(11);
    expect(statuses.filter((s) => s === "bench")).toHaveLength(7);
    expect(statuses.filter((s) => s === "out")).toHaveLength(4);
  });

  it("marks low fitness with a warning and keeps the number visible", () => {
    const league = generateLeague({ seed: SEED });
    if (!league.ok) throw new Error("league");
    const created = createCareer({ seed: SEED, userClubId: league.league.clubs[0]?.id ?? "" });
    if (!created.ok) throw new Error("career");
    const tired = created.career.squadPlan.starters[1] ?? "";
    const career: Career = {
      ...created.career,
      condition: { ...created.career.condition, [tired]: { fitness: 42, form: 5 } },
    };
    renderSquad(career);
    expect(screen.getAllByTestId(/^plan-low-fitness-/)).toHaveLength(1);
    expect(screen.getByTestId(`plan-low-fitness-${tired}`)).toBeTruthy();
    expect(screen.getByTestId(`plan-fitness-${tired}`).textContent).toContain("42");
  });
});

describe("squad plan and match setup", () => {
  it("gives the match input the plan's tactics", async () => {
    const { setTactics } = await import("../game");
    const league = generateLeague({ seed: SEED });
    if (!league.ok) throw new Error("league");
    const created = createCareer({ seed: SEED, userClubId: league.league.clubs[0]?.id ?? "" });
    if (!created.ok) throw new Error("career");
    const career: Career = setTactics(created.career, {
      mentality: "attacking",
      pressing: "high",
      width: "wide",
      tempo: "fast",
    });
    const fixture = getNextFixture(career.season, career.userClubId);
    if (!fixture) throw new Error("fixture");
    const setup = matchSetupFor(career, fixture);
    const tactics =
      fixture.homeClubId === career.userClubId
        ? setup.input.home.tactics
        : setup.input.away.tactics;
    expect(tactics).toEqual({
      mentality: "attacking",
      pressing: "high",
      width: "wide",
      tempo: "fast",
    });
  });
});

describe("squad table", () => {
  const careerFor = (): Career => {
    const league = generateLeague({ seed: SEED });
    if (!league.ok) throw new Error("league");
    const created = createCareer({ seed: SEED, userClubId: league.league.clubs[0]?.id ?? "" });
    if (!created.ok) throw new Error("career");
    return created.career;
  };
  const names = () =>
    screen
      .getAllByTestId(/^plan-row-/)
      .map((row) => within(row).getAllByRole("cell")[0]?.textContent ?? "");

  beforeEach(() => window.sessionStorage.clear());
  afterEach(cleanup);

  it("shows the club, the player count and the average age in the header", () => {
    renderSquad(careerFor());
    expect(screen.getByTestId("squad-summary").textContent).toMatch(/22 players, average age \d/);
  });

  it("filters by position line and announces the count", () => {
    renderSquad(careerFor());
    fireEvent.mouseDown(screen.getByTestId("squad-filter-GK"), { button: 0 });
    const keepers = screen.getAllByTestId(/^plan-row-/);
    expect(keepers.every((r) => r.getAttribute("data-position") === "GK")).toBe(true);
    expect(screen.getByTestId("squad-results").textContent).toBe(`${keepers.length} players shown`);
    expect(screen.getByTestId("squad-results").getAttribute("role")).toBe("status");
  });

  it("searches names without regard to diacritics and shows an empty state", () => {
    renderSquad(careerFor());
    const first = names()[0] ?? "";
    const typed = first
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toUpperCase();
    fireEvent.change(screen.getByTestId("squad-search"), { target: { value: typed } });
    expect(names()).toContain(first);
    fireEvent.change(screen.getByTestId("squad-search"), { target: { value: "zzzzqq" } });
    expect(screen.queryAllByTestId(/^plan-row-/)).toHaveLength(0);
    expect(screen.getByTestId("squad-empty")).toBeTruthy();
    expect(screen.getByTestId("squad-results").textContent).toBe("0 players shown");
  });

  it("sorts with operable headers that carry aria-sort, and remembers the sort for the session", () => {
    const career = careerFor();
    const first = renderSquad(career);
    fireEvent.click(screen.getByRole("button", { name: /^Age/ }));
    const header = screen.getByRole("columnheader", { name: /^Age/ });
    expect(header.getAttribute("aria-sort")).toBe("ascending");
    first.unmount();
    renderSquad(career);
    expect(screen.getByRole("columnheader", { name: /^Age/ }).getAttribute("aria-sort")).toBe(
      "ascending",
    );
  });

  it("groups by position when asked", () => {
    renderSquad(careerFor());
    expect(screen.queryAllByRole("rowheader")).toHaveLength(0);
    fireEvent.click(screen.getByTestId("squad-group"));
    expect(screen.getAllByText("Goalkeepers").length).toBeGreaterThan(0);
  });

  it("shows the twelve attributes as low-priority columns", () => {
    renderSquad(careerFor());
    for (const label of ["Pas", "Fin", "Tac", "Str"]) {
      expect(screen.getByRole("columnheader", { name: new RegExp(`^${label}`) })).toBeTruthy();
    }
  });

  it("follows the density setting", () => {
    renderSquad(careerFor(), "comfortable");
    const cell = within(screen.getAllByTestId(/^plan-row-/)[0] as HTMLElement).getAllByRole(
      "cell",
    )[1];
    expect(cell?.className).toContain("py-3.5");
  });

  it("links to the tactics screen instead of embedding the lineup editor", () => {
    renderSquad(careerFor());
    expect(screen.queryByTestId("lineup-editor")).toBeNull();
    expect(screen.getByTestId("edit-lineup").getAttribute("href")).toBe("#/tactics");
  });
});

describe("squad table: player data, detail panel and finances", () => {
  const careerFor = (): Career => {
    const league = generateLeague({ seed: SEED });
    if (!league.ok) throw new Error("league");
    const created = createCareer({ seed: SEED, userClubId: league.league.clubs[0]?.id ?? "" });
    if (!created.ok) throw new Error("career");
    return created.career;
  };
  const rowIds = () =>
    screen.getAllByTestId(/^plan-row-/).map((row) => row.getAttribute("data-testid"));

  beforeEach(() => window.sessionStorage.clear());
  afterEach(cleanup);

  it("shows age, potential stars, contract end, wage and value for every player", () => {
    const career = careerFor();
    renderSquad(career);
    const id = career.squadPlan.starters[0] ?? "";
    expect(screen.getByTestId(`player-age-${id}`).textContent).toMatch(/^\d+$/);
    expect(screen.getByTestId(`player-potential-${id}`).getAttribute("aria-label")).toMatch(
      /^[1-5] of 5 stars$/,
    );
    expect(screen.getByTestId(`player-contract-${id}`).textContent).toMatch(/^Season \d+$/);
    expect(screen.getByTestId(`player-wage-${id}`).textContent).toMatch(/^€[\d.,]+[Mk]$/);
    expect(screen.getByTestId(`player-value-${id}`).textContent).toMatch(/^€[\d.,]+[Mk]$/);
  });

  it.each(["Age", "Potential", "Wage", "Value", "Overall"])(
    "sorts by %s without changing the lineup",
    (label) => {
      const career = careerFor();
      renderSquad(career);
      const before = screen
        .getAllByTestId(/^plan-status-/)
        .map((e) => [e.getAttribute("data-testid"), e.getAttribute("data-status")].join());
      fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${label}`) }));
      expect(
        screen
          .getByRole("columnheader", { name: new RegExp(`^${label}`) })
          .getAttribute("aria-sort"),
      ).toBe("ascending");
      const after = screen
        .getAllByTestId(/^plan-status-/)
        .map((e) => [e.getAttribute("data-testid"), e.getAttribute("data-status")].join());
      expect([...after].sort()).toEqual([...before].sort());
      expect(rowIds()).toHaveLength(22);
    },
  );

  it("sorts by wage from low to high", () => {
    renderSquad(careerFor());
    fireEvent.click(screen.getByRole("button", { name: /^Wage/ }));
    const wages = screen.getAllByTestId(/^player-wage-/).map((e) => e.textContent ?? "");
    expect(wages).toHaveLength(22);
    const rank = (text: string) =>
      Number.parseFloat(text.replace(/[^\d.]/g, "")) * (text.endsWith("M") ? 1000 : 1);
    const numbers = wages.map(rank);
    expect(numbers).toEqual([...numbers].sort((a, b) => a - b));
  });

  it("opens a labelled detail panel with all 12 attributes and no deltas before a rollover", () => {
    const career = careerFor();
    renderSquad(career);
    const id = career.squadPlan.starters[0] ?? "";
    fireEvent.click(screen.getByTestId(`player-details-${id}`));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByTestId("player-detail")).toBeTruthy();
    expect(screen.getAllByTestId(/^detail-attr-/)).toHaveLength(12);
    expect(screen.queryAllByTestId(/^detail-delta-/)).toHaveLength(0);
    expect(screen.getByTestId("player-detail-no-history")).toBeTruthy();
  });

  it("shows the change since last season with a text marker", () => {
    const base = careerFor();
    const id = base.squadPlan.starters[0] ?? "";
    const career: Career = {
      ...base,
      lastDevelopment: [
        { playerId: id, attribute: "pace", before: 10, after: 12 },
        { playerId: id, attribute: "passing", before: 9, after: 8 },
      ],
    };
    renderSquad(career);
    fireEvent.click(screen.getByTestId(`player-details-${id}`));
    expect(screen.getByTestId("detail-delta-pace").textContent).toContain("+2");
    expect(screen.getByTestId("detail-delta-pace").textContent).toContain("Up +2");
    expect(screen.getByTestId("detail-delta-passing").textContent).toContain("Down −1");
    expect(screen.getByTestId("detail-delta-finishing").textContent).toContain("Unchanged");
  });

  it("shows the club finances without warnings when the club can afford its wages", () => {
    renderSquad(careerFor());
    expect(screen.getByTestId("club-balance").textContent).toMatch(/^[−€]/);
    expect(screen.getByTestId("club-wage-bill").textContent).toContain("a season");
    expect(screen.getByTestId("club-wage-budget")).toBeTruthy();
    expect(screen.queryByTestId("club-warning-wages")).toBeNull();
    expect(screen.queryByTestId("club-warning-balance")).toBeNull();
  });

  it("warns in text when the wage bill is over budget and the balance is negative", () => {
    const base = careerFor();
    const career: Career = {
      ...base,
      finances: { ...base.finances, [base.userClubId]: { balance: -250, baseIncome: 1 } },
    };
    renderSquad(career);
    expect(screen.getByTestId("club-warning-wages").textContent).toContain("over the wage budget");
    expect(screen.getByTestId("club-warning-balance").textContent).toContain("negative");
    expect(screen.getByTestId("club-balance").textContent).toMatch(/^−/);
  });
});
