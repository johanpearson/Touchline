import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CommentaryLine } from "../../commentary";
import type { ZoneEvent } from "../../engine";
import { createMemoryLocaleStore } from "../../platform";
import { I18nProvider } from "../i18n-provider";
import { ActionStatsPanel } from "./action-stats-panel";
import { MatchControls, type MatchControlsProps } from "./match-controls";
import { MatchFeed } from "./match-feed";
import { MomentumChart } from "./momentum-chart";
import { PlayerRatings } from "./player-ratings";
import { Scoreboard } from "./scoreboard";

const inLocale = (ui: ReactNode, locale = "en") =>
  render(<I18nProvider store={createMemoryLocaleStore(locale)}>{ui}</I18nProvider>);

const event = (overrides: Partial<ZoneEvent> & { time: number }): ZoneEvent =>
  ({
    type: "progress",
    team: "home",
    position: { x: 0.6, y: 0.5 },
    intensity: 0.5,
    ...overrides,
  }) as ZoneEvent;

describe("Scoreboard", () => {
  afterEach(cleanup);
  const props = {
    homeName: "Kvarnby",
    awayName: "Västerås",
    homeColour: "#f00",
    awayColour: "#00f",
    score: { home: 2, away: 1 },
    period: "secondHalf" as const,
    matchTime: 3000,
    events: [
      event({ type: "periodChange", period: "halfTime", time: 2880, intensity: 0 } as never),
    ],
  };

  it("shows both team names, the score, the period and the clock", () => {
    inLocale(<Scoreboard {...props} />);
    expect(screen.getByTestId("home-name").textContent).toBe("Kvarnby");
    expect(screen.getByTestId("away-name").textContent).toBe("Västerås");
    expect(screen.getByTestId("score").textContent).toBe("2 – 1");
    expect(screen.getByTestId("period").textContent).toBe("Second half");
    expect(screen.getByTestId("clock").textContent).toBe("47’");
  });

  it("shows the worn kit colour of each team as its side bar", () => {
    inLocale(<Scoreboard {...props} />);
    expect(screen.getByTestId("home-bar").style.background).toBe("rgb(255, 0, 0)");
    expect(screen.getByTestId("away-bar").style.background).toBe("rgb(0, 0, 255)");
  });

  it("gives club names a title for when they are truncated, and never the score", () => {
    inLocale(<Scoreboard {...props} />);
    expect(screen.getByTestId("home-name").getAttribute("title")).toBe("Kvarnby");
    expect(screen.getByTestId("score").getAttribute("title")).toBeNull();
    expect(screen.getByTestId("score").className).toContain("whitespace-nowrap");
  });

  it("names the period in Swedish", () => {
    inLocale(<Scoreboard {...props} period="halfTime" />, "sv");
    expect(screen.getByTestId("period").textContent).toBe("Halvtid");
  });
});

describe("MomentumChart", () => {
  afterEach(cleanup);

  it("draws home pressure and away pressure as separate bars in the team colours", () => {
    const events = [event({ time: 10, team: "home" }), event({ time: 400, team: "away" })];
    inLocale(<MomentumChart events={events} matchTime={600} homeColour="#f00" awayColour="#00f" />);
    const chart = screen.getByTestId("momentum-chart");
    const home = chart.querySelector('rect[data-side="home"]');
    const away = chart.querySelector('rect[data-side="away"]');
    expect(home?.getAttribute("fill")).toBe("#f00");
    expect(away?.getAttribute("fill")).toBe("#00f");
  });

  it("has an accessible description", () => {
    inLocale(<MomentumChart events={[]} matchTime={600} homeColour="#f00" awayColour="#00f" />);
    expect(screen.getByRole("img", { name: /Momentum chart/ })).toBeTruthy();
  });
});

