import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  type Career,
  completeMatchday,
  computeTable,
  createCareer,
  generateLeague,
  getNextFixture,
  simulateFixture,
} from "../game";
import { createMemoryLocaleStore } from "../platform";
import { I18nProvider } from "./i18n-provider";
import { LeagueView } from "./league-screen";

const SEED = 11;

const newCareer = (userIndex = 0): Career => {
  const generated = generateLeague({ seed: SEED });
  if (!generated.ok) throw new Error("league");
  const result = createCareer({
    seed: SEED,
    userClubId: generated.league.clubs[userIndex]?.id ?? "",
  });
  if (!result.ok) throw new Error("career");
  return result.career;
};

const playMatchday = (career: Career): Career => {
  const fixture = getNextFixture(career.season, career.userClubId);
  if (!fixture) throw new Error("no fixture");
  const outcome = completeMatchday(career, simulateFixture(career, fixture));
  if (!outcome.ok) throw new Error(outcome.error);
  return outcome.career;
};

const view = (career: Career) => <LeagueView career={career} />;

const renderView = (career: Career, locale = "en") => {
  const store = createMemoryLocaleStore(locale);
  const ui = (c: Career) => <I18nProvider store={store}>{view(c)}</I18nProvider>;
  const utils = render(ui(career));
  return { ...utils, update: (c: Career) => utils.rerender(ui(c)) };
};

const expectedTable = (career: Career) => {
  const result = computeTable(
    career.league.clubs.map((c) => c.id),
    career.season.results,
  );
  if (!result.ok) throw new Error("table");
  return result.table;
};

describe("league table", () => {
  afterEach(cleanup);

  it("lists all clubs with zeros before any match is played", () => {
    const career = newCareer();
    renderView(career);
    const rows = screen.getAllByTestId(/^table-row-/);
    expect(rows).toHaveLength(14);
    for (const club of career.league.clubs) {
      expect(screen.getByTestId(`table-points-${club.id}`).textContent).toBe("0");
    }
  });

  it("orders rows like computeTable, also in the deterministic zero state", () => {
    const career = playMatchday(playMatchday(newCareer()));
    renderView(career);
    const shown = screen.getAllByTestId(/^table-row-/).map((r) => r.dataset.testid);
    expect(shown).toEqual(expectedTable(career).map((r) => `table-row-${r.clubId}`));
  });

  it("shows the table columns from computeTable", () => {
    const career = playMatchday(newCareer());
    renderView(career);
    const row = expectedTable(career)[0];
    if (!row) throw new Error("row");
    const cells = within(screen.getByTestId(`table-row-${row.clubId}`)).getAllByRole("cell");
    const texts = cells.map((c) => c.textContent);
    expect(texts[0]).toBe(String(row.position));
    expect(texts.slice(2, 8)).toEqual(
      [row.played, row.won, row.drawn, row.lost, row.goalsFor, row.goalsAgainst].map(String),
    );
    expect(texts[9]).toBe(String(row.points));
  });

  it("is a real table with scoped header cells", () => {
    renderView(newCareer());
    const table = screen.getByRole("table");
    const columnHeaders = within(table).getAllByRole("columnheader");
    expect(columnHeaders).toHaveLength(10);
    for (const header of columnHeaders) expect(header.getAttribute("scope")).toBe("col");
  });

  it("gives header abbreviations a full name for screen readers", () => {
    renderView(newCareer());
    expect(screen.getByRole("columnheader", { name: /Points/ }).textContent).toContain("Pts");
  });

  it("uses Swedish abbreviations in Swedish", () => {
    renderView(newCareer(), "sv");
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toContain("MS");
    expect(headers).toContain("P");
  });

  it("highlights the user's club row", () => {
    const career = newCareer(3);
    renderView(career);
    expect(screen.getByTestId(`table-row-${career.userClubId}`).getAttribute("aria-current")).toBe(
      "true",
    );
    const highlighted = screen
      .getAllByTestId(/^table-row-/)
      .filter((r) => r.getAttribute("aria-current") === "true");
    expect(highlighted).toHaveLength(1);
  });

  it("links each club to its club page", () => {
    const career = newCareer();
    renderView(career);
    const club = career.league.clubs[1];
    if (!club) throw new Error("club");
    const link = within(screen.getByTestId(`table-row-${club.id}`)).getByRole("link");
    expect(link.getAttribute("href")).toBe(`#/club/${encodeURIComponent(club.id)}`);
    expect(link.textContent).toContain(club.name);
  });

  it("formats goal difference with a sign", () => {
    const career = playMatchday(playMatchday(playMatchday(newCareer())));
    renderView(career);
    const table = expectedTable(career);
    const rows = screen.getAllByTestId(/^table-row-/);
    table.forEach((row, i) => {
      const cell = within(rows[i] as HTMLElement).getAllByRole("cell")[8];
      const expected =
        row.goalDifference > 0
          ? `+${row.goalDifference}`
          : row.goalDifference < 0
            ? `−${Math.abs(row.goalDifference)}`
            : "0";
      expect(cell?.textContent).toBe(expected);
    });
  });

  it("reflects a completed matchday without a reload", () => {
    const career = newCareer();
    const { update } = renderView(career);
    const next = playMatchday(career);
    update(next);
    const total = next.league.clubs
      .map((c) => Number(screen.getByTestId(`table-points-${c.id}`).textContent))
      .reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThan(0);
    expect(screen.getAllByTestId(/^table-row-/)).toHaveLength(14);
  });
});

