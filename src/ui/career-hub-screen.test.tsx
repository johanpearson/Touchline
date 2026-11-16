import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Career, getNextFixture } from "../game";
import { createMemoryLocaleStore } from "../platform";
import { CareerHubView } from "./career-hub-screen";
import { installBrowserStubs } from "./components/overlay-test-setup";
import { I18nProvider } from "./i18n-provider";
import { LOW_FITNESS } from "./plan-rows";
import { careerAfter, startersOf } from "./test-career";

const renderHub = (career: Career, locale = "en", onQuickSim = vi.fn()) => {
  render(
    <I18nProvider store={createMemoryLocaleStore(locale)}>
      <CareerHubView career={career} onQuickSim={onQuickSim} />
    </I18nProvider>,
  );
  return onQuickSim;
};

const clubName = (career: Career, id: string) =>
  career.league.clubs.find((c) => c.id === id)?.name ?? "";

describe("career hub", () => {
  beforeEach(() => installBrowserStubs());
  afterEach(cleanup);

  describe("first matchday", () => {
    it("shows the user's club, the opponent and the round", () => {
      const career = careerAfter(0);
      renderHub(career);
      const fixture = getNextFixture(career.season, career.userClubId);
      const opponentId =
        fixture?.homeClubId === career.userClubId ? fixture?.awayClubId : fixture?.homeClubId;
      expect(screen.getByTestId("hub-club-name").textContent).toBe(
        clubName(career, career.userClubId),
      );
      expect(screen.getByTestId("next-match-opponent").textContent).toContain(
        clubName(career, opponentId ?? ""),
      );
      expect(screen.getByTestId("next-match-matchday").textContent).toBe("Round 1 of 26");
    });

    it("puts the primary action first and links it to the match", () => {
      renderHub(careerAfter(0));
      const main = screen.getByTestId("career-hub");
      const focusables = main.querySelectorAll("a[href], button");
      expect(focusables[0]).toBe(screen.getByTestId("play-match"));
      expect(screen.getByTestId("play-match").getAttribute("href")).toBe("#/match");
    });

    it("quick-sims through the callback", () => {
      const onQuickSim = renderHub(careerAfter(0));
      fireEvent.click(screen.getByTestId("quick-sim"));
      expect(onQuickSim).toHaveBeenCalledTimes(1);
    });

    it("shows an empty state instead of a table and dashes instead of invented numbers", () => {
      renderHub(careerAfter(0));
      expect(screen.getByTestId("hub-table-empty")).toBeTruthy();
      expect(screen.queryAllByTestId(/^hub-table-row-/)).toHaveLength(0);
      expect(screen.getByTestId("compare-position").textContent).toContain("–");
      expect(screen.getByTestId("compare-goals").textContent).toContain("–");
    });

    it("shows a rating for both clubs", () => {
      renderHub(careerAfter(0));
      expect(screen.getByTestId("compare-rating").textContent).toMatch(/\d+.*\d+/);
    });
  });

  describe("mid season", () => {
    it("shows seven table rows with the user's club marked", () => {
      const career = careerAfter(4);
      renderHub(career);
      expect(screen.getAllByTestId(/^hub-table-row-/)).toHaveLength(7);
      const row = screen.getByTestId(`hub-table-row-${career.userClubId}`);
      expect(row.getAttribute("aria-current")).toBe("true");
      expect(within(row).getByText(clubName(career, career.userClubId))).toBeTruthy();
    });

    it("links to the full table", () => {
      renderHub(careerAfter(4));
      expect(screen.getByTestId("hub-full-table").getAttribute("href")).toBe("#/league");
    });

    it("shows the user's position and last-five points from the career", () => {
      const career = careerAfter(4);
      renderHub(career);
      expect(screen.getByTestId("compare-position").textContent).toMatch(/\d+/);
      expect(screen.getByTestId("compare-form").textContent).toMatch(/of 12/);
    });
  });

  describe("last matchday", () => {
    it("shows round 26 of 26 and the play action", () => {
      const career = careerAfter(0);
      const last: Career = {
        ...careerAfter(0),
        season: { ...career.season, currentMatchday: 26 },
      };
      renderHub(last);
      expect(screen.getByTestId("next-match-matchday").textContent).toBe("Round 26 of 26");
      expect(screen.getByTestId("play-match")).toBeTruthy();
    });
  });

  describe("season complete", () => {
    it("offers the season summary and no next match", () => {
      const career = careerAfter(0);
      const done: Career = {
        ...career,
        season: {
          ...career.season,
          currentMatchday: 27,
          results: career.season.fixtures.map((f) => ({
            fixtureId: f.id,
            homeClubId: f.homeClubId,
            awayClubId: f.awayClubId,
            homeGoals: 1,
            awayGoals: 0,
            engineVersion: 2,
          })),
        },
      };
      renderHub(done);
      expect(screen.getByTestId("season-complete")).toBeTruthy();
      expect(screen.getByTestId("to-season-end").getAttribute("href")).toBe("#/season-end");
      expect(screen.queryByTestId("next-match")).toBeNull();
    });
  });

  describe("squad status", () => {
    it("says everyone is fit when nobody is below the threshold", () => {
      renderHub(careerAfter(0));
      expect(screen.getByTestId("squad-fitness").textContent).toContain("100");
      expect(screen.getByTestId("squad-all-fit")).toBeTruthy();
    });

    it("lists tired players, three at most, with a count of the rest", () => {
      const career = careerAfter(0);
      const ids = startersOf(career, 5);
      const tired: Career = {
        ...career,
        condition: {
          ...career.condition,
          ...Object.fromEntries(
            ids.map((id, i) => [id, { fitness: LOW_FITNESS - 5 - i, form: 5 }]),
          ),
        },
      };
      renderHub(tired);
      expect(screen.getAllByTestId(/^squad-alert-/)).toHaveLength(3);
      expect(screen.getByTestId("squad-alerts-more").textContent).toBe("and 2 more");
      expect(screen.queryByTestId("squad-all-fit")).toBeNull();
    });
  });

  describe("Swedish", () => {
    it("uses Swedish copy", () => {
      renderHub(careerAfter(4), "sv");
      expect(screen.getByTestId("next-match-matchday").textContent).toBe("Omgång 5 av 26");
      expect(screen.getByTestId("hub-full-table").textContent).toBe("Hela tabellen");
    });

    it("lets long club names wrap instead of clipping them", () => {
      renderHub(careerAfter(4), "sv");
      const name = screen.getByTestId("hub-club-name");
      expect(name.className).toContain("break-words");
      expect(name.className).not.toContain("truncate");
    });
  });
});
