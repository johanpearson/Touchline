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
import { finishSeason } from "../game/finish-season";
import { playMatchdays } from "../game/season-test-helpers";
import { createMemoryDensityStore, createMemoryLocaleStore } from "../platform";
import { ClubView } from "./club-screen";
import { I18nProvider } from "./i18n-provider";
import { DensityProvider } from "./theme/density-provider";

const SEED = 11;

// One career object for the whole file: careers are immutable, and the played matchdays are shared per object.
let cachedCareer: Career | undefined;
const newCareer = (): Career => {
  if (cachedCareer) return cachedCareer;
  const generated = generateLeague({ seed: SEED });
  if (!generated.ok) throw new Error("league");
  const result = createCareer({ seed: SEED, userClubId: generated.league.clubs[0]?.id ?? "" });
  if (!result.ok) throw new Error("career");
  cachedCareer = result.career;
  return cachedCareer;
};

const renderClub = (career: Career, clubId: string, locale = "en") =>
  render(
    <I18nProvider store={createMemoryLocaleStore(locale)}>
      <DensityProvider store={createMemoryDensityStore(null)}>
        <ClubView career={career} clubId={clubId} />
      </DensityProvider>
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
    expect(chips.map((c) => c.getAttribute("data-outcome"))).toEqual(form);
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
    const next = finishSeason(playMatchdays(career, 26));
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
    const headings = within(screen.getByTestId("squad-table"))
      .getAllByRole("rowheader")
      .map((h) => h.textContent);
    expect(headings).toEqual(["Goalkeepers", "Defenders", "Midfielders", "Forwards"]);
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
    const paces = () => screen.getAllByTestId(/^attr-.*-pace$/).map((c) => Number(c.textContent));
    const header = () => screen.getByRole("columnheader", { name: /pace/i });
    fireEvent.click(within(header()).getByRole("button"));
    const first = paces();
    expect(header().getAttribute("aria-sort")).not.toBe("none");
    fireEvent.click(within(header()).getByRole("button"));
    expect(paces()).not.toEqual(first);
    expect(header().getAttribute("aria-sort")).not.toBe("none");
  });

  it("shows the line ratings and the overall from 0 to 100", () => {
    const career = newCareer();
    renderClub(career, career.userClubId);
    const values = ["goalkeeping", "defence", "midfield", "attack", "overall"].map((key) =>
      Number(screen.getByTestId(`rating-${key}`).textContent),
    );
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

  it("shows fitness and form for every squad player", () => {
    const career = newCareer();
    renderClub(career, otherClubId(career));
    const club = career.league.clubs[1];
    const id = club?.playerIds[0] ?? "";
    expect(screen.getByTestId(`fitness-${id}`).textContent).toBe("100");
    expect(screen.getByTestId(`form-${id}`).textContent).toBe("5");
    expect(screen.getByRole("columnheader", { name: "Fitness" })).toBeTruthy();
  });

  it("shows the club identity: league, home and away kit, and a link per player", () => {
    const career = newCareer();
    renderClub(career, otherClubId(career));
    expect(screen.getByTestId("club-league").textContent).toBe(career.league.name);
    expect(within(screen.getByTestId("club-kits")).getByText("Home kit")).toBeTruthy();
    expect(within(screen.getByTestId("club-kits")).getByText("Away kit")).toBeTruthy();
    const id = career.league.clubs[1]?.playerIds[0] ?? "";
    expect(screen.getByTestId(`player-link-${id}`).getAttribute("href")).toBe(`#/player/${id}`);
  });

  it("offers the edit-lineup link to the tactics screen on the user's club only", () => {
    const career = newCareer();
    renderClub(career, career.userClubId);
    expect(screen.getByTestId("edit-lineup").getAttribute("href")).toBe("#/tactics");
    cleanup();
    renderClub(career, otherClubId(career));
    expect(screen.queryByTestId("edit-lineup")).toBeNull();
  });

  it("renders for clubs with very light and very dark colours", () => {
    const career = newCareer();
    const [first, ...rest] = career.league.clubs;
    if (!first) throw new Error("club");
    const light = { ...first, colours: { primary: "#ffffff", secondary: "#fffde7" } };
    renderClub({ ...career, league: { ...career.league, clubs: [light, ...rest] } }, first.id);
    expect(screen.getByTestId("club-name").textContent).toBe(first.name);
    cleanup();
    const dark = { ...first, colours: { primary: "#000000", secondary: "#050505" } };
    renderClub({ ...career, league: { ...career.league, clubs: [dark, ...rest] } }, first.id);
    expect(screen.getByTestId("club-name").textContent).toBe(first.name);
  });
});
