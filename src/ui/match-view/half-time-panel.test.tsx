import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ActionStats } from "../../engine";
import {
  type Career,
  createCareer,
  EMPTY_MATCH_CHANGES,
  generateLeague,
  getNextFixture,
  MAX_SUBSTITUTIONS,
  type MatchChanges,
} from "../../game";
import { createMemoryLocaleStore } from "../../platform";
import { I18nProvider } from "../i18n-provider";
import { changesSourceFor } from "../match-changes-source";
import { type ChangesEditor, editorAt } from "./half-time-model";
import { HalfTimePanel } from "./half-time-panel";

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

const stats: ActionStats = {
  teams: {
    possession: { home: 0.6, away: 0.4 },
    fieldTilt: { home: 0.55, away: 0.45 },
    shots: { home: 5, away: 3 },
    shotsOnTarget: { home: 2, away: 1 },
    xg: { home: 0.8, away: 0.4 },
    corners: { home: 2, away: 1 },
    fouls: { home: 4, away: 6 },
    throwIns: { home: 0, away: 0 },
    goalKicks: { home: 0, away: 0 },
    passes: { home: 210, away: 150 },
    completedPasses: { home: 180, away: 105 },
    passCompletion: { home: 0.86, away: 0.7 },
  },
  players: { h1: line(2), a1: line(1) },
};
const playerIds = { home: ["h1"], away: ["a1"] };

const aCareer = (): Career => {
  const league = generateLeague({ seed: 5 });
  const clubId = league.ok ? (league.league.clubs[0]?.id ?? "") : "";
  const created = createCareer({ seed: 5, userClubId: clubId });
  if (!created.ok) throw new Error("career");
  return created.career;
};

const editorFor = (career: Career, previous: MatchChanges = EMPTY_MATCH_CHANGES): ChangesEditor => {
  const fixture = getNextFixture(career.season, career.userClubId);
  if (!fixture) throw new Error("fixture");
  return editorAt(changesSourceFor(career, fixture)(previous), {
    minute: 45,
    halfTime: true,
    energy: {},
  });
};

const mount = (onResume = vi.fn(), locale = "en", editor?: ChangesEditor) =>
  render(
    <I18nProvider store={createMemoryLocaleStore(locale)}>
      <HalfTimePanel
        homeName="Kvarnby"
        awayName="Västerås Park"
        score={{ home: 1, away: 0 }}
        stats={stats}
        playerIds={playerIds}
        onResume={onResume}
        editor={editor}
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
    expect(screen.getByTestId("stat-shots").textContent).toBe("Shots53");
  });

  it("shows the action stats rows, including passes, pass completion and key passes", () => {
    mount();
    expect(screen.getByTestId("stat-passes").textContent).toBe("Passes210150");
    expect(screen.getByTestId("stat-passCompletion").textContent).toBe("Pass completion86%70%");
    expect(screen.getByTestId("stat-keyPasses").textContent).toBe("Key passes21");
    expect(screen.queryByTestId("stat-fieldTilt")).toBeNull();
  });

  it("calls onResume when the start second half button is clicked", () => {
    const onResume = vi.fn();
    mount(onResume);
    fireEvent.click(screen.getByTestId("start-second-half"));
    expect(onResume).toHaveBeenCalledOnce();
  });

  it("shows no changes section without an editor", () => {
    mount();
    expect(screen.queryByTestId("half-time-changes")).toBeNull();
  });

  it("is in Swedish when the locale is Swedish", () => {
    mount(vi.fn(), "sv");
    expect(screen.getByTestId("start-second-half").textContent).toBe("Starta andra halvlek");
  });
});

