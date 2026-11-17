import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { type Career, computeForm, computeTable } from "../game";
import { createMemoryDensityStore, createMemoryLocaleStore } from "../platform";
import { I18nProvider } from "./i18n-provider";
import { LeagueView } from "./league-screen";
import { careerAfter } from "./test-career";
import { DensityProvider } from "./theme/density-provider";

beforeAll(() => {
  // jsdom lacks the pointer and scroll APIs Radix Select uses.
  Element.prototype.hasPointerCapture = () => false;
  Element.prototype.setPointerCapture = () => {};
  Element.prototype.releasePointerCapture = () => {};
  Element.prototype.scrollIntoView = () => {};
});

const mockMatchMedia = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
};

beforeEach(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
  mockMatchMedia(false);
  window.sessionStorage.clear();
});

afterEach(() => {
  cleanup();
  delete (window as { matchMedia?: unknown }).matchMedia;
});

const view = (career: Career, locale: string) => (
  <I18nProvider store={createMemoryLocaleStore(locale)}>
    <DensityProvider store={createMemoryDensityStore(null)}>
      <LeagueView career={career} />
    </DensityProvider>
  </I18nProvider>
);

const renderView = (career: Career, locale = "en") => {
  const utils = render(view(career, locale));
  return { ...utils, update: (c: Career) => utils.rerender(view(c, locale)) };
};

const expectedTable = (career: Career) => {
  const result = computeTable(
    career.league.clubs.map((c) => c.id),
    career.season.results,
  );
  if (!result.ok) throw new Error("table");
  return result.table;
};

const text = (testId: string) => screen.getByTestId(testId).textContent;

describe("league table", () => {
  it("lists all 14 clubs with zeros before any match is played", () => {
    const career = careerAfter(0);
    renderView(career);
    expect(screen.getAllByTestId(/^table-row-/)).toHaveLength(14);
    for (const club of career.league.clubs) expect(text(`table-points-${club.id}`)).toBe("0");
  });

  it("orders rows like computeTable, tie-breakers included", () => {
    const career = careerAfter(3);
    renderView(career);
    const shown = screen.getAllByTestId(/^table-row-/).map((r) => r.dataset.testid);
    expect(shown).toEqual(expectedTable(career).map((r) => `table-row-${r.clubId}`));
  });

  it("shows the position, points and every count from computeTable", () => {
    const career = careerAfter(2);
    renderView(career);
    for (const row of expectedTable(career)) {
      expect(text(`table-position-${row.clubId}`)).toBe(String(row.position));
      expect(text(`table-points-${row.clubId}`)).toBe(String(row.points));
      const cells = within(screen.getByTestId(`table-row-${row.clubId}`))
        .getAllByRole("cell")
        .map((c) => c.textContent);
      expect(cells.slice(2, 8)).toEqual(
        [row.played, row.won, row.drawn, row.lost, row.goalsFor, row.goalsAgainst].map(String),
      );
    }
  });

  it("is a real table with a name and scoped header cells", () => {
    renderView(careerAfter(0));
    const table = screen.getByRole("table", { name: "League table" });
    const headers = within(table).getAllByRole("columnheader");
    expect(headers).toHaveLength(11);
    for (const header of headers) expect(header.getAttribute("scope")).toBe("col");
  });

  it("gives header abbreviations a full name for screen readers", () => {
    renderView(careerAfter(0));
    expect(screen.getByRole("columnheader", { name: "Points" }).textContent).toBe("Pts");
    expect(screen.getByRole("columnheader", { name: "Goal difference" }).textContent).toBe("GD");
  });

  it("uses Swedish abbreviations in Swedish", () => {
    renderView(careerAfter(0), "sv");
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toContain("MS");
    expect(headers).toContain("Klubb");
  });

  it("does not offer sorting: the order is the standings", () => {
    renderView(careerAfter(2));
    const table = screen.getByRole("table");
    expect(within(table).queryAllByRole("button")).toHaveLength(0);
    for (const header of within(table).getAllByRole("columnheader")) {
      expect(header.getAttribute("aria-sort")).toBeNull();
    }
  });

  it("highlights only the user's row, with a text cue and the club colour edge", () => {
    const career = careerAfter(2, 11, 3);
    renderView(career);
    const rows = screen.getAllByTestId(/^table-row-/);
    const marked = rows.filter((r) => r.getAttribute("data-highlighted") === "true");
    expect(marked).toHaveLength(1);
    const mine = screen.getByTestId(`table-row-${career.userClubId}`);
    expect(marked[0]).toBe(mine);
    expect(mine.textContent).toContain("Your club");
    const club = career.league.clubs.find((c) => c.id === career.userClubId);
    expect((mine as HTMLElement).style.getPropertyValue("--row-accent")).toBe(
      club?.colours.primary,
    );
  });

  it("links each club to its club page", () => {
    const career = careerAfter(0);
    renderView(career);
    const club = career.league.clubs[1];
    if (!club) throw new Error("club");
    const link = within(screen.getByTestId(`table-row-${club.id}`)).getByRole("link");
    expect(link.getAttribute("href")).toBe(`#/club/${encodeURIComponent(club.id)}`);
    expect(link.textContent).toContain(club.name);
  });

  it("formats goal difference with a sign", () => {
    const career = careerAfter(3);
    renderView(career);
    for (const row of expectedTable(career)) {
      const cell = within(screen.getByTestId(`table-row-${row.clubId}`)).getAllByRole("cell")[8];
      const expected =
        row.goalDifference > 0
          ? `+${row.goalDifference}`
          : row.goalDifference < 0
            ? `−${Math.abs(row.goalDifference)}`
            : "0";
      expect(cell?.textContent).toBe(expected);
    }
  });

  it("reflects a completed matchday without a reload", () => {
    const { update } = renderView(careerAfter(0));
    const next = careerAfter(1);
    update(next);
    const total = next.league.clubs
      .map((c) => Number(text(`table-points-${c.id}`)))
      .reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(0);
  });
});

