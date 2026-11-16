import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type Career,
  createCareer,
  FORMATION_SHAPE,
  generateLeague,
  getNextFixture,
  parseCareer,
} from "../game";
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

/** The lineup and tactics editors sit behind a toggle until they get their own screen. */
const openEditor = () => {
  if (!screen.queryByTestId("lineup-editor")) fireEvent.click(screen.getByTestId("edit-lineup"));
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

const select = (testId: string) => screen.getByTestId(testId) as HTMLSelectElement;
const choose = (testId: string, value: string) =>
  fireEvent.change(select(testId), { target: { value } });
const ratings = () =>
  Object.fromEntries(
    ["goalkeeping", "defence", "midfield", "attack", "overall"].map((p) => [
      p,
      screen.getByTestId(`plan-rating-${p}`).textContent,
    ]),
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

  it("shows the current plan: formation, eleven starters, seven bench slots and neutral tactics", () => {
    mountApp();
    startCareer();
    openEditor();
    expect(select("formation").value).toBe("4-4-2");
    expect(select("formation").options).toHaveLength(6);
    expect(screen.getAllByTestId(/^starter-/)).toHaveLength(11);
    expect(screen.getAllByTestId(/^bench-/)).toHaveLength(7);
    expect(select("tactic-mentality").value).toBe("balanced");
    expect(select("tactic-pressing").value).toBe("medium");
    expect(select("tactic-width").value).toBe("normal");
    expect(select("tactic-tempo").value).toBe("normal");
    expect(select("tactic-mentality").options).toHaveLength(3);
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

  it("offers only players of the slot's position and disables players used elsewhere", () => {
    mountApp();
    startCareer();
    openEditor();
    const gk = select("starter-0");
    const positions = new Set(
      [...gk.options].map((o) =>
        screen.getByTestId(`plan-row-${o.value}`).getAttribute("data-position"),
      ),
    );
    expect(positions).toEqual(new Set(["GK"]));
    const used = select("starter-1");
    const current = select("starter-2").value;
    const option = [...used.options].find((o) => o.value === current);
    expect(option?.disabled).toBe(true);
  });

  it("swaps in another player for a starter and updates the ratings", () => {
    mountApp();
    startCareer();
    openEditor();
    const before = ratings();
    const slot = select("starter-1");
    const free = [...slot.options].find((o) => !o.disabled && o.value !== slot.value);
    if (!free) throw new Error("no alternative");
    choose("starter-1", free.value);
    expect(select("starter-1").value).toBe(free.value);
    expect(ratings()).not.toEqual(before);
    expect(screen.queryByTestId("squad-error")).toBeNull();
  });

  it("auto-picks a valid lineup when the formation changes", () => {
    mountApp();
    startCareer();
    openEditor();
    choose("formation", "3-4-3");
    expect(select("formation").value).toBe("3-4-3");
    const shape = FORMATION_SHAPE["3-4-3"];
    const by = (pos: string) =>
      screen.getAllByTestId(/^starter-/).filter((e) => e.getAttribute("data-position") === pos)
        .length;
    expect([by("GK"), by("DEF"), by("MID"), by("FWD")]).toEqual([
      shape.GK,
      shape.DEF,
      shape.MID,
      shape.FWD,
    ]);
  });

  it("restores the best lineup with auto-pick", () => {
    mountApp();
    startCareer();
    openEditor();
    const original = select("starter-1").value;
    const slot = select("starter-1");
    const free = [...slot.options].find((o) => !o.disabled && o.value !== slot.value);
    if (!free) throw new Error("no alternative");
    choose("starter-1", free.value);
    fireEvent.click(screen.getByTestId("auto-pick"));
    expect(select("starter-1").value).toBe(original);
  });

  it("changes tactics and keeps them", () => {
    mountApp();
    startCareer();
    openEditor();
    choose("tactic-mentality", "attacking");
    choose("tactic-pressing", "high");
    choose("tactic-width", "wide");
    choose("tactic-tempo", "fast");
    expect(select("tactic-mentality").value).toBe("attacking");
    expect(select("tactic-tempo").value).toBe("fast");
    goTo("#/");
    goTo("#/squad");
    openEditor();
    expect(select("tactic-pressing").value).toBe("high");
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

  it("does not offer a bench change that would leave the bench without a keeper", () => {
    mountApp();
    startCareer();
    openEditor();
    const benchKeeperSlot = [0, 1, 2, 3, 4, 5, 6]
      .map((i) => select(`bench-${i}`))
      .find(
        (el) => screen.getByTestId(`plan-row-${el.value}`).getAttribute("data-position") === "GK",
      );
    if (!benchKeeperSlot) throw new Error("no bench keeper");
    const outfield = [...benchKeeperSlot.options].filter(
      (o) => screen.getByTestId(`plan-row-${o.value}`).getAttribute("data-position") !== "GK",
    );
    expect(outfield.every((o) => o.disabled)).toBe(true);
    expect(screen.queryByTestId("squad-error")).toBeNull();
  });

  it("shows the error and changes nothing when setLineup rejects the lineup", () => {
    const league = generateLeague({ seed: SEED });
    if (!league.ok) throw new Error("league");
    const created = createCareer({ seed: SEED, userClubId: league.league.clubs[0]?.id ?? "" });
    if (!created.ok) throw new Error("career");
    // The provider holds no career, so every lineup edit is rejected by the store.
    renderSquad(created.career);
    openEditor();
    expect(screen.queryByTestId("squad-error")).toBeNull();
    const slot = select("starter-1");
    const before = slot.value;
    const free = [...slot.options].find((o) => !o.disabled && o.value !== before);
    if (!free) throw new Error("no alternative");
    choose("starter-1", free.value);
    expect(screen.getByTestId("squad-error").textContent).toMatch(/not in your squad/);
    expect(select("starter-1").value).toBe(before);
  });

  const positionOf = (id: string) =>
    screen.getByTestId(`plan-row-${id}`).getAttribute("data-position");
  const benchValues = () => [0, 1, 2, 3, 4, 5, 6].map((i) => select(`bench-${i}`).value);

  it("swaps a starter with a bench player of the same position in one step", () => {
    mountApp();
    startCareer();
    openEditor();
    const slot = select("starter-1");
    const starter = slot.value;
    const position = positionOf(starter);
    const benchIndex = benchValues().findIndex((id) => positionOf(id) === position);
    if (benchIndex < 0) throw new Error("no bench player of that position");
    const benchPlayer = select(`bench-${benchIndex}`).value;
    const option = [...slot.options].find((o) => o.value === benchPlayer);
    expect(option?.disabled).toBe(false);
    choose("starter-1", benchPlayer);
    expect(select("starter-1").value).toBe(benchPlayer);
    expect(select(`bench-${benchIndex}`).value).toBe(starter);
    expect(screen.queryByTestId("squad-error")).toBeNull();
  });

  it("swaps two bench players when one is chosen in the other's slot", () => {
    mountApp();
    startCareer();
    openEditor();
    const bench = benchValues();
    // The only bench keeper locks outfield players, so use an outfield slot.
    const slotIndex = bench.findIndex((id) => positionOf(id) !== "GK");
    const first = bench[slotIndex] ?? "";
    const slot = select(`bench-${slotIndex}`);
    const target = [...slot.options].find(
      (o) => !o.disabled && o.value !== first && bench.includes(o.value),
    );
    if (!target) throw new Error("no allowed swap");
    const targetIndex = bench.indexOf(target.value);
    choose(`bench-${slotIndex}`, target.value);
    expect(select(`bench-${slotIndex}`).value).toBe(target.value);
    expect(select(`bench-${targetIndex}`).value).toBe(first);
    expect(screen.queryByTestId("squad-error")).toBeNull();
  });

  it("keeps the plan after a reload from the autosave", async () => {
    const store = createMemorySaveStore();
    mountApp(store);
    startCareer();
    openEditor();
    choose("formation", "4-3-3");
    choose("tactic-mentality", "defensive");
    goTo("#/");
    fireEvent.click(screen.getByTestId("quick-sim"));
    await waitFor(async () => {
      const saved = await store.load("autosave");
      const parsed = saved ? parseCareer(saved.game) : null;
      expect(parsed?.ok && parsed.career.season.currentMatchday).toBe(2);
    });
    cleanup();
    goTo("#/");
    mountApp(store);
    fireEvent.click(await screen.findByTestId("continue-career"));
    goTo("#/squad");
    openEditor();
    expect(select("formation").value).toBe("4-3-3");
    expect(select("tactic-mentality").value).toBe("defensive");
  });

  it("shows Swedish labels", () => {
    mountApp(createMemorySaveStore(), "sv");
    startCareer();
    openEditor();
    expect(screen.getByTestId("auto-pick").textContent).toBe("Välj automatiskt");
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

  it("keeps the editors reachable through the temporary link", () => {
    renderSquad(careerFor());
    expect(screen.queryByTestId("lineup-editor")).toBeNull();
    fireEvent.click(screen.getByTestId("edit-lineup"));
    expect(screen.getByTestId("lineup-editor")).toBeTruthy();
    expect(screen.getByTestId("edit-lineup").getAttribute("aria-expanded")).toBe("true");
  });
});