describe("HalfTimePanel changes", () => {
  afterEach(cleanup);
  const career = aCareer();
  const editor = editorFor(career);
  const nameOf = (id: string) => career.league.players.find((p) => p.id === id)?.name;
  const positionOf = (id: string) => career.league.players.find((p) => p.id === id)?.position;
  /** A starter and the first bench player, whatever their positions. */
  const swap = () => {
    const off = career.squadPlan.starters[1];
    const on = career.squadPlan.bench[0];
    if (!off || !on) throw new Error("pair");
    return { off, on };
  };
  /** Swaps that share neither the player going off nor the one coming on. */
  const distinctSwaps = () =>
    career.squadPlan.bench.flatMap((on, i) => {
      const off = career.squadPlan.starters[i + 1];
      return off ? [{ off, on }] : [];
    });
  const mountEditor = (onResume = vi.fn(), locale = "en", changes = editor) => {
    mount(onResume, locale, changes);
    fireEvent.click(screen.getByTestId("half-time-open-changes"));
    return onResume;
  };
  const makeSub = ({ off, on }: { off: string; on: string }) => {
    fireEvent.click(screen.getByTestId("sub-add"));
    fireEvent.click(screen.getByTestId(`pick-${off}`));
    fireEvent.click(screen.getByTestId(`pick-${on}`));
  };

  it("opens the sheet with focus on its heading", () => {
    mountEditor();
    const dialog = screen.getByRole("dialog", { name: "Make changes" });
    expect(document.activeElement).toBe(
      within(dialog).getByRole("heading", { name: "Make changes" }),
    );
  });

  it("reaches Start second half in at most four tab stops from the heading", () => {
    mountEditor();
    const dialog = screen.getByRole("dialog", { name: "Make changes" });
    const stops = Array.from(
      dialog.querySelectorAll<HTMLElement>("button, [href], input, select, [tabindex='0']"),
    );
    const start = stops.indexOf(screen.getByTestId("start-second-half"));
    expect(start).toBeGreaterThanOrEqual(0);
    expect(start + 1).toBeLessThanOrEqual(4);
  });

  it("shows the eleven and the bench with rating and energy", () => {
    mountEditor();
    for (const id of [...career.squadPlan.starters, ...career.squadPlan.bench]) {
      const row = screen.getByTestId(`half-time-row-${id}`);
      expect(within(row).getByTestId("rating-value").textContent).toMatch(/\d/);
      expect(row.textContent).toContain("100");
    }
  });

  it("resumes without a plan when nothing was changed", () => {
    const onResume = mountEditor();
    fireEvent.click(screen.getByTestId("start-second-half"));
    expect(onResume).toHaveBeenCalledWith(undefined);
  });

  it("makes a substitution by picking who goes off and then who comes on", () => {
    const onResume = mountEditor();
    const { off, on } = swap();
    makeSub({ off, on });
    expect(screen.getByTestId("sub-off-0").textContent).toBe(nameOf(off));
    expect(screen.getByTestId("sub-on-0").textContent).toBe(nameOf(on));
    expect(screen.getByTestId("sub-count").textContent).toBe("4 substitutions left");
    fireEvent.click(screen.getByTestId("start-second-half"));
    const plan = onResume.mock.calls[0]?.[0];
    expect(plan.report.minutes[off]).toBe(45);
    expect(plan.report.minutes[on]).toBe(45);
    expect(plan.change.lineup.map((p: { id: string }) => p.id)).toContain(on);
    expect(plan.request).toMatchObject({
      minute: 45,
      halfTime: true,
      substitutions: [{ off, on }],
    });
  });

  it("lets the user pick any bench player, whatever his position", () => {
    mountEditor();
    const { off } = swap();
    fireEvent.click(screen.getByTestId("sub-add"));
    fireEvent.click(screen.getByTestId(`pick-${off}`));
    for (const id of career.squadPlan.bench) expect(screen.getByTestId(`pick-${id}`)).toBeTruthy();
  });

  it("shows the position a substitute would play and his rating there", () => {
    mountEditor();
    const { off } = swap();
    const other = career.squadPlan.bench.find((id) => positionOf(id) !== positionOf(off));
    if (!other) throw new Error("a bench player of another position");
    const before = within(screen.getByTestId(`half-time-row-${other}`)).getByTestId("rating-value");
    const own = before.textContent;
    fireEvent.click(screen.getByTestId("sub-add"));
    fireEvent.click(screen.getByTestId(`pick-${off}`));
    const row = screen.getByTestId(`pick-${other}`);
    expect(within(row).getByTestId(`row-position-${other}`).textContent).toMatch(/^as /);
    expect(within(row).getByTestId("rating-value").textContent).not.toBe(own);
  });

  it("asks for the player going off first and can cancel the pick", () => {
    mountEditor();
    fireEvent.click(screen.getByTestId("sub-add"));
    expect(screen.getByTestId("sub-prompt").textContent).toBe("Pick the player going off.");
    fireEvent.click(screen.getByTestId("sub-cancel"));
    expect(screen.queryByTestId("sub-prompt")).toBeNull();
    expect(screen.getByTestId("sub-add")).toBeTruthy();
  });

  it("undoes a substitution", () => {
    mountEditor();
    makeSub(swap());
    fireEvent.click(screen.getByTestId("sub-remove-0"));
    expect(screen.queryByTestId("sub-off-0")).toBeNull();
    expect(screen.getByTestId("sub-count").textContent).toBe("5 substitutions left");
  });

  it("cannot add a sixth substitution and explains why", () => {
    mountEditor();
    for (const pair of distinctSwaps().slice(0, MAX_SUBSTITUTIONS)) makeSub(pair);
    expect(distinctSwaps().length).toBeGreaterThanOrEqual(MAX_SUBSTITUTIONS);
    expect((screen.queryByTestId("sub-add") as HTMLButtonElement | null)?.disabled ?? true).toBe(
      true,
    );
    expect(screen.getByTestId("sub-limit").textContent).toBe("No substitutions left.");
  });

  it("passes changed tactics on with the plan and starts from the plan's tactics", () => {
    const onResume = mountEditor();
    expect(screen.getByTestId("tactic-pressing").getAttribute("data-value")).toBe(
      career.squadPlan.tactics.pressing,
    );
    fireEvent.click(
      within(screen.getByTestId("tactic-mentality")).getByRole("radio", { name: "Attacking" }),
    );
    fireEvent.click(screen.getByTestId("start-second-half"));
    expect(onResume.mock.calls[0]?.[0].change.tactics.mentality).toBe("attacking");
  });

  it("shows the formation in force and passes a new formation on with the plan", () => {
    const onResume = mountEditor();
    const control = screen.getByTestId("formation");
    expect(control.getAttribute("data-value")).toBe(career.squadPlan.formation);
    expect(screen.queryByTestId("auto-pick")).toBeNull();
    const other = career.squadPlan.formation === "3-4-3" ? "4-4-2" : "3-4-3";

    fireEvent.click(within(control).getByRole("radio", { name: other }));
    fireEvent.click(screen.getByTestId("start-second-half"));

    expect(onResume.mock.calls[0]?.[0].change.formation).toBeDefined();
    expect(onResume.mock.calls[0]?.[0].request.formation).toBe(other);
  });

  describe("formation preview", () => {
    const otherFormation = career.squadPlan.formation === "3-4-3" ? "4-4-2" : "3-4-3";
    const chooseFormation = (formation: string) =>
      fireEvent.click(
        within(screen.getByTestId("formation")).getByRole("radio", { name: formation }),
      );
    const starterRows = () =>
      career.squadPlan.starters.map((id) => screen.getByTestId(`row-position-${id}`).textContent);
    const movedStarters = () =>
      career.squadPlan.starters.filter((id) => screen.queryByTestId(`row-moved-${id}`));

    it("shows the positions in force until another formation is chosen", () => {
      mountEditor();
      expect(movedStarters()).toEqual([]);
      const before = starterRows();
      chooseFormation(otherFormation);
      expect(movedStarters().length).toBeGreaterThan(0);
      expect(starterRows()).not.toEqual(before);
    });

    it("marks the moved players with their new position and returns to the positions in force", () => {
      mountEditor();
      const before = starterRows();
      chooseFormation(otherFormation);
      const [moved] = movedStarters() as [string];
      expect(screen.getByTestId(`row-moved-${moved}`).textContent).toBe("Moved");
      chooseFormation(career.squadPlan.formation);
      expect(movedStarters()).toEqual([]);
      expect(starterRows()).toEqual(before);
    });

    it("previews together with a pending substitution", () => {
      mountEditor();
      const { off, on } = swap();
      makeSub({ off, on });
      chooseFormation(otherFormation);
      expect(screen.getByTestId(`row-position-${on}`)).toBeDefined();
      expect(screen.getByTestId(`row-position-${off}`)).toBeDefined();
    });

    it("says moved in Swedish", () => {
      mountEditor(vi.fn(), "sv");
      chooseFormation(otherFormation);
      const [moved] = movedStarters() as [string];
      expect(screen.getByTestId(`row-moved-${moved}`).textContent).toBe("Flyttad");
    });
  });

  it("shows the error with its cause, announced, and does not resume", () => {
    const rejecting: ChangesEditor = {
      ...editor,
      plan: () => ({ ok: false, error: "too-many-windows" }),
    };
    const onResume = mountEditor(vi.fn(), "en", rejecting);
    makeSub(swap());
    fireEvent.click(screen.getByTestId("start-second-half"));
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("data-testid")).toBe("half-time-error");
    expect(alert.textContent).toBe("All substitution windows are used.");
    expect(onResume).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("sub-remove-0"));
    expect(screen.queryByTestId("half-time-error")).toBeNull();
  });

  it("closes without asking when nothing is pending", async () => {
    mountEditor();
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Make changes" }), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Make changes" })).toBeNull());
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("asks before closing with pending changes and keeps them when the user keeps editing", () => {
    mountEditor();
    makeSub(swap());
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Make changes" }), { key: "Escape" });
    expect(screen.getByText("Discard the changes?")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
    expect(screen.getByTestId("sub-off-0")).toBeTruthy();
  });

  it("drops the pending changes when the user confirms the discard", async () => {
    const onResume = mountEditor();
    makeSub(swap());
    fireEvent.keyDown(screen.getByRole("dialog", { name: "Make changes" }), { key: "Escape" });
    fireEvent.click(screen.getByTestId("half-time-discard"));
    await waitFor(() => expect(screen.queryByTestId("sub-off-0")).toBeNull());
    fireEvent.click(screen.getByTestId("half-time-open-changes"));
    expect(screen.queryByTestId("sub-off-0")).toBeNull();
    fireEvent.click(screen.getByTestId("start-second-half"));
    expect(onResume).toHaveBeenCalledWith(undefined);
  });

  it("has Swedish labels", () => {
    mountEditor(vi.fn(), "sv");
    expect(screen.getByTestId("sub-add").textContent).toBe("Lägg till byte");
    expect(screen.getByTestId("sub-count").textContent).toBe("5 byten kvar");
  });
});