describe("form column", () => {
  it("shows the last results as letters that match computeForm, in each language", () => {
    const career = careerAfter(6);
    const club = career.league.clubs[0];
    if (!club) throw new Error("club");
    const form = computeForm(club.id, career.season.results);
    renderView(career);
    const chips = within(screen.getByTestId(`table-row-${club.id}`)).getAllByTestId("form-chip");
    expect(chips.map((c) => c.getAttribute("data-outcome"))).toEqual(form);
    expect(chips.map((c) => c.querySelector("[aria-hidden]")?.textContent)).toEqual(form);
    expect(chips).toHaveLength(5);
  });

  it("gives every chip a letter and a word, so colour is never the only cue", () => {
    renderView(careerAfter(4));
    for (const chip of screen.getAllByTestId("form-chip")) {
      expect(chip.textContent).toMatch(/^(W|D|L)(Win|Draw|Loss)$/);
    }
  });

  it("uses Swedish letters in Swedish", () => {
    renderView(careerAfter(4), "sv");
    for (const chip of screen.getAllByTestId("form-chip")) {
      expect(chip.querySelector("[aria-hidden]")?.textContent).toMatch(/^(V|O|F)$/);
    }
  });

  it("shows a dash before the first match", () => {
    renderView(careerAfter(0));
    expect(screen.getAllByTestId("form-empty")).toHaveLength(14);
    expect(screen.queryAllByTestId("form-chip")).toHaveLength(0);
  });
});

describe("league table on a phone", () => {
  beforeEach(() => mockMatchMedia(true));

  it("becomes one card per club, with no sort control and every value labelled", () => {
    const career = careerAfter(3);
    renderView(career);
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    const rows = screen.getAllByTestId(/^table-row-/);
    expect(rows).toHaveLength(14);
    const first = expectedTable(career)[0];
    if (!first) throw new Error("row");
    const card = screen.getByTestId(`table-row-${first.clubId}`);
    expect(card.textContent).toContain("Points");
    expect(card.textContent).toContain("Goal difference");
    expect(text(`table-points-${first.clubId}`)).toBe(String(first.points));
  });
});

describe("tabs", () => {
  it("remembers the selected tab for the session", () => {
    const career = careerAfter(0);
    const first = renderView(career);
    fireEvent.mouseDown(screen.getByTestId("tab-fixtures"));
    fireEvent.click(screen.getByTestId("tab-fixtures"));
    expect(screen.getByTestId("fixtures-view")).toBeTruthy();
    first.unmount();
    renderView(career);
    expect(screen.getByTestId("fixtures-view")).toBeTruthy();
  });

  it("starts on the table", () => {
    renderView(careerAfter(0));
    expect(screen.getByTestId("league-table")).toBeTruthy();
  });
});

