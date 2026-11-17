import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type Career,
  createCareer,
  FORMATION_SHAPE,
  generateLeague,
  parseCareer,
} from "../../game";
import {
  createMemoryDensityStore,
  createMemoryFileTransfer,
  createMemoryLocaleStore,
  createMemorySaveStore,
} from "../../platform";
import type { SaveStore } from "../../shared";
import { App } from "../app";
import { installBrowserStubs } from "../components/overlay-test-setup";
import { I18nProvider } from "../i18n-provider";
import { DensityProvider } from "../theme/density-provider";
import { CareerProvider } from "../use-career";
import { TacticsScreen } from "./tactics-screen";

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
  goTo("#/tactics");
};

const careerOf = (): Career => {
  const league = generateLeague({ seed: SEED });
  if (!league.ok) throw new Error("league");
  const created = createCareer({ seed: SEED, userClubId: league.league.clubs[0]?.id ?? "" });
  if (!created.ok) throw new Error("career");
  return created.career;
};

const renderScreen = (career: Career) =>
  render(
    <I18nProvider store={createMemoryLocaleStore("en")}>
      <DensityProvider store={createMemoryDensityStore(null)}>
        <CareerProvider
          saveStore={createMemorySaveStore()}
          now={() => "2026-01-01T12:00:00.000Z"}
          fileTransfer={createMemoryFileTransfer()}
        >
          <TacticsScreen career={career} />
        </CareerProvider>
      </DensityProvider>
    </I18nProvider>,
  );

const RATING_LINES = ["goalkeeping", "defence", "midfield", "attack", "overall"];
const ratings = () =>
  RATING_LINES.map((line) => screen.getByTestId(`plan-rating-${line}`).textContent);
const radio = (testId: string, name: string) =>
  within(screen.getByTestId(testId)).getByRole("radio", { name });
const select = (testId: string) => screen.getByTestId(testId) as HTMLSelectElement;
const showList = () => fireEvent.click(screen.getByRole("radio", { name: "List" }));
const pitchSlots = () => screen.getAllByTestId(/^pitch-slot-/);
const options = () => screen.getAllByTestId(/^picker-option-/) as HTMLButtonElement[];
const positionOf = (button: HTMLElement) => button.getAttribute("data-position");
/** The player's name in a pitch or bench slot's accessible name. */
const nameInLabel = (testId: string): string => {
  const label = screen.getByTestId(testId).getAttribute("aria-label") ?? "";
  return /^(?:Bench slot \d+: |[^,]+, )([^,]+),/.exec(label)?.[1] ?? "";
};
const sameLineBenchIndex = (position: string | null): number => {
  const index = screen.getAllByTestId(/^bench-slot-/).findIndex((b) => positionOf(b) === position);
  if (index < 0) throw new Error("no bench player of that position");
  return index;
};