describe("MatchFeed", () => {
  afterEach(cleanup);
  const line = (
    time: number,
    text: string,
    over: Partial<CommentaryLine> = {},
  ): CommentaryLine => ({
    time,
    kind: "chance",
    team: "home",
    importance: "normal",
    text,
    ...over,
  });
  const colours = { homeColour: "#f00", awayColour: "#00f" };

  it("shows the latest lines first and at most six", () => {
    const lines = Array.from({ length: 8 }, (_, i) => line(i * 60, `line ${i}`));
    inLocale(<MatchFeed lines={lines} events={[]} matchTime={600} {...colours} />);
    const shown = screen.getAllByTestId("feed-line").map((li) => li.textContent);
    expect(shown).toHaveLength(6);
    expect(shown[0]).toContain("line 7");
    expect(shown[5]).toContain("line 2");
  });

  it("hides lines from the future", () => {
    const lines = [line(60, "early"), line(900, "late")];
    inLocale(<MatchFeed lines={lines} events={[]} matchTime={120} {...colours} />);
    expect(screen.getAllByTestId("feed-line")).toHaveLength(1);
  });

  it("marks big lines for highlighting", () => {
    const lines = [line(60, "GOAL", { importance: "big", kind: "goal" })];
    inLocale(<MatchFeed lines={lines} events={[]} matchTime={120} {...colours} />);
    expect(screen.getByTestId("feed-line").getAttribute("data-importance")).toBe("big");
  });

  it("colours the dot with the team colour and neutral lines with the text colour", () => {
    const lines = [
      line(60, "home line"),
      line(120, "away line", { team: "away" }),
      line(180, "even", { team: undefined }),
    ];
    inLocale(<MatchFeed lines={lines} events={[]} matchTime={600} {...colours} />);
    const dots = screen
      .getAllByTestId("feed-line")
      .map((li) => (li.querySelector("span[aria-hidden]") as HTMLElement).style.background);
    expect(dots).toEqual(["currentcolor", "rgb(0, 0, 255)", "rgb(255, 0, 0)"]);
  });

  it("gives big lines an accent in the scoring team's colour and normal lines none", () => {
    const lines = [
      line(60, "plain"),
      line(120, "GOAL", { importance: "big", kind: "goal", team: "away" }),
    ];
    inLocale(<MatchFeed lines={lines} events={[]} matchTime={600} {...colours} />);
    const [big, plain] = screen.getAllByTestId("feed-line");
    expect((big as HTMLElement).style.borderLeftColor).toBe("rgb(0, 0, 255)");
    expect((plain as HTMLElement).style.borderLeftColor).toBe("");
  });

  it("shows new lines when the line list grows", () => {
    const first = [line(60, "one")];
    const view = inLocale(<MatchFeed lines={first} events={[]} matchTime={600} {...colours} />);
    expect(screen.getAllByTestId("feed-line")).toHaveLength(1);
    view.rerender(
      <I18nProvider store={createMemoryLocaleStore("en")}>
        <MatchFeed lines={[...first, line(120, "two")]} events={[]} matchTime={600} {...colours} />
      </I18nProvider>,
    );
    expect(screen.getAllByTestId("feed-line")).toHaveLength(2);
  });

  it("animates new lines in only when the user has not asked for reduced motion", () => {
    inLocale(<MatchFeed lines={[line(60, "x")]} events={[]} matchTime={600} {...colours} />);
    const classes = screen.getByTestId("feed-line").className.split(" ");
    expect(classes.filter((c) => c.includes("animate"))).toEqual(
      classes.filter((c) => c.startsWith("motion-safe:animate")),
    );
    expect(classes.some((c) => c.startsWith("motion-safe:animate"))).toBe(true);
  });

  it("announces only the newest goal or chance in a polite live region, not the whole feed", () => {
    const lines = [
      line(60, "a corner", { kind: "corner" }),
      line(120, "a big chance", { kind: "chance" }),
      line(180, "a throw-in", { kind: "turnover" }),
    ];
    inLocale(<MatchFeed lines={lines} events={[]} matchTime={600} {...colours} />);
    const live = screen.getByTestId("feed-live");
    expect(live.getAttribute("aria-live")).toBe("polite");
    expect(live.textContent).toBe("a big chance");
    expect(screen.getByTestId("feed").getAttribute("aria-live")).toBeNull();
  });

  it("prefixes each line with its minute", () => {
    inLocale(<MatchFeed lines={[line(750, "x")]} events={[]} matchTime={800} {...colours} />);
    expect(screen.getByTestId("feed-line").textContent).toContain("12’");
  });
});

describe("MatchControls", () => {
  afterEach(cleanup);
  const controls = (over: Partial<MatchControlsProps> = {}, locale = "en") =>
    inLocale(
      <MatchControls
        paused={false}
        speed={60}
        view="momentum"
        showChain
        canMakeChanges={false}
        onPausedChange={() => {}}
        onSpeedChange={() => {}}
        onViewChange={() => {}}
        onChainChange={() => {}}
        onMakeChanges={() => {}}
        {...over}
      />,
      locale,
    );

  it("toggles pause and play", () => {
    const calls: boolean[] = [];
    controls({ onPausedChange: (p) => calls.push(p) });
    expect(screen.getByTestId("pause-toggle").textContent).toBe("Pause");
    fireEvent.click(screen.getByTestId("pause-toggle"));
    expect(calls).toEqual([true]);
  });

  it("offers play while paused", () => {
    controls({ paused: true }, "sv");
    expect(screen.getByTestId("pause-toggle").textContent).toBe("Spela");
  });

  it("marks the current speed and reports a chosen one", () => {
    const speeds: number[] = [];
    controls({ onSpeedChange: (s) => speeds.push(s) });
    expect(screen.getByTestId("speed-2").getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByTestId("speed-4"));
    expect(speeds).toEqual([240]);
  });

  it("switches the view and shows the passing chain toggle only on the 2D pitch", () => {
    const views: string[] = [];
    controls({ onViewChange: (v) => views.push(v) });
    expect(screen.getByTestId("view-momentum").getAttribute("aria-checked")).toBe("true");
    expect(screen.queryByTestId("chain-toggle")).toBeNull();
    fireEvent.click(screen.getByTestId("view-pitch"));
    expect(views).toEqual(["pitch"]);
    cleanup();
    controls({ view: "pitch" });
    expect(screen.getByTestId("chain-toggle").getAttribute("aria-pressed")).toBe("true");
  });

  it("explains why Make changes is unavailable and does nothing when it is clicked", () => {
    const onMakeChanges = vi.fn();
    controls({ onMakeChanges });
    const button = screen.getByTestId("make-changes");
    expect(button.getAttribute("aria-disabled")).toBe("true");
    const hint = document.getElementById(button.getAttribute("aria-describedby") ?? "");
    expect(hint?.textContent).toBe("Changes are possible at half-time.");
    fireEvent.click(button);
    expect(onMakeChanges).not.toHaveBeenCalled();
  });

  it("makes Make changes available at half-time", () => {
    const onMakeChanges = vi.fn();
    controls({ canMakeChanges: true, onMakeChanges });
    const button = screen.getByTestId("make-changes");
    expect(button.getAttribute("aria-disabled")).toBeNull();
    fireEvent.click(button);
    expect(onMakeChanges).toHaveBeenCalledTimes(1);
  });
});