describe("fixtures tab", () => {
  const openFixtures = () => {
    fireEvent.mouseDown(screen.getByTestId("tab-fixtures"));
    fireEvent.click(screen.getByTestId("tab-fixtures"));
  };
  const picker = () => screen.getByRole("combobox", { name: "Matchday" });
  const choose = (name: string) => {
    picker().focus();
    fireEvent.keyDown(picker(), { key: "ArrowDown" });
    fireEvent.click(screen.getByRole("option", { name }));
  };

  it("selects the current round by default", () => {
    renderView(careerAfter(2));
    openFixtures();
    expect(picker().textContent).toContain("Matchday 3");
    expect(screen.getByRole("heading", { name: "Round 3 of 26" })).toBeTruthy();
    expect(screen.getAllByTestId(/^fixture-md/)).toHaveLength(7);
  });

  it("shows the score of played fixtures and a dash for the others", () => {
    const career = careerAfter(1);
    renderView(career);
    openFixtures();
    const played = career.season.results[0];
    if (!played) throw new Error("result");
    const fixture = career.season.fixtures.find((f) => f.id === played.fixtureId);
    fireEvent.click(screen.getByTestId("matchday-previous"));
    expect(picker().textContent).toContain(`Matchday ${fixture?.matchday}`);
    expect(text(`fixture-score-${played.fixtureId}`)).toBe(
      `${played.homeGoals}–${played.awayGoals}`,
    );
    fireEvent.click(screen.getByTestId("matchday-next"));
    for (const el of screen.getAllByTestId(/^fixture-score-/)) expect(el.textContent).toBe("–");
  });

  it("steps with previous and next and stops at both ends", () => {
    renderView(careerAfter(0));
    openFixtures();
    expect(screen.getByTestId("matchday-previous").hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByTestId("matchday-next"));
    expect(picker().textContent).toContain("Matchday 2");
    choose("Matchday 26");
    expect(screen.getByTestId("matchday-next").hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByTestId("matchday-previous"));
    expect(picker().textContent).toContain("Matchday 25");
  });

  it("jumps to a round chosen in the select, with the keyboard", () => {
    renderView(careerAfter(0));
    openFixtures();
    picker().focus();
    fireEvent.keyDown(picker(), { key: "ArrowDown" });
    expect(screen.getAllByRole("option")).toHaveLength(26);
    fireEvent.click(screen.getByRole("option", { name: "Matchday 7" }));
    expect(screen.getByRole("heading", { name: "Round 7 of 26" })).toBeTruthy();
  });

  it("highlights the user's fixture with a text cue", () => {
    const career = careerAfter(0, 11, 2);
    renderView(career);
    openFixtures();
    const marked = screen
      .getAllByTestId(/^fixture-md/)
      .filter((f) => f.getAttribute("data-highlighted") === "true");
    expect(marked).toHaveLength(1);
    expect(marked[0]?.textContent).toContain(
      career.league.clubs.find((c) => c.id === career.userClubId)?.name,
    );
    expect(marked[0]?.textContent).toContain("Your match");
  });

  it("shows the last round once the season is over", () => {
    renderView(careerAfter(26));
    openFixtures();
    expect(picker().textContent).toContain("Matchday 26");
  });

  it("renders in Swedish", () => {
    renderView(careerAfter(0), "sv");
    expect(text("tab-table")).toBe("Tabell");
    openFixtures();
    expect(screen.getByRole("button", { name: "Föregående omgång" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Omgång 1 av 26" })).toBeTruthy();
  });
});

describe("scorers", () => {
  const openRound = (career: Career) => {
    renderView(career);
    fireEvent.mouseDown(screen.getByTestId("tab-fixtures"));
    fireEvent.click(screen.getByTestId("tab-fixtures"));
    fireEvent.click(screen.getByTestId("matchday-previous"));
  };

  const playedWith = (career: Career, wantGoals: boolean) => {
    const result = career.season.results.find((r) => r.homeGoals + r.awayGoals > 0 === wantGoals);
    if (!result) throw new Error("result");
    return result;
  };

  it("expands to the scorers of a played match and collapses again", () => {
    const career = careerAfter(1);
    const result = playedWith(career, true);
    openRound(career);
    const toggle = screen.getByTestId(`fixture-toggle-${result.fixtureId}`);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(screen.queryByTestId(`fixture-scorers-${result.fixtureId}`)).toBeNull();
    fireEvent.click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    const names = career.league.players
      .filter((p) => result.scorers?.includes(p.id))
      .map((p) => p.name);
    const shown = screen.getByTestId(`fixture-scorers-${result.fixtureId}`).textContent ?? "";
    for (const name of names) expect(shown).toContain(name);
    fireEvent.click(toggle);
    expect(screen.queryByTestId(`fixture-scorers-${result.fixtureId}`)).toBeNull();
  });

  it("says so when a played match has no recorded scorers", () => {
    const career = careerAfter(1);
    const result = playedWith(career, true);
    const stripped: Career = {
      ...career,
      season: {
        ...career.season,
        results: career.season.results.map((r) =>
          r.fixtureId === result.fixtureId ? { ...r, scorers: undefined } : r,
        ),
      },
    };
    openRound(stripped);
    fireEvent.click(screen.getByTestId(`fixture-toggle-${result.fixtureId}`));
    expect(text(`fixture-scorers-${result.fixtureId}`)).toBe("No scorers recorded");
  });

  it("offers no toggle for unplayed matches", () => {
    renderView(careerAfter(1));
    fireEvent.mouseDown(screen.getByTestId("tab-fixtures"));
    act(() => {
      fireEvent.click(screen.getByTestId("tab-fixtures"));
    });
    expect(screen.queryAllByTestId(/^fixture-toggle-/)).toHaveLength(0);
  });
});
