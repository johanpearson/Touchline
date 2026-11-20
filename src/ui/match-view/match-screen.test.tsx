import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryLocaleStore } from "../../platform";
import { I18nProvider } from "../i18n-provider";
import { changesSourceFor } from "../match-changes-source";
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
    window.localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const mountAction = (
    props: Partial<
      Pick<MatchScreenProps, "changesSource" | "onContinue" | "userSide" | "onProgress">
    > = {},
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

  it("plays a match through in less time in Highlights than in Full match", () => {
    mountAction();
    fireEvent.click(screen.getByTestId("mode-highlights"));
    play(20_000);
    const highlights = Number.parseInt(clockText() ?? "0", 10);
    cleanup();
    mountAction();
    fireEvent.click(screen.getByTestId("mode-full"));
    play(20_000);
    expect(highlights).toBeGreaterThan(Number.parseInt(clockText() ?? "0", 10));
  });

  it("starts in Extended mode and remembers a chosen mode for the next match", () => {
    mountAction();
    expect(screen.getByTestId("mode-extended").getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByTestId("mode-full"));
    cleanup();
    mountAction();
    expect(screen.getByTestId("mode-full").getAttribute("aria-checked")).toBe("true");
  });

  /** A match screen with changes, for the user's side of the fixture. */
  const mountWithChanges = (onContinue = vi.fn()) => {
    const { career, fixture } = anActionMatchSetup();
    const userSide = fixture.homeClubId === career.userClubId ? "home" : "away";
    mountAction({ changesSource: changesSourceFor(career, fixture), userSide, onContinue });
    return { career, onContinue };
  };

  it("passes no report when nothing changed at half-time", () => {
    const { onContinue } = mountWithChanges();
    fireEvent.click(screen.getByTestId("mode-highlights"));
    play(150_000);
    fireEvent.click(screen.getByTestId("start-second-half"));
    play(150_000);
    fireEvent.click(screen.getByTestId("continue"));
    expect(onContinue).toHaveBeenCalledWith(
      expect.objectContaining({ engineVersion: 2 }),
      undefined,
    );
  });

  it("hands over the scorer of every goal with the final score", () => {
    const onContinue = vi.fn();
    mountAction({ onContinue });
    fireEvent.click(screen.getByTestId("mode-highlights"));
    play(150_000);
    fireEvent.click(screen.getByTestId("start-second-half"));
    play(150_000);
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
      expect(screen.getByTestId("mode-extended")).toBeTruthy();
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
    fireEvent.click(screen.getByTestId("mode-highlights"));
    play(150_000);
    expect(screen.getByTestId("stat-possession").textContent).toMatch(/\d/);
    expect(screen.getAllByTestId("feed-line").length).toBeGreaterThan(0);
  });

  it("stops at half-time, starts the second half and plays on to full time", () => {
    mountAction();
    fireEvent.click(screen.getByTestId("mode-highlights"));
    play(150_000);
    expect(screen.getByTestId("period").textContent).toBe("Half-time");
    expect(screen.getByTestId("half-time-score")).toBeTruthy();
    fireEvent.click(screen.getByTestId("start-second-half"));
    expect(screen.getByTestId("period").textContent).toBe("Second half");
    play(150_000);
    expect(screen.getByTestId("period").textContent).toBe("Full time");
  });

  it("shows the score as goals are scored", () => {
    mountAction();
    fireEvent.click(screen.getByTestId("mode-highlights"));
    play(150_000);
    fireEvent.click(screen.getByTestId("start-second-half"));
    play(150_000);
    const [home, away] = (screen.getByTestId("score").textContent ?? "").split(" – ").map(Number);
    expect((home ?? -1) >= 0 && (away ?? -1) >= 0).toBe(true);
  });

  /** Substitutes the second starter for the first bench player in the open sheet. */
  const substitute = (career: { squadPlan: { starters: string[]; bench: string[] } }) => {
    const off = career.squadPlan.starters[1] ?? "";
    const on = career.squadPlan.bench[0] ?? "";
    fireEvent.click(screen.getByTestId("sub-add"));
    fireEvent.click(screen.getByTestId(`pick-${off}`));
    fireEvent.click(screen.getByTestId(`pick-${on}`));
    return { off, on };
  };

  it("applies the half-time plan and reports minutes and the engine version", () => {
    const { career, onContinue } = mountWithChanges();
    fireEvent.click(screen.getByTestId("mode-highlights"));
    play(150_000);
    fireEvent.click(screen.getByTestId("make-changes"));
    const { off, on } = substitute(career);
    fireEvent.click(screen.getByTestId("start-second-half"));
    play(150_000);
    fireEvent.click(screen.getByTestId("continue"));
    const report = onContinue.mock.calls[0]?.[1];
    expect(onContinue.mock.calls[0]?.[0]).toMatchObject({ engineVersion: 2 });
    expect(report.minutes[off]).toBe(45);
    expect(report.minutes[on]).toBe(45);
    expect(report.opponent.minutes).toEqual(expect.any(Object));
  });

  describe("changes while the match is paused", () => {
    /** Plays on second by second until a feed line matches; the line shows when the clock reaches the change. */
    const feedShows = (pattern: RegExp): boolean => {
      for (let i = 0; i < 30; i++) {
        const lines = screen.getAllByTestId("feed-line").map((l) => l.textContent ?? "");
        if (lines.some((line) => pattern.test(line))) return true;
        play(1000);
      }
      return false;
    };

    /** Plays into the second half, pauses and opens the changes sheet. */
    const pauseInSecondHalf = () => {
      fireEvent.click(screen.getByTestId("mode-highlights"));
      play(150_000);
      fireEvent.click(screen.getByTestId("start-second-half"));
      play(40_000);
      fireEvent.click(screen.getByTestId("pause-toggle"));
    };

    it("keeps Make changes disabled while the match runs, with the reason", () => {
      mountWithChanges();
      play(10_000);
      const button = screen.getByTestId("make-changes");
      expect(button.getAttribute("aria-disabled")).toBe("true");
      const hint = document.getElementById(button.getAttribute("aria-describedby") ?? "");
      expect(hint?.textContent).toBe("Pause the match to make changes.");
    });

    it("enables Make changes when paused and applies a substitution at that minute", () => {
      const { career, onContinue } = mountWithChanges();
      pauseInSecondHalf();
      expect(screen.getByTestId("make-changes").getAttribute("aria-disabled")).toBeNull();
      fireEvent.click(screen.getByTestId("make-changes"));
      expect(screen.getByTestId("window-count").textContent).toBe(
        "3 substitution windows left besides half-time",
      );
      const { off, on } = substitute(career);
      fireEvent.click(screen.getByTestId("apply-changes"));
      expect(screen.queryByRole("dialog")).toBeNull();
      fireEvent.click(screen.getByTestId("pause-toggle"));
      expect(feedShows(/Substitution: .* on for /)).toBe(true);
      expect(screen.getAllByTestId("momentum-change")).toHaveLength(1);
      play(150_000);
      fireEvent.click(screen.getByTestId("continue"));
      const { minutes } = onContinue.mock.calls[0]?.[1] ?? { minutes: {} };
      expect(minutes[off]).toBeGreaterThan(45);
      expect(minutes[off]).toBeLessThan(90);
      expect(minutes[off] + minutes[on]).toBe(90);
    });

    it("keeps Apply changes disabled until something is changed", () => {
      mountWithChanges();
      pauseInSecondHalf();
      fireEvent.click(screen.getByTestId("make-changes"));
      expect((screen.getByTestId("apply-changes") as HTMLButtonElement).disabled).toBe(true);
    });

    it("applies new tactics and a shout while paused and writes them in the feed", () => {
      mountWithChanges();
      pauseInSecondHalf();
      fireEvent.click(screen.getByTestId("make-changes"));
      fireEvent.click(screen.getByTestId("shout-pushUp"));
      fireEvent.click(
        within(screen.getByTestId("tactic-pressing")).getByRole("radio", { name: "High" }),
      );
      fireEvent.click(screen.getByTestId("apply-changes"));
      fireEvent.click(screen.getByTestId("pause-toggle"));
      expect(feedShows(/Shout: Push up/)).toBe(true);
      expect(feedShows(/Tactics changed: Pressing: High/)).toBe(true);
    });

    it("says why a second shout cannot be given right after the first", () => {
      mountWithChanges();
      pauseInSecondHalf();
      fireEvent.click(screen.getByTestId("make-changes"));
      fireEvent.click(screen.getByTestId("shout-pushUp"));
      fireEvent.click(screen.getByTestId("apply-changes"));
      fireEvent.click(screen.getByTestId("make-changes"));
      expect(screen.getByTestId("shout-holdShape").getAttribute("aria-disabled")).toBe("true");
      expect(screen.getAllByText("A shout is already in force.").length).toBeGreaterThan(0);
    });

    it("puts the base tactics back with an empty change when a shout runs out", () => {
      const onProgress = vi.fn();
      const { career, fixture } = anActionMatchSetup();
      mountAction({
        changesSource: changesSourceFor(career, fixture),
        userSide: fixture.homeClubId === career.userClubId ? "home" : "away",
        onProgress,
      } as Partial<MatchScreenProps>);
      fireEvent.click(screen.getByTestId("mode-highlights"));
      play(20_000);
      fireEvent.click(screen.getByTestId("pause-toggle"));
      fireEvent.click(screen.getByTestId("make-changes"));
      fireEvent.click(screen.getByTestId("shout-pushUp"));
      fireEvent.click(screen.getByTestId("apply-changes"));
      fireEvent.click(screen.getByTestId("pause-toggle"));
      play(60_000);
      const edits = onProgress.mock.calls.at(-1)?.[0].edits;
      expect(edits).toHaveLength(2);
      expect(edits[0].shout).toBe("pushUp");
      expect(edits[1].shout).toBeUndefined();
      expect(edits[1].minute).toBeGreaterThanOrEqual(edits[0].minute + 10);
      // The empty change that ends the shout is not drawn as a change.
      expect(screen.getAllByTestId("momentum-change")).toHaveLength(1);
    });

    it("offers no changes after full time and says so", () => {
      mountWithChanges();
      fireEvent.click(screen.getByTestId("mode-highlights"));
      play(150_000);
      fireEvent.click(screen.getByTestId("start-second-half"));
      play(150_000);
      const button = screen.getByTestId("make-changes");
      expect(button.getAttribute("aria-disabled")).toBe("true");
      const hint = document.getElementById(button.getAttribute("aria-describedby") ?? "");
      expect(hint?.textContent).toBe("The match is over.");
    });
  });

  describe("live energy in the lineups", () => {
    const energyOf = (id: string): number =>
      Number(
        screen.getByTestId(`lineup-row-${id}`).querySelector('[data-testid="fitness-value"]')
          ?.textContent,
      );

    it("lowers a player's energy as the match goes on, at the clock", () => {
      const { career } = mountWithChanges();
      const starter = career.squadPlan.starters[3] ?? "";
      fireEvent.click(screen.getByTestId("lineups-open"));
      expect(energyOf(starter)).toBe(100);
      fireEvent.click(screen.getByTestId("mode-full"));
      play(60_000);
      const early = energyOf(starter);
      play(120_000);
      expect(early).toBeLessThanOrEqual(100);
      expect(energyOf(starter)).toBeLessThan(early);
    });

    it("moves a substituted-off player to the end, greyed, and brings the substitute on at full energy", () => {
      const { career } = mountWithChanges();
      fireEvent.click(screen.getByTestId("mode-highlights"));
      play(150_000);
      fireEvent.click(screen.getByTestId("make-changes"));
      const { off, on } = substitute(career);
      fireEvent.click(screen.getByTestId("start-second-half"));
      play(1000);
      fireEvent.click(screen.getByTestId("lineups-open"));
      expect(screen.getByTestId(`lineup-row-${on}`).getAttribute("data-status")).toBe("pitch");
      expect(screen.getByTestId(`lineup-row-${off}`).getAttribute("data-status")).toBe("off");
      expect(energyOf(on)).toBeGreaterThanOrEqual(99);
      expect(energyOf(off)).toBeLessThan(energyOf(on));
      const side = screen.getByTestId(`lineup-row-${off}`).parentElement;
      expect(side?.lastElementChild).toBe(screen.getByTestId(`lineup-row-${off}`));
    });

    it("shows at full time the energy the engine ended with, in the lineups and the report", () => {
      const onContinue = vi.fn();
      mountAction({ onContinue });
      fireEvent.click(screen.getByTestId("mode-highlights"));
      play(150_000);
      fireEvent.click(screen.getByTestId("start-second-half"));
      play(150_000);
      fireEvent.click(screen.getByTestId("lineups-open"));
      fireEvent.click(screen.getByTestId("continue"));
      const [finished] = onContinue.mock.calls[0] as [{ energy: Record<string, number> }];
      const [id, level] = Object.entries(finished.energy)[0] ?? ["", 0];
      expect(energyOf(id)).toBe(Math.round(level));
      expect(screen.getByTestId(`rating-row-${id}`)).toBeTruthy();
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
    fireEvent.click(screen.getByTestId("mode-highlights"));
    play(150_000);
    fireEvent.click(screen.getByTestId("start-second-half"));
    play(150_000);
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
