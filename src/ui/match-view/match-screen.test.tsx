import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryLocaleStore } from "../../platform";
import { demoMatch } from "../demo-match";
import { I18nProvider } from "../i18n-provider";
import { MatchScreen } from "./match-screen";
import type { TerrainRenderer } from "./terrain-renderer";

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