beforeEach(() => {
  installBrowserStubs();
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  goTo("#/");
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("tactics screen", () => {
  it("shows the plan: formation, eleven slots on the pitch, seven bench slots and neutral tactics", () => {
    mountApp();
    startCareer();
    expect(screen.getByTestId("formation").dataset.value).toBe("4-4-2");
    expect(within(screen.getByTestId("formation")).getAllByRole("radio")).toHaveLength(6);
    expect(pitchSlots()).toHaveLength(11);
    expect(screen.getAllByTestId(/^bench-slot-/)).toHaveLength(7);
    expect(screen.getByTestId("tactic-mentality").dataset.value).toBe("balanced");
    expect(screen.getByTestId("tactic-pressing").dataset.value).toBe("medium");
    expect(screen.getByTestId("tactic-width").dataset.value).toBe("normal");
    expect(screen.getByTestId("tactic-tempo").dataset.value).toBe("normal");
    expect(within(screen.getByTestId("tactic-mentality")).getAllByRole("radio")).toHaveLength(3);
  });

  it("names every pitch slot with its role, the player and the fitness", () => {
    mountApp();
    startCareer();
    const keeper = screen.getByTestId("pitch-slot-0");
    expect(keeper.getAttribute("aria-label")).toMatch(/^Goalkeeper, .+, fitness 100$/);
    expect(screen.getByTestId("pitch-slot-1").getAttribute("aria-label")).toMatch(/^Left back, /);
    expect(keeper.textContent).toContain("100");
  });

  it("explains each tactic with a description and its risk", () => {
    mountApp();
    startCareer();
    const pressing = screen.getByTestId("tactic-pressing");
    expect(pressing.textContent).toContain("How high up and how hard");
    expect(pressing.textContent).toContain("Risk: High pressing wins the ball high up");
  });

  it("opens a picker with only players of the slot's position and disables other starters", () => {
    mountApp();
    startCareer();
    fireEvent.click(screen.getByTestId("pitch-slot-1"));
    const dialog = screen.getByRole("dialog");
    expect(dialog.textContent).toContain("Choose Left back");
    const list = options();
    expect(list.length).toBeGreaterThan(4);
    for (const option of list) {
      expect(option.textContent).toMatch(/DEF/);
    }
    const disabled = list.filter((o) => o.disabled);
    expect(disabled).toHaveLength(3);
    expect(within(dialog).getAllByText(/Fitness \d+/).length).toBe(list.length);
  });

  it("swaps a starter with a bench player of the same position in one step", async () => {
    mountApp();
    startCareer();
    const slot = screen.getByTestId("pitch-slot-1");
    const benchIndex = sameLineBenchIndex(positionOf(slot));
    const benchName = nameInLabel(`bench-slot-${benchIndex}`);
    const starterName = nameInLabel("pitch-slot-1");
    const before = ratings();
    fireEvent.click(slot);
    const candidate = options().find((o) => o.textContent?.includes(benchName));
    if (!candidate) throw new Error("no candidate");
    fireEvent.click(candidate);
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(nameInLabel("pitch-slot-1")).toBe(benchName);
    expect(nameInLabel(`bench-slot-${benchIndex}`)).toBe(starterName);
    expect(ratings()).not.toEqual(before);
    expect(screen.queryByTestId("squad-error")).toBeNull();
  });

  it("keeps the bench's only goalkeeper: outfield players cannot take its slot", () => {
    mountApp();
    startCareer();
    const benchKeeper = screen
      .getAllByTestId(/^bench-slot-/)
      .findIndex((b) => positionOf(b) === "GK");
    fireEvent.click(screen.getByTestId(`bench-slot-${benchKeeper}`));
    const outfield = options().filter((o) => !/GK/.test(o.textContent ?? ""));
    expect(outfield.length).toBeGreaterThan(0);
    expect(outfield.every((o) => o.disabled)).toBe(true);
    expect(
      within(screen.getByRole("dialog")).getAllByText("The bench needs a goalkeeper").length,
    ).toBeGreaterThan(0);
  });

  it("auto-picks a valid lineup when the formation changes", () => {
    mountApp();
    startCareer();
    fireEvent.click(radio("formation", "3-4-3"));
    expect(screen.getByTestId("formation").dataset.value).toBe("3-4-3");
    const shape = FORMATION_SHAPE["3-4-3"];
    const by = (pos: string) => pitchSlots().filter((e) => positionOf(e) === pos).length;
    expect([by("GK"), by("DEF"), by("MID"), by("FWD")]).toEqual([
      shape.GK,
      shape.DEF,
      shape.MID,
      shape.FWD,
    ]);
  });

  it("updates the team ratings when the formation changes", () => {
    mountApp();
    startCareer();
    const before = ratings();
    fireEvent.click(radio("formation", "4-3-3"));
    expect(ratings()).not.toEqual(before);
  });

  it("restores the best lineup with auto-pick", () => {
    mountApp();
    startCareer();
    const original = screen.getByTestId("pitch-slot-1").getAttribute("aria-label");
    fireEvent.click(screen.getByTestId("pitch-slot-1"));
    const other = options().find((o) => !o.disabled && o.getAttribute("aria-current") !== "true");
    if (!other) throw new Error("no alternative");
    fireEvent.click(other);
    expect(screen.getByTestId("pitch-slot-1").getAttribute("aria-label")).not.toBe(original);
    fireEvent.click(screen.getByTestId("auto-pick"));
    expect(screen.getByTestId("pitch-slot-1").getAttribute("aria-label")).toBe(original);
  });

  it("changes tactics and keeps them", () => {
    mountApp();
    startCareer();
    fireEvent.click(radio("tactic-mentality", "Attacking"));
    fireEvent.click(radio("tactic-pressing", "High"));
    fireEvent.click(radio("tactic-width", "Wide"));
    fireEvent.click(radio("tactic-tempo", "Fast"));
    expect(screen.getByTestId("tactic-mentality").dataset.value).toBe("attacking");
    expect(radio("tactic-tempo", "Fast").getAttribute("aria-checked")).toBe("true");
    goTo("#/");
    goTo("#/tactics");
    expect(screen.getByTestId("tactic-pressing").dataset.value).toBe("high");
  });

  it("shows the error and changes nothing when setLineup rejects the lineup", async () => {
    // The provider holds no career, so every lineup edit is rejected by the store.
    renderScreen(careerOf());
    expect(screen.queryByTestId("squad-error")).toBeNull();
    const before = screen.getByTestId("pitch-slot-1").getAttribute("aria-label");
    fireEvent.click(screen.getByTestId("pitch-slot-1"));
    const free = options().find((o) => !o.disabled && o.getAttribute("aria-current") !== "true");
    if (!free) throw new Error("no alternative");
    fireEvent.click(free);
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toMatch(/not in your squad/);
    expect(screen.getByTestId("pitch-slot-1").getAttribute("aria-label")).toBe(before);
  });

  it("marks low fitness with a warning and keeps the number visible on the pitch", () => {
    const career = careerOf();
    const tired = career.squadPlan.starters[1] ?? "";
    renderScreen({
      ...career,
      condition: { ...career.condition, [tired]: { fitness: 42, form: 5 } },
    });
    const slot = pitchSlots().find((s) => s.getAttribute("aria-label")?.includes("fitness 42"));
    expect(slot?.textContent).toContain("42");
    expect(slot?.querySelector("svg.lucide-triangle-alert")).not.toBeNull();
  });

  it("keeps the plan after a reload from the autosave", async () => {
    const store = createMemorySaveStore();
    mountApp(store);
    startCareer();
    fireEvent.click(radio("formation", "4-3-3"));
    fireEvent.click(radio("tactic-mentality", "Defensive"));
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
    goTo("#/tactics");
    expect(screen.getByTestId("formation").dataset.value).toBe("4-3-3");
    expect(screen.getByTestId("tactic-mentality").dataset.value).toBe("defensive");
  });

  it("shows Swedish labels and descriptions", () => {
    mountApp(createMemorySaveStore(), "sv");
    startCareer();
    expect(screen.getByTestId("auto-pick").textContent).toBe("Välj automatiskt");
    expect(screen.getByTestId("pitch-slot-0").getAttribute("aria-label")).toMatch(
      /^Målvakt, .+, kondition 100$/,
    );
    expect(screen.getByTestId("tactic-pressing").textContent).toContain("Risk: Högt press");
  });
});

describe("tactics screen list view", () => {
  it("offers one select per starter and bench slot without the pitch", () => {
    mountApp();
    startCareer();
    showList();
    expect(screen.queryByTestId("lineup-pitch")).toBeNull();
    expect(screen.getAllByTestId(/^starter-/)).toHaveLength(11);
    expect(screen.getAllByTestId(/^bench-\d/)).toHaveLength(7);
  });

  it("is the default view on a phone", () => {
    installBrowserStubs({ phone: true });
    mountApp();
    startCareer();
    expect(screen.queryByTestId("lineup-pitch")).toBeNull();
    expect(screen.getByTestId("slot-list")).toBeTruthy();
  });

  it("offers only players of the slot's position and disables players used elsewhere", () => {
    mountApp();
    startCareer();
    showList();
    const slot = select("starter-1");
    expect(slot.getAttribute("data-position")).toBe("DEF");
    const taken = select("starter-2").value;
    expect([...slot.options].find((o) => o.value === taken)?.disabled).toBe(true);
    expect([...slot.options].every((o) => /\(DEF\)$/.test(o.textContent ?? ""))).toBe(true);
  });

  it("swaps in another player for a starter and updates the ratings", () => {
    mountApp();
    startCareer();
    showList();
    const before = ratings();
    const slot = select("starter-1");
    const free = [...slot.options].find((o) => !o.disabled && o.value !== slot.value);
    if (!free) throw new Error("no alternative");
    fireEvent.change(slot, { target: { value: free.value } });
    expect(select("starter-1").value).toBe(free.value);
    expect(ratings()).not.toEqual(before);
    expect(screen.queryByTestId("squad-error")).toBeNull();
  });

  it("swaps two bench players when one is chosen in the other's slot", () => {
    mountApp();
    startCareer();
    showList();
    const bench = [0, 1, 2, 3, 4, 5, 6].map((i) => select(`bench-${i}`).value);
    const keeper = (id: string) => screen.getByText(/(?:)/) && id;
    void keeper;
    const slotIndex = bench.findIndex(
      (_, i) => !/\(GK\)$/.test(select(`bench-${i}`).selectedOptions[0]?.textContent ?? ""),
    );
    const first = bench[slotIndex] ?? "";
    const slot = select(`bench-${slotIndex}`);
    const target = [...slot.options].find(
      (o) => !o.disabled && o.value !== first && bench.includes(o.value),
    );
    if (!target) throw new Error("no allowed swap");
    const targetIndex = bench.indexOf(target.value);
    fireEvent.change(slot, { target: { value: target.value } });
    expect(select(`bench-${slotIndex}`).value).toBe(target.value);
    expect(select(`bench-${targetIndex}`).value).toBe(first);
  });
});
