import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type MatchInputV1, NEUTRAL_TACTICS, type PerSide } from "../../engine";
import type { SquadPlayer } from "../../game";
import { createMemoryLocaleStore } from "../../platform";
import { I18nProvider } from "../i18n-provider";
import { anActionMatchSetup } from "./action-match-fixture";
import { MatchScreen, type MatchScreenProps } from "./match-screen";
import type { TerrainRenderer } from "./terrain-renderer";

// A fixed fictional fixture used only by these tests.
const demoMatch: {
  input: MatchInputV1;
  seed: number;
  colours: PerSide<string>;
  squads: PerSide<readonly SquadPlayer[]>;
} = {
  input: {
    home: {
      name: "Kvarnby",
      buildUp: 0.55,
      progression: 0.55,
      chanceCreation: 0.5,
      finishing: 0.5,
      pressing: 0.5,
      defending: 0.5,
      goalkeeping: 0.5,
    },
    away: {
      name: "Västerås Park",
      buildUp: 0.5,
      progression: 0.5,
      chanceCreation: 0.5,
      finishing: 0.5,
      pressing: 0.5,
      defending: 0.5,
      goalkeeping: 0.5,
    },
    homeTactics: NEUTRAL_TACTICS,
    awayTactics: NEUTRAL_TACTICS,
  },
  seed: 2026,
  colours: { home: "#ff4b5c", away: "#2f9bff" },
  squads: {
    home: [
      { name: "Elias Berg", position: "FWD", finishing: 0.7 },
      { name: "Oskar Lind", position: "MID", finishing: 0.55 },
      { name: "Nils Falk", position: "DEF", finishing: 0.4 },
    ],
    away: [
      { name: "Viktor Strand", position: "FWD", finishing: 0.65 },
      { name: "Anton Hed", position: "MID", finishing: 0.55 },
      { name: "Leo Sand", position: "DEF", finishing: 0.4 },
    ],
  },
};

const fakeRenderer = (): TerrainRenderer => ({
  resize: vi.fn(),
  render: vi.fn(),
  dispose: vi.fn(),
});

const mount = (locale = "en") =>
  render(
    <I18nProvider store={createMemoryLocaleStore(locale)}>
      <MatchScreen {...demoMatch} createRenderer={fakeRenderer} tickMs={1000} />
    </I18nProvider>,
  );

