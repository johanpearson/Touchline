import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ActionStats } from "../../engine";
import {
  type Career,
  createCareer,
  generateLeague,
  getNextFixture,
  MAX_SUBSTITUTIONS,
  planHalfTime,
} from "../../game";
import { createMemoryLocaleStore } from "../../platform";
import { I18nProvider } from "../i18n-provider";
import { type HalfTimeEditor, HalfTimePanel } from "./half-time-panel";

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

const editorFor = (career: Career): HalfTimeEditor => {
  const fixture = getNextFixture(career.season, career.userClubId);
  const club = career.league.clubs.find((c) => c.id === career.userClubId);
  if (!fixture || !club) throw new Error("fixture");
  return {
    players: career.league.players.filter((p) => club.playerIds.includes(p.id)),
    starters: career.squadPlan.starters,
    bench: career.squadPlan.bench,
    condition: career.condition,
    tactics: career.squadPlan.tactics,
    plan: (changes) => planHalfTime(career, fixture, changes),
  };
};

const mount = (onResume = vi.fn(), locale = "en", editor?: HalfTimeEditor) =>
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
  /** A starter and a bench player of his position. */
  const swap = (skip = 0) => {
    const pairs = career.squadPlan.starters.flatMap((off) =>
      career.squadPlan.bench
        .filter((on) => positionOf(on) === positionOf(off))
        .map((on) => ({ off, on })),
    );
    const pair = pairs[skip];
    if (!pair) throw new Error("pair");
    return pair;
  };
  /** Swaps that share neither the player going off nor the one coming on. */
  const distinctSwaps = () => {
    const used = new Set<string>();
    const swaps: { off: string; on: string }[] = [];
    for (const off of career.squadPlan.starters) {
      const on = career.squadPlan.bench.find(
        (id) => positionOf(id) === positionOf(off) && !used.has(id),
      );
      if (on) {
        used.add(on);
        swaps.push({ off, on });
      }
    }
    return swaps;
  };
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

  it("shows the eleven and the bench with fitness and form", () => {
    mountEditor();
    for (const id of [...career.squadPlan.starters, ...career.squadPlan.bench]) {
      expect(screen.getByTestId(`half-time-fitness-${id}`).textContent).toContain("100");
      expect(screen.getByTestId(`half-time-form-${id}`)).toBeTruthy();
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
    expect(screen.getByTestId("sub-count").textContent).toBe("1 of 5");
    fireEvent.click(screen.getByTestId("start-second-half"));
    const plan = onResume.mock.calls[0]?.[0];
    expect(plan.report.minutes[off]).toBe(45);
    expect(plan.report.minutes[on]).toBe(45);
    expect(plan.lineupAfter.starters).toContain(on);
  });

  it("only lets the user pick bench players of the position of the player going off", () => {
    mountEditor();
    const { off } = swap();
    fireEvent.click(screen.getByTestId("sub-add"));
    fireEvent.click(screen.getByTestId(`pick-${off}`));
    const pickable = career.squadPlan.bench.filter((id) => screen.queryByTestId(`pick-${id}`));
    expect(pickable.length).toBeGreaterThan(0);
    for (const id of pickable) expect(positionOf(id)).toBe(positionOf(off));
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
    expect(screen.getByTestId("sub-count").textContent).toBe("0 of 5");
  });

  it("cannot add a sixth substitution and explains why", () => {
    mountEditor();
    for (const pair of distinctSwaps().slice(0, MAX_SUBSTITUTIONS)) makeSub(pair);
    expect(distinctSwaps().length).toBeGreaterThanOrEqual(MAX_SUBSTITUTIONS);
    expect((screen.queryByTestId("sub-add") as HTMLButtonElement | null)?.disabled ?? true).toBe(
      true,
    );
    expect(screen.getByTestId("sub-limit").textContent).toMatch(/5/);
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

  it("shows the error with its cause, announced, and does not resume", () => {
    const rejecting: HalfTimeEditor = {
      ...editor,
      plan: () => ({ ok: false, error: "position-mismatch" }),
    };
    const onResume = mountEditor(vi.fn(), "en", rejecting);
    makeSub(swap());
    fireEvent.click(screen.getByTestId("start-second-half"));
    const alert = screen.getByRole("alert");
    expect(alert.getAttribute("data-testid")).toBe("half-time-error");
    expect(alert.textContent).toBe(
      "A substitute must play the same position as the player going off.",
    );
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
    expect(screen.getByTestId("sub-count").textContent).toBe("0 av 5");
  });
});
