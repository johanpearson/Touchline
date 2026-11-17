import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NEUTRAL_TACTICS } from "../../engine";
import { createMemoryLocaleStore } from "../../platform";
import { I18nProvider } from "../i18n-provider";
import { matchSetupFor } from "../match-setup";
import { anActionMatchSetup } from "./action-match-fixture";
import { MatchScreen, type MatchScreenProps } from "./match-screen";
import type { TerrainRenderer } from "./terrain-renderer";

const fakeRenderer = (): TerrainRenderer => ({
  resize: vi.fn(),
  render: vi.fn(),
  dispose: vi.fn(),
});

const clockText = () => screen.getByTestId("clock").textContent;
const play = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe("MatchScreen", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const mountAction = (
    props: Partial<Pick<MatchScreenProps, "halfTimeEditor" | "onContinue">> = {},
    locale = "en",
  ) => {
    const { setup } = anActionMatchSetup();
    return render(
      <I18nProvider store={createMemoryLocaleStore(locale)}>
        <MatchScreen
          {...setup}
          createRenderer={fakeRenderer}
          createPitchRenderer={() => ({ resize: vi.fn(), render: vi.fn(), dispose: vi.fn() })}
          tickMs={1000}
          {...props}
        />
      </I18nProvider>,
    );
  };

  it("advances the clock while playing", () => {
    mountAction();
    play(10_000);
    expect(clockText()).not.toBe("0’");
  });

  it("holds the clock while paused and continues after play", () => {
    mountAction();
    play(2000);
    fireEvent.click(screen.getByTestId("pause-toggle"));
    const paused = clockText();
    play(60_000);
    expect(clockText()).toBe(paused);
    fireEvent.click(screen.getByTestId("pause-toggle"));
    play(5000);
    expect(clockText()).not.toBe(paused);
  });

  it("runs faster at a higher speed", () => {
    mountAction();
    fireEvent.click(screen.getByTestId("speed-1"));
    play(5000);
    expect(clockText()).toBe("2’");
    cleanup();
    mountAction();
    fireEvent.click(screen.getByTestId("speed-4"));
    play(5000);
    expect(clockText()).toBe("20’");
  });

  it("passes no report when nothing changed at half-time", () => {
    const onContinue = vi.fn();
    const { career } = anActionMatchSetup();
    const editor = {
      players: career.league.players,
      starters: career.squadPlan.starters,
      bench: career.squadPlan.bench,
      condition: {},
      tactics: career.squadPlan.tactics,
      plan: () => {
        throw new Error("no plan expected");
      },
    };
    mountAction({
      // biome-ignore lint/suspicious/noExplicitAny: a minimal fake editor for this test
      halfTimeEditor: editor as any,
      onContinue,
    });
    fireEvent.click(screen.getByTestId("speed-4"));
    play(20_000);
    fireEvent.click(screen.getByTestId("start-second-half"));
    play(40_000);
    fireEvent.click(screen.getByTestId("continue"));
    expect(onContinue).toHaveBeenCalledWith(
      expect.objectContaining({ engineVersion: 2 }),
      undefined,
    );
  });

  it("hands over the scorer of every goal with the final score", () => {
    const onContinue = vi.fn();
    mountAction({ onContinue });
    fireEvent.click(screen.getByTestId("speed-4"));
    play(20_000);
    fireEvent.click(screen.getByTestId("start-second-half"));
    play(40_000);
    fireEvent.click(screen.getByTestId("continue"));
    const [finished] = onContinue.mock.calls[0] as [
      { score: { home: number; away: number }; scorers: string[] },
    ];
    expect(finished.scorers).toHaveLength(finished.score.home + finished.score.away);
    expect(finished.scorers.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
  });

  describe("view toggle", () => {
    beforeEach(() => window.sessionStorage.clear());
    const pitchRenderer = () => ({ resize: vi.fn(), render: vi.fn(), dispose: vi.fn() });

    it("shows the momentum terrain by default and the pitch after choosing it", () => {
      const { setup } = anActionMatchSetup();
      render(
        <I18nProvider store={createMemoryLocaleStore("en")}>
          <MatchScreen
            {...setup}
            createRenderer={fakeRenderer}
            createPitchRenderer={pitchRenderer}
            tickMs={1000}
          />
        </I18nProvider>,
      );
      expect(screen.getByTestId("momentum-terrain")).toBeTruthy();
      expect(screen.queryByTestId("classic-pitch")).toBeNull();
      fireEvent.click(screen.getByTestId("view-pitch"));
      expect(screen.getByTestId("classic-pitch")).toBeTruthy();
      expect(screen.queryByTestId("momentum-terrain")).toBeNull();
      expect(screen.getByTestId("scoreboard")).toBeTruthy();
      expect(screen.getByTestId("speed-1")).toBeTruthy();
      expect(screen.getByTestId("feed")).toBeTruthy();
    });

    it("keeps the choice for the session", () => {
      mountAction();
      fireEvent.click(screen.getByTestId("view-pitch"));
      cleanup();
      mountAction();
      expect(screen.getByTestId("classic-pitch")).toBeTruthy();
    });

    it("labels the toggle in Swedish", () => {
      mountAction({}, "sv");
      expect(screen.getByTestId("view-pitch").textContent).toBe("2D");
      expect(screen.getByTestId("view-momentum").textContent).toBe("Terräng");
    });

    it("offers a passing chain toggle in the pitch view only, in both languages", () => {
      mountAction({}, "sv");
      expect(screen.queryByTestId("chain-toggle")).toBeNull();
      fireEvent.click(screen.getByTestId("view-pitch"));
      const toggle = screen.getByTestId("chain-toggle");
      expect(toggle.textContent).toBe("Passningskedja");
      expect(toggle.getAttribute("aria-pressed")).toBe("true");
      fireEvent.click(toggle);
      expect(toggle.getAttribute("aria-pressed")).toBe("false");
    });

    it("falls back to the momentum view when storage is unavailable", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
        throw new Error("blocked");
      });
      mountAction();
      fireEvent.click(screen.getByTestId("view-pitch"));
      expect(screen.getByTestId("classic-pitch")).toBeTruthy();
      vi.restoreAllMocks();
    });
  });

  it("shows every panel and starts at kickoff in the first half", () => {
    mountAction();
    for (const id of ["scoreboard", "stats-panel", "momentum-chart", "feed", "momentum-terrain"]) {
      expect(screen.getByTestId(id)).toBeTruthy();
    }
    expect(clockText()).toBe("0’");
    expect(screen.getByTestId("period").textContent).toBe("First half");
    expect(screen.getByTestId("score").textContent).toBe("0 – 0");
  });

  it("fills the stats panel from the adapted events and the feed with player commentary", () => {
    mountAction();
    fireEvent.click(screen.getByTestId("speed-4"));
    play(20_000);
    expect(screen.getByTestId("stat-possession").textContent).toMatch(/\d/);
    expect(screen.getAllByTestId("feed-line").length).toBeGreaterThan(0);
  });

  it("stops at half-time, starts the second half and plays on to full time", () => {
    mountAction();
    fireEvent.click(screen.getByTestId("speed-4"));
    play(20_000);
    expect(screen.getByTestId("period").textContent).toBe("Half-time");
    expect(screen.getByTestId("half-time-score")).toBeTruthy();
    fireEvent.click(screen.getByTestId("start-second-half"));
    expect(screen.getByTestId("period").textContent).toBe("Second half");
    play(40_000);
    expect(screen.getByTestId("period").textContent).toBe("Full time");
  });

  it("shows the score as goals are scored", () => {
    mountAction();
    fireEvent.click(screen.getByTestId("speed-4"));
    play(20_000);
    fireEvent.click(screen.getByTestId("start-second-half"));
    play(40_000);
    const [home, away] = (screen.getByTestId("score").textContent ?? "").split(" – ").map(Number);
    expect((home ?? -1) >= 0 && (away ?? -1) >= 0).toBe(true);
  });

  it("applies the half-time plan and reports the engine version", () => {
    const onContinue = vi.fn();
    const { career, fixture } = anActionMatchSetup();
    const starter = career.squadPlan.starters[0] ?? "";
    const editor = {
      players: career.league.players,
      starters: career.squadPlan.starters,
      bench: career.squadPlan.bench,
      condition: {},
      tactics: career.squadPlan.tactics,
      plan: () => ({
        ok: true as const,
        change: { side: "home" as const, tactics: NEUTRAL_TACTICS },
        report: { minutes: { [starter]: 45 } },
        lineupAfter: career.squadPlan,
      }),
    };
    mountAction({
      // biome-ignore lint/suspicious/noExplicitAny: a minimal fake editor for this test
      halfTimeEditor: editor as any,
      onContinue,
    });
    expect(fixture).toBeTruthy();
    fireEvent.click(screen.getByTestId("speed-4"));
    play(20_000);
    fireEvent.click(screen.getByTestId("sub-add"));
    fireEvent.click(screen.getByTestId("start-second-half"));
    play(40_000);
    fireEvent.click(screen.getByTestId("continue"));
    expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({ engineVersion: 2 }), {
      minutes: { [starter]: 45 },
    });
  });

  it("shows the stats rows of the action engine", () => {
    mountAction();
    for (const id of [
      "possession",
      "shots",
      "shotsOnTarget",
      "xg",
      "corners",
      "fouls",
      "passes",
      "passCompletion",
      "keyPasses",
    ]) {
      expect(screen.getByTestId(`stat-${id}`), id).toBeTruthy();
    }
    expect(screen.queryByTestId("stat-fieldTilt")).toBeNull();
  });

  it("shows the player ratings table only at full time, with the user's side first", () => {
    const { setup } = anActionMatchSetup();
    render(
      <I18nProvider store={createMemoryLocaleStore("en")}>
        <MatchScreen {...setup} userSide="away" createRenderer={fakeRenderer} tickMs={1000} />
      </I18nProvider>,
    );
    expect(screen.queryByTestId("player-ratings")).toBeNull();
    fireEvent.click(screen.getByTestId("speed-4"));
    play(20_000);
    fireEvent.click(screen.getByTestId("start-second-half"));
    play(40_000);
    const table = screen.getByTestId("player-ratings");
    const rows = within(table).getAllByTestId(/^rating-row-/);
    expect(rows).toHaveLength(22);
    expect(rows.slice(0, 11).every((r) => r.getAttribute("data-side") === "away")).toBe(true);
    expect(within(table).getAllByTestId("player-of-the-match")).toHaveLength(1);
    expect(screen.getByTestId("full-time-report")).toBeTruthy();
    const outcome = screen.getByTestId("match-outcome").getAttribute("data-outcome");
    expect(["win", "draw", "defeat"]).toContain(outcome);
    const names = new Set(Object.values(setup.players));
    for (const row of rows) {
      expect([...names].some((name) => row.textContent?.includes(name))).toBe(true);
      expect(row.textContent).toMatch(/\d\.\d/);
    }
  });

  it("shows the Swedish labels in Swedish", () => {
    mountAction({}, "sv");
    expect(screen.getByTestId("period").textContent).toBe("Första halvlek");
  });

  describe("kits worn", () => {
    const clashingSetup = () => {
      const { career, fixture } = anActionMatchSetup();
      const clubs = career.league.clubs.map((c) =>
        c.id === fixture.homeClubId
          ? { ...c, colours: { primary: "#d62828", secondary: "#ffffff" } }
          : c.id === fixture.awayClubId
            ? { ...c, colours: { primary: "#c02020", secondary: "#111111" } }
            : c,
      );
      return matchSetupFor({ ...career, league: { ...career.league, clubs } }, fixture);
    };

    it("shows the clashing away side in its away kit on the scoreboard, terrain and pitch", () => {
      const setup = clashingSetup();
      const terrain = vi.fn((_host: unknown, _opts: unknown) => fakeRenderer());
      const pitch = vi.fn((_host: unknown, _opts: unknown) => ({
        resize: vi.fn(),
        render: vi.fn(),
        dispose: vi.fn(),
      }));
      window.sessionStorage.clear();
      render(
        <I18nProvider store={createMemoryLocaleStore("en")}>
          <MatchScreen
            {...setup}
            createRenderer={terrain}
            createPitchRenderer={pitch}
            tickMs={1000}
          />
        </I18nProvider>,
      );
      expect(screen.getByTestId("away-bar").style.background).toBe("rgb(17, 17, 17)");
      expect(screen.getByTestId("home-bar").style.background).toBe("rgb(214, 40, 40)");
      const [homeBar, awayBar] = Array.from(
        screen.getByTestId("stat-shots").querySelectorAll<HTMLElement>("span[style]"),
      );
      expect(homeBar?.style.background).toBe("rgb(214, 40, 40)");
      expect(awayBar?.style.background).toBe("rgb(17, 17, 17)");
      expect(terrain.mock.calls[0]?.[1]).toMatchObject({ awayColour: "#111111" });
      fireEvent.click(screen.getByTestId("view-pitch"));
      expect(pitch.mock.calls[0]?.[1]).toMatchObject({ awayColour: "#111111" });
    });
  });
});