const clockText = () => screen.getByTestId("clock").textContent;
const play = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe("MatchScreen", () => {
  beforeEach(() => {
    // jsdom drives animation frames from setInterval, which the fake timers would run flat out.
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("starts at kickoff in the first half", () => {
    mount();
    expect(clockText()).toBe("0’");
    expect(screen.getByTestId("period").textContent).toBe("First half");
    expect(screen.getByTestId("score").textContent).toBe("0 – 0");
  });

  it("shows every panel", () => {
    mount();
    for (const id of ["scoreboard", "stats-panel", "momentum-chart", "feed", "momentum-terrain"]) {
      expect(screen.getByTestId(id)).toBeTruthy();
    }
  });

  it("advances the clock while playing", () => {
    mount();
    play(10_000);
    expect(clockText()).not.toBe("0’");
  });

  it("holds the clock while paused and continues after play", () => {
    mount();
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
    mount();
    fireEvent.click(screen.getByTestId("speed-1"));
    play(5000);
    expect(clockText()).toBe("2’");
    cleanup();
    mount();
    fireEvent.click(screen.getByTestId("speed-4"));
    play(5000);
    expect(clockText()).toBe("20’");
  });

  it("stops at half-time and waits there", () => {
    mount();
    fireEvent.click(screen.getByTestId("speed-4"));
    play(15_000);
    expect(screen.getByTestId("period").textContent).toBe("Half-time");
    const frozen = clockText();
    play(60_000);
    expect(clockText()).toBe(frozen);
  });

  it("shows the half-time overlay with the first-half stats at half-time", () => {
    mount();
    expect(screen.queryByTestId("half-time")).toBeNull();
    fireEvent.click(screen.getByTestId("speed-4"));
    play(15_000);
    expect(screen.getByTestId("half-time")).toBeTruthy();
    expect(screen.getByTestId("half-time-score")).toBeTruthy();
  });

  it("starts the second half when the button is clicked, and plays on to full time", () => {
    mount();
    fireEvent.click(screen.getByTestId("speed-4"));
    play(15_000);
    fireEvent.click(screen.getByTestId("start-second-half"));
    expect(screen.queryByTestId("half-time")).toBeNull();
    expect(screen.getByTestId("period").textContent).toBe("Second half");
    play(30_000);
    expect(screen.getByTestId("period").textContent).toBe("Full time");
    expect(screen.queryByTestId("half-time")).toBeNull();
  });

  it("fills the stats panel as the match is played", () => {
    mount();
    fireEvent.click(screen.getByTestId("speed-4"));
    play(10_000);
    const shots = screen.getByTestId("stat-shots").textContent ?? "";
    expect(shots).toMatch(/[1-9]/);
  });

  it("shows the feed in Swedish when the locale is Swedish", () => {
    mount("sv");
    expect(screen.getByText("Kommentarer")).toBeTruthy();
    expect(screen.getByTestId("period").textContent).toBe("Första halvlek");
  });
});

describe("MatchScreen half-time changes", () => {
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

  const editor = {
    players: [
      { id: "a", name: "Elias Berg", position: "FWD" },
      { id: "b", name: "Oskar Lind", position: "FWD" },
    ],
    starters: ["a"],
    bench: ["b"],
    condition: {},
    tactics: NEUTRAL_TACTICS,
    plan: (changes: { substitutions: { off: string; on: string }[] }) => ({
      ok: true as const,
      change: { side: "home" as const, tactics: NEUTRAL_TACTICS },
      report: { minutes: { a: changes.substitutions.length ? 45 : 90 } },
      lineupAfter: { formation: "4-4-2" as const, starters: ["b"], bench: ["a"] },
    }),
  };

  it("passes the half-time report to onContinue", () => {
    const onContinue = vi.fn();
    render(
      <I18nProvider store={createMemoryLocaleStore("en")}>
        <MatchScreen
          {...demoMatch}
          createRenderer={fakeRenderer}
          tickMs={1000}
          // biome-ignore lint/suspicious/noExplicitAny: a minimal fake editor for this test
          halfTimeEditor={editor as any}
          onContinue={onContinue}
        />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByTestId("speed-4"));
    act(() => vi.advanceTimersByTime(15_000));
    fireEvent.click(screen.getByTestId("sub-add"));
    fireEvent.click(screen.getByTestId("start-second-half"));
    act(() => vi.advanceTimersByTime(30_000));
    fireEvent.click(screen.getByTestId("continue"));
    expect(onContinue).toHaveBeenCalledWith(expect.objectContaining({ engineVersion: 1 }), {
      minutes: { a: 45 },
    });
  });

  it("passes no report when nothing changed at half-time", () => {
    const onContinue = vi.fn();
    render(
      <I18nProvider store={createMemoryLocaleStore("en")}>
        <MatchScreen
          {...demoMatch}
          createRenderer={fakeRenderer}
          tickMs={1000}
          // biome-ignore lint/suspicious/noExplicitAny: a minimal fake editor for this test
          halfTimeEditor={editor as any}
          onContinue={onContinue}
        />
      </I18nProvider>,
    );
    fireEvent.click(screen.getByTestId("speed-4"));
    act(() => vi.advanceTimersByTime(15_000));
    fireEvent.click(screen.getByTestId("start-second-half"));
    act(() => vi.advanceTimersByTime(30_000));
    fireEvent.click(screen.getByTestId("continue"));
    expect(onContinue).toHaveBeenCalledWith(
      expect.objectContaining({ engineVersion: 1 }),
      undefined,
    );
  });
});

describe("MatchScreen with the action engine", () => {
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
      expect(screen.getByTestId("view-pitch").textContent).toBe("Plan");
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

    it("is not offered for zone engine matches", () => {
      mount();
      expect(screen.queryByTestId("view-toggle")).toBeNull();
      expect(screen.getByTestId("momentum-terrain")).toBeTruthy();
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

  it("applies the half-time plan of the action engine and reports the engine version", () => {
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
        engineVersion: 2 as const,
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

  it("shows the Swedish labels in Swedish", () => {
    mountAction({}, "sv");
    expect(screen.getByTestId("period").textContent).toBe("Första halvlek");
  });
});
