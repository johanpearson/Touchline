import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Career, type Fixture, getNextFixture } from "../../game";
import { createMemoryLocaleStore } from "../../platform";
import { I18nProvider } from "../i18n-provider";
import { type MatchSetup, matchSetupFor } from "../match-setup";
import { careerAfter } from "../test-career";
import { PreMatchScreen } from "./pre-match-screen";

afterEach(cleanup);

const nextFixture = (career: Career): Fixture => {
  const fixture = getNextFixture(career.season, career.userClubId);
  if (!fixture) throw new Error("fixture");
  return fixture;
};

const renderScreen = (
  career: Career,
  locale = "en",
  handlers = { kick: vi.fn(), sim: vi.fn() },
) => {
  const fixture = nextFixture(career);
  const setup: MatchSetup = matchSetupFor(career, fixture);
  const wrap = (node: ReactNode) => (
    <I18nProvider store={createMemoryLocaleStore(locale)}>{node}</I18nProvider>
  );
  render(
    wrap(
      <PreMatchScreen
        career={career}
        fixture={fixture}
        setup={setup}
        onKickOff={handlers.kick}
        onQuickSim={handlers.sim}
      />,
    ),
  );
  return { fixture, setup, ...handlers };
};

const idsIn = (testId: string, prefix: string): string[] =>
  within(screen.getByTestId(testId))
    .getAllByTestId(new RegExp(`^${prefix}-\\d+$`))
    .map((row) => row.getAttribute("data-player-id") ?? "");

describe("PreMatchScreen", () => {
  const career = careerAfter(0);

  it("lists the eleven and the bench that the match input plays", () => {
    const { setup, fixture } = renderScreen(career);
    const side = fixture.homeClubId === career.userClubId ? "home" : "away";

    expect(idsIn("pre-match-starter", "pre-match-starter")).toEqual(
      setup.input[side].starters.map((p) => p.id),
    );
    expect(idsIn("pre-match-bench", "pre-match-bench")).toEqual(
      setup.input[side].bench.map((p) => p.id),
    );
  });

  it("shows the formation and the four tactics of the saved plan", () => {
    renderScreen(career);

    expect(screen.getByTestId("pre-match-formation").textContent).toBe(career.squadPlan.formation);
    expect(screen.getByTestId("pre-match-tactic-mentality").textContent).toBe("Balanced");
  });

  it("shows the round, the venue and a comparison with the opponent's line ratings", () => {
    renderScreen(career);

    expect(screen.getByTestId("pre-match-round").textContent).toBe("Round 1 of 26");
    expect(screen.getByTestId("pre-match-venue").textContent).toMatch(/match$/);
    for (const id of ["position", "form", "goalkeeping", "defence", "midfield", "attack"]) {
      expect(screen.getByTestId(`compare-${id}`)).toBeTruthy();
    }
  });

  it("calls the handlers for kick off and quick sim and links to the tactics screen", () => {
    const { kick, sim } = renderScreen(career);

    fireEvent.click(screen.getByTestId("kick-off"));
    fireEvent.click(screen.getByTestId("quick-sim"));

    expect(kick).toHaveBeenCalledOnce();
    expect(sim).toHaveBeenCalledOnce();
    expect(screen.getByTestId("edit-lineup").getAttribute("href")).toBe("#/tactics");
  });

  it("puts Kick off first in the tab order after the heading", () => {
    renderScreen(career);
    const focusable = screen
      .getByTestId("pre-match")
      .querySelectorAll<HTMLElement>("a[href], button");

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Match preview");
    expect(focusable[0]).toBe(screen.getByTestId("kick-off"));
  });

  it("warns, in words, about a starter below the low-fitness threshold", () => {
    const tired = career.squadPlan.starters[2] as string;
    const worn = {
      ...career,
      condition: { ...career.condition, [tired]: { fitness: 30, form: 5 } },
    };
    renderScreen(worn);

    const warnings = screen.getAllByTestId("low-fitness");
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.textContent).toBe("Low fitness");
    expect(warnings[0]?.closest("li")?.getAttribute("data-player-id")).toBe(tired);
  });

  it("is available in Swedish", () => {
    renderScreen(career, "sv");

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Inför matchen");
    expect(screen.getByTestId("kick-off").textContent).toBe("Avspark");
  });

  it("shows the kit colours the match view uses when the two clubs clash", () => {
    const fixture = nextFixture(career);
    const other =
      fixture.homeClubId === career.userClubId ? fixture.awayClubId : fixture.homeClubId;
    const own = career.league.clubs.find((c) => c.id === career.userClubId);
    const clashing: Career = {
      ...career,
      league: {
        ...career.league,
        clubs: career.league.clubs.map((c) =>
          c.id === other && own ? { ...c, colours: { ...own.colours } } : c,
        ),
      },
    };
    const { setup } = renderScreen(clashing);

    for (const side of ["home", "away"] as const) {
      const shown = screen.getByTestId(`pre-match-kit-${side}`);
      expect(shown.getAttribute("data-body")).toBe(setup.kits[side].body);
      expect(shown.getAttribute("data-trim")).toBe(setup.kits[side].trim);
    }
    expect(screen.getByTestId("pre-match-kit-away").textContent).toBe("Away kit");
    expect(screen.getByTestId("pre-match-kit-home").textContent).toBe("Home kit");
  });
});
