import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryLocaleStore } from "../../platform";
import { installBrowserStubs } from "../components/overlay-test-setup";
import { I18nProvider } from "../i18n-provider";
import { anActionMatchSetup } from "./action-match-fixture";
import { MatchScreen, type MatchScreenProps } from "./match-screen";

const renderer = () => ({ resize: vi.fn(), render: vi.fn(), dispose: vi.fn() });
const play = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe("match layout", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "setTimeout", "performance"] });
    window.sessionStorage.clear();
    window.localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  const mount = (props: Partial<MatchScreenProps> = {}, locale = "en") => {
    const { setup } = anActionMatchSetup();
    return render(
      <I18nProvider store={createMemoryLocaleStore(locale)}>
        <MatchScreen
          {...setup}
          createRenderer={renderer}
          createPitchRenderer={renderer}
          tickMs={1000}
          {...props}
        />
      </I18nProvider>,
    );
  };

  describe("wide screens", () => {
    it("shows stats and commentary stacked in the side panel, with lineups one click away", () => {
      installBrowserStubs();
      mount();
      const panel = screen.getByTestId("match-side-panel");
      expect(panel.contains(screen.getByTestId("stats-panel"))).toBe(true);
      expect(panel.contains(screen.getByTestId("feed"))).toBe(true);
      expect(screen.queryByRole("tab")).toBeNull();
      expect(screen.queryByTestId("lineups-panel")).toBeNull();
      fireEvent.click(screen.getByTestId("lineups-open"));
      expect(screen.getByTestId("lineups-panel")).toBeTruthy();
      expect(screen.getByTestId("lineup-home").children).toHaveLength(11);
      expect(screen.getByTestId("lineup-away").children).toHaveLength(11);
    });

    it("lists a live rating for every player in the lineups", () => {
      installBrowserStubs();
      mount();
      play(150_000);
      fireEvent.click(screen.getByTestId("lineups-open"));
      for (const row of screen.getAllByTestId(/^lineup-row-/)) {
        expect(row.textContent).toMatch(/\d[.,]\d$/);
      }
    });
  });

  describe("narrow screens", () => {
    beforeEach(() => installBrowserStubs({ phone: true }));

    it("turns the side panel into tabs: Stats, Feed, Lineups", () => {
      mount();
      const tabs = screen.getAllByRole("tab").map((tab) => tab.textContent);
      expect(tabs).toEqual(["Stats", "Feed", "Lineups"]);
      expect(screen.getByTestId("stats-panel")).toBeTruthy();
      expect(screen.queryByTestId("feed")).toBeNull();
      fireEvent.mouseDown(screen.getByTestId("panel-tab-feed"), { button: 0 });
      expect(screen.getByTestId("feed")).toBeTruthy();
      expect(screen.queryByTestId("stats-panel")).toBeNull();
    });

    it("uses the Tabs component, so the tab list is named and has one selected tab", () => {
      mount();
      expect(screen.getByRole("tablist").getAttribute("aria-label")).toBe("Match details");
      expect(
        screen.getAllByRole("tab").filter((tab) => tab.getAttribute("aria-selected") === "true"),
      ).toHaveLength(1);
    });

    it("shows the lineups in their tab", () => {
      mount();
      fireEvent.mouseDown(screen.getByTestId("panel-tab-lineups"), { button: 0 });
      expect(screen.getByTestId("lineups-panel")).toBeTruthy();
    });
  });

  describe("keyboard", () => {
    beforeEach(() => installBrowserStubs());

    it("pauses and resumes the match with Space", () => {
      mount();
      expect(screen.getByTestId("pause-toggle").textContent).toBe("Pause");
      fireEvent.keyDown(document.body, { key: " " });
      expect(screen.getByTestId("pause-toggle").textContent).toBe("Play");
      fireEvent.keyDown(document.body, { key: " " });
      expect(screen.getByTestId("pause-toggle").textContent).toBe("Pause");
    });

    it("documents the shortcut on the pause button", () => {
      mount();
      expect(screen.getByTestId("pause-toggle").getAttribute("aria-keyshortcuts")).toBe("Space");
    });

    it("exposes the view and mode as radio groups with a single tab stop", () => {
      mount();
      const radios = screen.getAllByRole("radio");
      expect(radios.filter((r) => r.getAttribute("tabindex") === "0")).toHaveLength(2);
      fireEvent.keyDown(screen.getByTestId("mode-extended"), { key: "ArrowRight" });
      expect(screen.getByTestId("mode-full").getAttribute("aria-checked")).toBe("true");
    });
  });

  describe("Make changes", () => {
    beforeEach(() => installBrowserStubs());

    it("is unavailable without changes and explains why", () => {
      mount();
      const button = screen.getByTestId("make-changes");
      expect(button.getAttribute("aria-disabled")).toBe("true");
      expect(button.getAttribute("aria-describedby")).toBeTruthy();
    });
  });

  describe("text alternatives", () => {
    beforeEach(() => installBrowserStubs());

    it("describes the stage with the score and who attacks", () => {
      mount();
      const { setup } = anActionMatchSetup();
      const home = setup.input.home.name;
      const label = screen.getByTestId("momentum-terrain").getAttribute("aria-label") ?? "";
      expect(label).toContain("Momentum terrain");
      expect(label).toContain(`${home} 0`);
      expect(label).toMatch(/attack|even/);
    });

    it("describes the 2D pitch too", () => {
      mount();
      fireEvent.click(screen.getByTestId("view-pitch"));
      expect(screen.getByTestId("classic-pitch").getAttribute("aria-label")).toContain("2D pitch");
    });

    it("labels the momentum chart as a graphic with a summary", () => {
      mount();
      const chart = screen.getByTestId("momentum-chart");
      expect(chart.getAttribute("role")).toBe("img");
      expect(chart.getAttribute("aria-label")).toMatch(/Momentum chart.*(attack|even)/);
    });
  });

  describe("leaving", () => {
    beforeEach(() => installBrowserStubs());

    it("has no back link unless the screen is told where it leads", () => {
      mount();
      expect(screen.queryByTestId("leave-match")).toBeNull();
    });

    it("hands the leave request to the screen, which asks when the match is on", () => {
      const onLeave = vi.fn();
      mount({ onLeave });
      fireEvent.click(screen.getByTestId("leave-match"));
      expect(onLeave).toHaveBeenCalledTimes(1);
    });
  });

  describe("goals", () => {
    beforeEach(() => installBrowserStubs());

    it("highlights the scoreboard and announces the goal, then clears it", () => {
      mount();
      fireEvent.click(screen.getByTestId("mode-highlights"));
      let announced = "";
      for (let i = 0; i < 400 && !announced; i++) {
        play(1000);
        announced = screen.getByTestId("goal-announcement").textContent ?? "";
      }
      expect(announced).toMatch(/^Goal for /);
      expect(screen.getByTestId("scoreboard").getAttribute("data-goal")).toMatch(/home|away/);
      fireEvent.click(screen.getByTestId("pause-toggle"));
      play(5000);
      expect(screen.getByTestId("scoreboard").getAttribute("data-goal")).toBeNull();
      expect(screen.getByTestId("goal-announcement").textContent).toBe("");
    });
  });
});
