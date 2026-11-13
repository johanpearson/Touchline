import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import type { CommentaryLine } from "../../commentary";
import type { MatchEvent, MatchStats } from "../../engine";
import { createMemoryLocaleStore } from "../../platform";
import { I18nProvider } from "../i18n-provider";
import { MatchFeed } from "./match-feed";
import { MomentumChart } from "./momentum-chart";
import { Scoreboard } from "./scoreboard";
import { SpeedControls } from "./speed-controls";
import { StatsPanel } from "./stats-panel";

const inLocale = (ui: ReactNode, locale = "en") =>
  render(<I18nProvider store={createMemoryLocaleStore(locale)}>{ui}</I18nProvider>);

const event = (overrides: Partial<MatchEvent> & { time: number }): MatchEvent =>
  ({
    type: "progress",
    team: "home",
    position: { x: 0.6, y: 0.5 },
    intensity: 0.5,
    ...overrides,
  }) as MatchEvent;

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

  it("colours each team name with its team colour", () => {
    inLocale(<Scoreboard {...props} />);
    expect(screen.getByTestId("home-name").style.borderColor).toBe("rgb(255, 0, 0)");
    expect(screen.getByTestId("away-name").style.borderColor).toBe("rgb(0, 0, 255)");
  });

  it("names the period in Swedish", () => {
    inLocale(<Scoreboard {...props} period="halfTime" />, "sv");
    expect(screen.getByTestId("period").textContent).toBe("Halvtid");
  });
});

describe("StatsPanel", () => {
  afterEach(cleanup);
  const stats: MatchStats = {
    possession: { home: 0.6, away: 0.4 },
    fieldTilt: { home: 0.55, away: 0.45 },
    shots: { home: 7, away: 3 },
    shotsOnTarget: { home: 4, away: 1 },
    xg: { home: 1.234, away: 0.5 },
    corners: { home: 5, away: 2 },
  };
  const valuesOf = (id: string) =>
    within(screen.getByTestId(`stat-${id}`))
      .getAllByRole("definition")
      .map((node) => node.textContent);

  it("shows possession, tilt, shots, shots on target, xG and corners for both teams", () => {
    inLocale(<StatsPanel stats={stats} />);
    expect(valuesOf("possession")).toEqual(["60%", "40%"]);
    expect(valuesOf("fieldTilt")).toEqual(["55%", "45%"]);
    expect(valuesOf("shots")).toEqual(["7", "3"]);
    expect(valuesOf("shotsOnTarget")).toEqual(["4", "1"]);
    expect(valuesOf("xg")).toEqual(["1.23", "0.50"]);
    expect(valuesOf("corners")).toEqual(["5", "2"]);
  });

  it("labels the rows in the active language", () => {
    inLocale(<StatsPanel stats={stats} />, "sv");
    expect(screen.getByText("Bollinnehav")).toBeTruthy();
    expect(screen.getByText("Hörnor")).toBeTruthy();
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
      .map((li) => (li.querySelector(".dot") as HTMLElement).style.background);
    expect(dots).toEqual(["currentcolor", "rgb(0, 0, 255)", "rgb(255, 0, 0)"]);
  });

  it("gives big lines an accent in the scoring team's colour and normal lines none", () => {
    const lines = [
      line(60, "plain"),
      line(120, "GOAL", { importance: "big", kind: "goal", team: "away" }),
    ];
    inLocale(<MatchFeed lines={lines} events={[]} matchTime={600} {...colours} />);
    const [big, plain] = screen.getAllByTestId("feed-line");
    expect((big as HTMLElement).style.borderLeft).toContain("rgb(0, 0, 255)");
    expect((plain as HTMLElement).style.borderLeft).toBe("");
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
    const css = readFileSync(join(process.cwd(), "src/ui/match-view/match-screen.css"), "utf8");
    const block = css.match(/@media \(prefers-reduced-motion: no-preference\) \{([\s\S]*?)\n\}/);
    expect(block?.[1]).toContain("@keyframes feed-in");
    expect(block?.[1]).toContain(".feed li");
    expect(css.replace(block?.[0] ?? "", "")).not.toContain("animation");
  });

  it("prefixes each line with its minute", () => {
    inLocale(<MatchFeed lines={[line(750, "x")]} events={[]} matchTime={800} {...colours} />);
    expect(screen.getByTestId("feed-line").textContent).toContain("12’");
  });
});

describe("SpeedControls", () => {
  afterEach(cleanup);

  it("toggles pause and play", () => {
    const calls: boolean[] = [];
    inLocale(
      <SpeedControls
        paused={false}
        speed={60}
        onPausedChange={(p) => calls.push(p)}
        onSpeedChange={() => {}}
      />,
    );
    expect(screen.getByTestId("pause-toggle").textContent).toBe("Pause");
    fireEvent.click(screen.getByTestId("pause-toggle"));
    expect(calls).toEqual([true]);
  });

  it("offers play while paused", () => {
    inLocale(
      <SpeedControls paused speed={60} onPausedChange={() => {}} onSpeedChange={() => {}} />,
      "sv",
    );
    expect(screen.getByTestId("pause-toggle").textContent).toBe("Spela");
  });

  it("marks the current speed and reports a chosen one", () => {
    const speeds: number[] = [];
    inLocale(
      <SpeedControls
        paused={false}
        speed={60}
        onPausedChange={() => {}}
        onSpeedChange={(s) => speeds.push(s)}
      />,
    );
    expect(screen.getByTestId("speed-2").getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(screen.getByTestId("speed-4"));
    expect(speeds).toEqual([240]);
  });
});
