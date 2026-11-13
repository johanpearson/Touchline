import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MatchStats } from "../../engine";
import { createMemoryLocaleStore } from "../../platform";
import { I18nProvider } from "../i18n-provider";
import { HalfTimePanel } from "./half-time-panel";

const stats: MatchStats = {
  possession: { home: 0.6, away: 0.4 },
  fieldTilt: { home: 0.55, away: 0.45 },
  shots: { home: 5, away: 3 },
  shotsOnTarget: { home: 2, away: 1 },
  xg: { home: 0.8, away: 0.4 },
  corners: { home: 2, away: 1 },
};

const mount = (onResume = vi.fn(), locale = "en") =>
  render(
    <I18nProvider store={createMemoryLocaleStore(locale)}>
      <HalfTimePanel
        homeName="Kvarnby"
        awayName="Västerås Park"
        score={{ home: 1, away: 0 }}
        stats={stats}
        onResume={onResume}
      />
    </I18nProvider>,
  );

describe("HalfTimePanel", () => {
  afterEach(cleanup);

  it("shows the half-time score and first-half stats", () => {
    mount();
    expect(screen.getByTestId("half-time-score").textContent).toContain(
      "Kvarnby 1 – 0 Västerås Park",
    );
    expect(screen.getByTestId("stat-shots").textContent).toContain("5");
  });

  it("calls onResume when the start second half button is clicked", () => {
    const onResume = vi.fn();
    mount(onResume);
    fireEvent.click(screen.getByTestId("start-second-half"));
    expect(onResume).toHaveBeenCalledOnce();
  });

  it("has a placeholder for substitutions and tactics", () => {
    mount();
    expect(screen.getByTestId("half-time-changes")).toBeTruthy();
  });

  it("is in Swedish when the locale is Swedish", () => {
    mount(vi.fn(), "sv");
    expect(screen.getByTestId("start-second-half").textContent).toBe("Starta andra halvlek");
  });
});
