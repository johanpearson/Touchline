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
