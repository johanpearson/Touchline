import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { Career } from "../game";
import { createMemoryLocaleStore } from "../platform";
import { I18nProvider } from "./i18n-provider";
import { PlayerView } from "./player-screen";
import { careerAfter } from "./test-career";

const renderPlayer = (career: Career, playerId: string, locale = "en") =>
  render(
    <I18nProvider store={createMemoryLocaleStore(locale)}>
      <PlayerView career={career} playerId={playerId} />
    </I18nProvider>,
  );

const userClub = (career: Career) => career.league.clubs.find((c) => c.id === career.userClubId);
const playerOf = (career: Career, position: string) => {
  const ids = new Set(userClub(career)?.playerIds);
  const player = career.league.players.find((p) => ids.has(p.id) && p.position === position);
  if (!player) throw new Error("player");
  return player;
};

describe("PlayerView", () => {
  afterEach(cleanup);

  it("shows the not-found view for an unknown player", () => {
    renderPlayer(careerAfter(0), "nope");
    expect(screen.getByTestId("not-found")).toBeTruthy();
  });

  it("shows name, club link, overall, fitness, form and squad status", () => {
    const career = careerAfter(1);
    const player = playerOf(career, "MID");
    renderPlayer(career, player.id);
    expect(screen.getByTestId("player-name").textContent).toBe(player.name);
    const club = screen.getByTestId("player-club") as HTMLAnchorElement;
    expect(club.getAttribute("href")).toBe(`#/club/${encodeURIComponent(career.userClubId)}`);
    expect(screen.getByTestId("player-overall")).toBeTruthy();
    expect(screen.getByTestId("player-fitness").textContent).toMatch(/\d/);
    expect(screen.getByTestId("player-form")).toBeTruthy();
    expect(screen.getByTestId("player-status").textContent).toMatch(/Starter|Bench|Not in squad/);
  });

  it("shows every stored attribute value with its band as text", () => {
    const career = careerAfter(0);
    const player = playerOf(career, "FWD");
    renderPlayer(career, player.id);
    const row = screen.getByTestId("player-attr-finishing");
    expect(within(row).getByTestId("player-attr-value-finishing").textContent).toBe(
      String(player.finishing),
    );
    expect(row.textContent).toMatch(/Low|Mid|High/);
    expect(screen.queryByTestId("player-attr-handling")).toBeNull();
  });

  it("gives each bar a text alternative with number and band", () => {
    const career = careerAfter(0);
    const player = playerOf(career, "FWD");
    renderPlayer(career, player.id);
    const bar = screen.getByTestId("player-attr-bar-finishing");
    expect(bar.getAttribute("role")).toBe("img");
    expect(bar.getAttribute("aria-label")).toContain(`${player.finishing} of 20`);
  });

  it("shows the goalkeeping group for a goalkeeper only", () => {
    const career = careerAfter(0);
    renderPlayer(career, playerOf(career, "GK").id);
    expect(screen.getByTestId("player-attr-handling")).toBeTruthy();
    expect(screen.getByTestId("player-attr-reflexes")).toBeTruthy();
  });

  it("shows goals from the result scorers and says so when they are not recorded", () => {
    const career = careerAfter(0);
    const player = playerOf(career, "FWD");
    const other = career.league.clubs.find((c) => c.id !== career.userClubId)?.id ?? "";
    const result = (scorers?: string[]) =>
      ({
        fixtureId: "x",
        homeClubId: career.userClubId,
        awayClubId: other,
        homeGoals: 2,
        awayGoals: 0,
        engineVersion: 1,
        ...(scorers ? { scorers } : {}),
      }) as Career["season"]["results"][number];
    const withScorers = {
      ...career,
      season: { ...career.season, results: [result([player.id, player.id])] },
    };
    renderPlayer(withScorers, player.id);
    expect(screen.getByTestId("player-goals").textContent).toBe("2");
    cleanup();
    const old = { ...career, season: { ...career.season, results: [result()] } };
    renderPlayer(old, player.id);
    expect(screen.getByTestId("player-goals").textContent).toBe("Not recorded");
  });

  it("renders in Swedish", () => {
    const career = careerAfter(0);
    renderPlayer(career, playerOf(career, "MID").id, "sv");
    expect(screen.getByText("Egenskaper")).toBeTruthy();
  });
});