describe("ActionStatsPanel", () => {
  afterEach(cleanup);
  const teams = {
    possession: { home: 0.6, away: 0.4 },
    fieldTilt: { home: 0.5, away: 0.5 },
    shots: { home: 7, away: 3 },
    shotsOnTarget: { home: 4, away: 1 },
    xg: { home: 1.234, away: 0.5 },
    corners: { home: 5, away: 2 },
    fouls: { home: 9, away: 11 },
    throwIns: { home: 0, away: 0 },
    goalKicks: { home: 0, away: 0 },
    passes: { home: 400, away: 300 },
    completedPasses: { home: 340, away: 210 },
    passCompletion: { home: 0.85, away: 0.7 },
  };
  const line = (keyPasses: number) => ({
    passes: 0,
    completedPasses: 0,
    passCompletion: 0,
    keyPasses,
    shots: 0,
    shotsOnTarget: 0,
    xg: 0,
    goals: 0,
    tacklesWon: 0,
    interceptions: 0,
    clearances: 0,
    foulsCommitted: 0,
  });
  const stats = { teams, players: { h1: line(2), h2: line(1), a1: line(4) } };
  const playerIds = { home: ["h1", "h2"], away: ["a1"] };

  it("shows each stat as text for both sides, with key passes totalled per side", () => {
    inLocale(<ActionStatsPanel stats={stats} playerIds={playerIds} />);
    const text = (id: string) => screen.getByTestId(`stat-${id}`).textContent;
    expect(text("shots")).toBe("Shots73");
    expect(text("shotsOnTarget")).toBe("On target41");
    expect(text("xg")).toBe("xG1.230.50");
    expect(text("fouls")).toBe("Fouls911");
    expect(text("passes")).toBe("Passes400300");
    expect(text("keyPasses")).toBe("Key passes34");
    expect(text("passCompletion")).toContain("Pass completion");
    expect(text("possession")).toMatch(/60.*40/);
  });

  it("is translated to Swedish", () => {
    inLocale(<ActionStatsPanel stats={stats} playerIds={playerIds} />, "sv");
    expect(screen.getByTestId("stat-keyPasses").textContent).toContain("Nyckelpassningar");
  });
});

describe("PlayerRatings", () => {
  afterEach(cleanup);
  const rows = [
    {
      id: "h1",
      name: "Ek",
      side: "home" as const,
      rating: 7.46,
      goals: 1,
      keyPasses: 2,
      shots: 3,
      xg: 0.8,
      playerOfTheMatch: true,
    },
    {
      id: "a1",
      name: "Lind",
      side: "away" as const,
      rating: 6,
      goals: 0,
      keyPasses: 0,
      shots: 0,
      xg: 0,
      playerOfTheMatch: false,
    },
  ];

  it("lists rating with one decimal, the stats and the player of the match", () => {
    inLocale(<PlayerRatings rows={rows} teamNames={{ home: "Kvarnby", away: "Västerås" }} />);
    const first = screen.getByTestId("rating-row-h1").textContent ?? "";
    expect(first).toContain("Ek");
    expect(first).toContain("Kvarnby");
    expect(first).toContain("7.5");
    expect(screen.getByTestId("rating-row-a1").textContent).toContain("6.0");
    expect(screen.getAllByTestId("player-of-the-match")).toHaveLength(1);
    expect(screen.getByTestId("player-of-the-match").textContent).toContain("Player of the match");
  });

  it("uses Swedish labels and decimal comma", () => {
    inLocale(<PlayerRatings rows={rows} teamNames={{ home: "Kvarnby", away: "Västerås" }} />, "sv");
    expect(screen.getByTestId("player-ratings").textContent).toContain("Spelarbetyg");
    expect(screen.getByTestId("rating-row-h1").textContent).toContain("7,5");
  });
});
