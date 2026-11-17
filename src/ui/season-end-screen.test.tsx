import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Career, summariseSeason } from "../game";
import { createMemoryDensityStore, createMemoryLocaleStore } from "../platform";
import { I18nProvider } from "./i18n-provider";
import { SeasonEndView } from "./season-end-screen";
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

const finished = () => careerAfter(26);

const summaryOf = (career: Career) => {
  const result = summariseSeason(career);
  if (!result.ok) throw new Error("season not finished");
  return result.summary;
};

const renderEnd = (career: Career, locale = "en", onNext = () => {}) =>
  render(
    <I18nProvider store={createMemoryLocaleStore(locale)}>
      <DensityProvider store={createMemoryDensityStore(null)}>
        <SeasonEndView career={career} summary={summaryOf(career)} onNext={onNext} />
      </DensityProvider>
    </I18nProvider>,
  );

describe("SeasonEndView", () => {
  it("shows the champion, the user's finish, the final table and the top scorers", () => {
    renderEnd(finished());
    expect(screen.getByTestId("champion").textContent).toMatch(/\S/);
    expect(screen.getByTestId("user-finish").textContent).toMatch(/Your finish: \d+/);
    expect(screen.getAllByTestId(/^final-row-/)).toHaveLength(14);
    expect(screen.getByTestId("top-scorers").children.length).toBeGreaterThan(0);
  });

  it("congratulates the user only when their club won the league", () => {
    const career = finished();
    const champion = summaryOf(career).championId;
    const other = career.league.clubs.find((c) => c.id !== champion);
    if (!other) throw new Error("club");
    renderEnd({ ...career, userClubId: other.id });
    expect(screen.queryByTestId("champion-message")).toBeNull();
    expect(screen.getByTestId("champion-card").getAttribute("data-user-champion")).toBeNull();
    cleanup();
    renderEnd({ ...career, userClubId: champion });
    expect(screen.getByTestId("champion-message").textContent).toBe("You are the champions!");
    expect(screen.getByTestId("champion-card").getAttribute("data-user-champion")).toBe("true");
  });

  it("starts the next season from the button", () => {
    const onNext = vi.fn();
    renderEnd(finished(), "en", onNext);
    fireEvent.click(screen.getByTestId("next-season"));
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("uses Swedish labels", () => {
    renderEnd(finished(), "sv");
    expect(screen.getByTestId("screen-season-end").textContent).toContain("Skytteliga");
  });

  it("has no animation that ignores reduced motion", () => {
    renderEnd(finished());
    const html = screen.getByTestId("screen-season-end").innerHTML;
    expect(html).not.toMatch(/(?<!motion-safe:)animate-/);
  });
});
