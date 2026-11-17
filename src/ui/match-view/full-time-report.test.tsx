import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMemoryLocaleStore } from "../../platform";
import { I18nProvider } from "../i18n-provider";
import { FullTimeReport } from "./full-time-report";
import type { GoalLine } from "./match-result";

beforeEach(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});
afterEach(cleanup);

const goals: GoalLine[] = [
  { side: "home", time: 600, name: "Ek", minute: "10’" },
  { side: "away", time: 1500, name: "Berg", minute: "25’" },
  { side: "home", time: 3000, name: "Lind", minute: "45+5’" },
];

type Score = { home: number; away: number };

const renderReport = (score: Score, userSide: "home" | "away", list = goals, locale = "en") =>
  render(
    <I18nProvider store={createMemoryLocaleStore(locale)}>
      <FullTimeReport
        names={{ home: "Kvarnby", away: "Västerås" }}
        colours={{ home: "#d62828", away: "#1d4ed8" }}
        score={score}
        userSide={userSide}
        goals={list}
      >
        <p data-testid="child">ratings</p>
      </FullTimeReport>
    </I18nProvider>,
  );

describe("FullTimeReport", () => {
  it.each([
    [{ home: 2, away: 1 }, "home", "win", "Victory"],
    [{ home: 1, away: 1 }, "home", "draw", "Draw"],
    [{ home: 0, away: 2 }, "home", "defeat", "Defeat"],
    [{ home: 0, away: 2 }, "away", "win", "Victory"],
  ] as const)("says %j for the %s side as text: %s", (score, side, outcome, text) => {
    renderReport(score, side);
    expect(screen.getByTestId("match-headline").textContent).toBe(text);
    expect(screen.getByTestId("match-outcome").textContent).toBe(text);
    expect(screen.getByTestId("match-outcome").getAttribute("data-outcome")).toBe(outcome);
  });

  it("shows the score and both club names", () => {
    renderReport({ home: 2, away: 1 }, "home");
    expect(screen.getByTestId("full-time-score").textContent).toBe("2 – 1");
    expect(screen.getByTestId("full-time-report").textContent).toContain("Kvarnby");
    expect(screen.getByTestId("full-time-report").textContent).toContain("Västerås");
  });

  it("lists each side's scorers in time order with the minute", () => {
    renderReport({ home: 2, away: 1 }, "home");
    const home = within(screen.getByTestId("scorers-home")).getAllByRole("listitem");
    expect(home.map((li) => li.textContent)).toEqual(["Ek10’", "Lind45+5’"]);
    const away = within(screen.getByTestId("scorers-away")).getAllByRole("listitem");
    expect(away.map((li) => li.textContent)).toEqual(["Berg25’"]);
  });

  it("says so when there were no goals", () => {
    renderReport({ home: 0, away: 0 }, "home", []);
    expect(screen.getByText("No goals")).toBeTruthy();
  });

  it("renders the ratings under the headline", () => {
    renderReport({ home: 2, away: 1 }, "home");
    expect(screen.getByTestId("child")).toBeTruthy();
  });

  it("uses Swedish text", () => {
    renderReport({ home: 0, away: 2 }, "home", goals, "sv");
    expect(screen.getByTestId("match-headline").textContent).toBe("Förlust");
  });
});
