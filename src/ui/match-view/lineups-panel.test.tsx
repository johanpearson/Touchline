import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { createMemoryLocaleStore } from "../../platform";
import { I18nProvider } from "../i18n-provider";
import type { LineupRow } from "./lineup-rows";
import { LineupsPanel } from "./lineups-panel";
import { TiredAnnouncer } from "./tired-announcer";

const inLocale = (ui: ReactNode, locale = "en") =>
  render(<I18nProvider store={createMemoryLocaleStore(locale)}>{ui}</I18nProvider>);

const row = (overrides: Partial<LineupRow> & { id: string }): LineupRow => ({
  name: overrides.id,
  side: "home",
  status: "pitch",
  position: "MID",
  rating: 12,
  energy: 100,
  tired: false,
  goals: 0,
  matchRating: 6,
  ...overrides,
});

const teamNames = { home: "Kvarnby", away: "Västerås" };
const colours = { home: "#f00", away: "#00f" };

describe("LineupsPanel", () => {
  afterEach(cleanup);

  it("shows rating and energy for each player, on the pitch and on the bench", () => {
    const rows = {
      home: [row({ id: "h1", rating: 13.5, energy: 80 }), row({ id: "h2", status: "bench" })],
      away: [],
    };
    inLocale(<LineupsPanel rows={rows} teamNames={teamNames} colours={colours} />);
    const first = screen.getByTestId("lineup-row-h1");
    expect(first.textContent).toContain("13.5");
    expect(first.querySelector('[data-testid="fitness-value"]')?.textContent).toBe("80");
    expect(screen.getByTestId("lineup-row-h2").textContent).toContain("Bench");
  });

  it("flags a tired player with text and a shape, not only colour", () => {
    const rows = { home: [row({ id: "h1", energy: 30, tired: true })], away: [] };
    inLocale(<LineupsPanel rows={rows} teamNames={teamNames} colours={colours} />);
    const flagged = screen.getByTestId("lineup-row-h1");
    expect(flagged.getAttribute("data-tired")).toBe("true");
    expect(flagged.textContent).toContain("Low fitness");
    expect(flagged.querySelector("svg")).not.toBeNull();
  });

  it("greys a player who was substituted off and says so", () => {
    const rows = { home: [row({ id: "h1", status: "off" })], away: [] };
    inLocale(<LineupsPanel rows={rows} teamNames={teamNames} colours={colours} />);
    const off = screen.getByTestId("lineup-row-h1");
    expect(off.className).toContain("opacity-60");
    expect(off.textContent).toContain("Substituted off");
  });

  it("uses Swedish labels", () => {
    const rows = { home: [row({ id: "h1", status: "off" })], away: [] };
    inLocale(<LineupsPanel rows={rows} teamNames={teamNames} colours={colours} />, "sv");
    expect(screen.getByTestId("lineup-row-h1").textContent).toContain("Utbytt");
  });
});

describe("TiredAnnouncer", () => {
  afterEach(cleanup);
  const view = (rows: LineupRow[]) => (
    <I18nProvider store={createMemoryLocaleStore("en")}>
      <TiredAnnouncer rows={rows} />
    </I18nProvider>
  );

  it("is a polite live region that says nothing while nobody is tired", () => {
    render(view([row({ id: "h1" })]));
    const region = screen.getByTestId("tired-announcer");
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.textContent).toBe("");
  });

  it("announces a player once when he gets tired, and not again as the energy keeps falling", () => {
    const { rerender } = render(view([row({ id: "h1", name: "Ek" })]));
    rerender(view([row({ id: "h1", name: "Ek", energy: 49, tired: true })]));
    const region = screen.getByTestId("tired-announcer");
    expect(region.textContent).toBe("Ek is tired, energy 49");
    rerender(view([row({ id: "h1", name: "Ek", energy: 40, tired: true })]));
    expect(region.textContent).toBe("Ek is tired, energy 49");
    rerender(
      view([
        row({ id: "h1", name: "Ek", energy: 40, tired: true }),
        row({ id: "h2", name: "Berg", energy: 45, tired: true }),
      ]),
    );
    expect(region.textContent).toBe("Berg is tired, energy 45");
  });
});
