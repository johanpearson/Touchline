import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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
  createMemoryFileTransfer,
  createMemoryLocaleStore,
  createMemorySaveStore,
} from "../platform";
import type { SaveStore } from "../shared";
import { App } from "./app";
import { I18nProvider } from "./i18n-provider";
import { matchSetupFor } from "./match-setup";
import { SquadScreen } from "./squad-screen";
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
  fireEvent.click(screen.getByTestId(`club-option-${club.id}`));
  fireEvent.click(screen.getByTestId("start-career"));
  goTo("#/squad");
  return club;
};

const select = (testId: string) => screen.getByTestId(testId) as HTMLSelectElement;
const choose = (testId: string, value: string) =>
  fireEvent.change(select(testId), { target: { value } });
const ratings = () =>
  Object.fromEntries(
    [
      "buildUp",
      "progression",
      "chanceCreation",
      "finishing",
      "pressing",
      "defending",
      "goalkeeping",
    ].map((p) => [p, screen.getByTestId(`plan-rating-${p}`).textContent]),
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
    choose("tactic-mentality", "attacking");
    choose("tactic-pressing", "high");
    choose("tactic-width", "wide");
    choose("tactic-tempo", "fast");
    expect(select("tactic-mentality").value).toBe("attacking");
    expect(select("tactic-tempo").value).toBe("fast");
    goTo("#/");
    goTo("#/squad");
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
    render(
      <I18nProvider store={createMemoryLocaleStore("en")}>
        <CareerProvider
          saveStore={createMemorySaveStore()}
          now={() => "2026-01-01T12:00:00.000Z"}
          fileTransfer={createMemoryFileTransfer()}
        >
          <SquadScreen career={career} />
        </CareerProvider>
      </I18nProvider>,
    );
    expect(screen.getAllByTestId(/^plan-low-fitness-/)).toHaveLength(1);
    expect(screen.getByTestId(`plan-low-fitness-${tired}`)).toBeTruthy();
    expect(screen.getByTestId(`plan-fitness-${tired}`).textContent).toContain("42");
  });

  it("does not offer a bench change that would leave the bench without a keeper", () => {
    mountApp();
    startCareer();
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
    render(
      <I18nProvider store={createMemoryLocaleStore("en")}>
        <CareerProvider
          saveStore={createMemorySaveStore()}
          now={() => "2026-01-01T12:00:00.000Z"}
          fileTransfer={createMemoryFileTransfer()}
        >
          <SquadScreen career={created.career} />
        </CareerProvider>
      </I18nProvider>,
    );
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
    expect(select("formation").value).toBe("4-3-3");
    expect(select("tactic-mentality").value).toBe("defensive");
  });

  it("shows Swedish labels", () => {
    mountApp(createMemorySaveStore(), "sv");
    startCareer();
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
      fixture.homeClubId === career.userClubId ? setup.input.homeTactics : setup.input.awayTactics;
    expect(tactics).toEqual({
      mentality: "attacking",
      pressing: "high",
      width: "wide",
      tempo: "fast",
    });
  });
});
