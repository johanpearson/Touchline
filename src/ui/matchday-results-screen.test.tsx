import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Career } from "../game";
import { createMemoryDensityStore, createMemoryLocaleStore } from "../platform";
import { I18nProvider } from "./i18n-provider";
import { MatchdayResultsView } from "./matchday-results-screen";
import { careerAfter } from "./test-career";
import { DensityProvider } from "./theme/density-provider";

beforeEach(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});
afterEach(cleanup);

const renderView = (career: Career, locale = "en") =>
  render(
    <I18nProvider store={createMemoryLocaleStore(locale)}>
      <DensityProvider store={createMemoryDensityStore(null)}>
        <MatchdayResultsView career={career} />
      </DensityProvider>
    </I18nProvider>,
  );

describe("MatchdayResultsView", () => {
  it("shows the user's match first, then the six others", () => {
    renderView(careerAfter(3));
    const rows = screen.getAllByTestId(/^result-(?!score)/);
    expect(rows).toHaveLength(7);
    expect(rows[0]?.getAttribute("data-user")).toBe("true");
    expect(rows.filter((row) => row.getAttribute("data-user") === "true")).toHaveLength(1);
  });

  it("shows the user's position and points", () => {
    renderView(careerAfter(3));
    expect(screen.getByTestId("user-position").textContent).toMatch(
      /Your position: \d+ \(\d+ points\)/,
    );
  });

  it("describes how the position moved since the round before", () => {
    renderView(careerAfter(3));
    const movement = screen.getByTestId("user-movement");
    expect(["up", "down", "same"]).toContain(movement.getAttribute("data-direction"));
    expect(movement.textContent).toMatch(/place|Same position/);
  });

  it("shows no movement after the first round", () => {
    renderView(careerAfter(1));
    expect(screen.queryByTestId("user-movement")).toBeNull();
  });

  it("shows a five-club mini table that marks the user's club", () => {
    const career = careerAfter(3);
    renderView(career);
    const rows = within(screen.getByTestId("mini-table")).getAllByTestId(/^mini-row-/);
    expect(rows).toHaveLength(5);
    expect(
      screen.getByTestId(`mini-row-${career.userClubId}`).getAttribute("data-highlighted"),
    ).toBe("true");
  });

  it("links on to the hub, and to the season end after the last round", () => {
    renderView(careerAfter(3));
    expect(screen.getByTestId("results-continue").getAttribute("href")).toBe("#/");
    cleanup();
    renderView(careerAfter(26));
    expect(screen.getByTestId("results-continue").getAttribute("href")).toBe("#/season-end");
  });

  it("uses Swedish labels", () => {
    renderView(careerAfter(3), "sv");
    expect(screen.getByTestId("user-position").textContent).toContain("Din placering");
    expect(screen.getByTestId("matchday-results").textContent).toContain("Din match");
  });
});
