import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import {
  type Career,
  computeForm,
  computeTable,
  createCareer,
  generateLeague,
  pickBestEleven,
} from "../game";
import { playMatchdays } from "../game/season-test-helpers";
import { startNextSeason } from "../game/start-next-season";
import { createMemoryLocaleStore } from "../platform";
import { ClubView } from "./club-screen";
import { I18nProvider } from "./i18n-provider";

const SEED = 11;

const newCareer = (): Career => {
  const generated = generateLeague({ seed: SEED });
  if (!generated.ok) throw new Error("league");
  const result = createCareer({ seed: SEED, userClubId: generated.league.clubs[0]?.id ?? "" });
  if (!result.ok) throw new Error("career");
  return result.career;
};

const renderClub = (career: Career, clubId: string, locale = "en") =>
  render(
    <I18nProvider store={createMemoryLocaleStore(locale)}>
      <ClubView career={career} clubId={clubId} />
    </I18nProvider>,
  );

const otherClubId = (career: Career) => career.league.clubs[1]?.id ?? "";

describe("ClubView", () => {
  afterEach(cleanup);

  it("shows the club name and the your-club marker for the user's club only", () => {
    const career = newCareer();
    renderClub(career, career.userClubId);
    expect(screen.getByTestId("club-name").textContent).toBe(career.league.clubs[0]?.name);
    expect(screen.getByTestId("your-club")).toBeTruthy();
    cleanup();
    renderClub(career, otherClubId(career));
    expect(screen.queryByTestId("your-club")).toBeNull();
  });

  it("shows the not-found view for an unknown club", () => {
    renderClub(newCareer(), "nope");
    expect(screen.getByTestId("not-found")).toBeTruthy();
    expect(screen.queryByTestId("club-screen")).toBeNull();
  });

  it("shows league position and points", () => {
    const career = playMatchdays(newCareer(), 3);
    const table = computeTable(
      career.league.clubs.map((c) => c.id),
      career.season.results,
    );
    if (!table.ok) throw new Error("table");
    const row = table.table.find((r) => r.clubId === career.userClubId);
    renderClub(career, career.userClubId);
    expect(screen.getByTestId("club-position").textContent).toContain(String(row?.position));
    expect(screen.getByTestId("club-points").textContent).toContain(String(row?.points));
  });

  it("shows the last five results as W/D/L chips with a text label", () => {
    const career = playMatchdays(newCareer(), 7);
    const form = computeForm(career.userClubId, career.season.results);
    renderClub(career, career.userClubId);
    const chips = within(screen.getByTestId("club-form")).getAllByTestId("form-chip");
    expect(chips.map((c) => c.textContent)).toEqual(form);
    expect(chips).toHaveLength(5);
  });

  it("shows an empty form before any match is played", () => {
    const career = newCareer();
    renderClub(career, career.userClubId);
    expect(screen.queryAllByTestId("form-chip")).toHaveLength(0);
    expect(screen.getByTestId("club-form-empty")).toBeTruthy();
  });

  it("lists the next three fixtures with opponent and home or away", () => {
    const career = playMatchdays(newCareer(), 2);
    renderClub(career, career.userClubId);
    const items = within(screen.getByTestId("club-fixtures")).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    const upcoming = career.season.fixtures
      .filter(
        (f) =>
          f.matchday >= career.season.currentMatchday &&
          (f.homeClubId === career.userClubId || f.awayClubId === career.userClubId),
      )
      .slice(0, 3);
    upcoming.forEach((fixture, i) => {
      const home = fixture.homeClubId === career.userClubId;
      const opponentId = home ? fixture.awayClubId : fixture.homeClubId;
      const opponent = career.league.clubs.find((c) => c.id === opponentId);
      expect(items[i]?.textContent).toContain(opponent?.name);
      expect(items[i]?.getAttribute("data-venue")).toBe(home ? "home" : "away");
    });
  });

  it("hides season history when there is none and shows past finishes otherwise", () => {
    const career = newCareer();
    renderClub(career, career.userClubId);
    expect(screen.queryByTestId("club-history")).toBeNull();
    cleanup();
    const next = startNextSeason(playMatchdays(career, 26));
    if (!next.ok) throw new Error("next");
    renderClub(next.career, career.userClubId);
    const rows = within(screen.getByTestId("club-history")).getAllByRole("listitem");
    expect(rows).toHaveLength(1);
    const finish = next.career.history[0]?.finalTable.find((r) => r.clubId === career.userClubId);
    expect(rows[0]?.textContent).toContain(String(finish?.position));
  });

  it("groups the squad by position and shows every player", () => {
    const career = newCareer();
    renderClub(career, career.userClubId);
    const club = career.league.clubs[0];
    expect(screen.getAllByTestId(/^squad-row-/)).toHaveLength(club?.playerIds.length ?? -1);
    for (const position of ["GK", "DEF", "MID", "FWD"]) {
      expect(screen.getByTestId(`squad-group-${position}`)).toBeTruthy();
    }
  });

  it("marks exactly the automatic best eleven", () => {
    const career = newCareer();
    renderClub(career, career.userClubId);
    const club = career.league.clubs[0];
    const players = career.league.players.filter((p) => club?.playerIds.includes(p.id));
    const eleven = new Set(pickBestEleven(players).map((p) => p.id));
    const marked = screen
      .getAllByTestId(/^squad-row-/)
      .filter((row) => row.getAttribute("data-best-eleven") === "true")
      .map((row) => row.getAttribute("data-testid")?.replace("squad-row-", ""));
    expect(new Set(marked)).toEqual(eleven);
    expect(screen.getAllByTestId(/^best-eleven-mark-/)).toHaveLength(11);
  });

  it("shows attribute values as text with a low, mid or high band", () => {
    const career = newCareer();
    renderClub(career, career.userClubId);
    const club = career.league.clubs[0];
    const player = career.league.players.find((p) => club?.playerIds.includes(p.id));
    if (!player) throw new Error("player");
    const cell = screen.getByTestId(`attr-${player.id}-pace`);
    expect(cell.textContent).toBe(String(player.pace));
    const expected = player.pace <= 7 ? "low" : player.pace <= 13 ? "mid" : "high";
    expect(cell.getAttribute("data-band")).toBe(expected);
  });

  it("sorts each position group by a column and reverses on a second click", () => {
    const career = newCareer();
    renderClub(career, career.userClubId);
    const paces = () =>
      within(screen.getByTestId("squad-group-MID"))
        .getAllByTestId(/^attr-.*-pace$/)
        .map((c) => Number(c.textContent));
    fireEvent.click(screen.getByTestId("sort-pace"));
    const first = paces();
    expect(first).toEqual([...first].sort((a, b) => b - a));
    fireEvent.click(screen.getByTestId("sort-pace"));
    const second = paces();
    expect(second).toEqual([...second].sort((a, b) => a - b));
    expect(screen.getByTestId("sort-pace").closest("th")?.getAttribute("aria-sort")).toBe(
      "ascending",
    );
  });

  it("shows the seven phase ratings from 0 to 100", () => {
    const career = newCareer();
    renderClub(career, career.userClubId);
    const values = [
      "buildUp",
      "progression",
      "chanceCreation",
      "finishing",
      "pressing",
      "defending",
      "goalkeeping",
    ].map((key) => Number(screen.getByTestId(`rating-${key}`).textContent));
    for (const v of values) {
      expect(Number.isInteger(v)).toBe(true);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(100);
    }
  });

  it("renders in Swedish", () => {
    const career = newCareer();
    renderClub(career, career.userClubId, "sv");
    expect(screen.getByTestId("your-club").textContent).toBe("Din klubb");
  });
});