describe("fixtures tab", () => {
  afterEach(cleanup);

  const openFixtures = () => fireEvent.click(screen.getByTestId("tab-fixtures"));

  it("defaults to the current matchday", () => {
    const career = playMatchday(playMatchday(newCareer()));
    renderView(career);
    openFixtures();
    expect((screen.getByTestId("matchday-select") as HTMLSelectElement).value).toBe("3");
    expect(screen.getAllByTestId(/^fixture-md/)).toHaveLength(7);
  });

  it("shows a dash for unplayed fixtures and the score for played ones", () => {
    const career = playMatchday(newCareer());
    renderView(career);
    openFixtures();
    const played = career.season.results[0];
    if (!played) throw new Error("result");
    const playedFixture = career.season.fixtures.find((f) => f.id === played.fixtureId);
    fireEvent.change(screen.getByTestId("matchday-select"), {
      target: { value: String(playedFixture?.matchday) },
    });
    expect(screen.getByTestId(`fixture-score-${played.fixtureId}`).textContent).toBe(
      `${played.homeGoals}–${played.awayGoals}`,
    );
    fireEvent.change(screen.getByTestId("matchday-select"), { target: { value: "2" } });
    for (const el of screen.getAllByTestId(/^fixture-score-/)) expect(el.textContent).toBe("–");
  });

  it("navigates with previous and next and stops at the ends", () => {
    renderView(newCareer());
    openFixtures();
    const select = screen.getByTestId("matchday-select") as HTMLSelectElement;
    expect(screen.getByTestId("matchday-previous").hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByTestId("matchday-next"));
    expect(select.value).toBe("2");
    fireEvent.change(select, { target: { value: "26" } });
    expect(screen.getByTestId("matchday-next").hasAttribute("disabled")).toBe(true);
    fireEvent.click(screen.getByTestId("matchday-previous"));
    expect(select.value).toBe("25");
    expect(select.options).toHaveLength(26);
  });

  it("highlights the user's fixture", () => {
    const career = newCareer(2);
    renderView(career);
    openFixtures();
    const highlighted = screen
      .getAllByTestId(/^fixture-md/)
      .filter((f) => f.getAttribute("aria-current") === "true");
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0]?.textContent).toContain(
      career.league.clubs.find((c) => c.id === career.userClubId)?.name,
    );
  });

  it("shows the last matchday once the season is over", () => {
    let career = newCareer();
    for (let i = 0; i < 26; i++) career = playMatchday(career);
    renderView(career);
    openFixtures();
    expect((screen.getByTestId("matchday-select") as HTMLSelectElement).value).toBe("26");
  });

  it("renders in Swedish", () => {
    renderView(newCareer(), "sv");
    expect(screen.getByTestId("tab-table").textContent).toBe("Tabell");
    openFixtures();
    expect(screen.getByTestId("matchday-previous").textContent).toContain("Föregående");
  });
});
