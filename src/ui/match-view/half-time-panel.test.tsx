import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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
    expect(screen.getByTestId("stat-shots").textContent).toBe("5Shots3");
  });

  it("shows the action stats rows, including passes, pass completion and key passes", () => {
    mount();
    expect(screen.getByTestId("stat-passes").textContent).toBe("210Passes150");
    expect(screen.getByTestId("stat-passCompletion").textContent).toBe("86%Pass completion70%");
    expect(screen.getByTestId("stat-keyPasses").textContent).toBe("2Key passes1");
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
  const byId = new Map(career.league.players.map((p) => [p.id, p]));
  const select = (id: string) => screen.getByTestId(id) as HTMLSelectElement;
  const mountEditor = (onResume = vi.fn()) => {
    mount(onResume, "en", editorFor(career));
    return onResume;
  };
  const addSub = () => fireEvent.click(screen.getByTestId("sub-add"));

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

  it("adds a substitution of a starter for a bench player of the same position", () => {
    const onResume = mountEditor();
    addSub();
    const off = byId.get(select("sub-off-0").value);
    const on = byId.get(select("sub-on-0").value);
    expect(career.squadPlan.starters).toContain(off?.id);
    expect(career.squadPlan.bench).toContain(on?.id);
    expect(on?.position).toBe(off?.position);
    fireEvent.click(screen.getByTestId("start-second-half"));
    const plan = onResume.mock.calls[0]?.[0];
    expect(plan.report.minutes[off?.id ?? ""]).toBe(45);
    expect(plan.report.minutes[on?.id ?? ""]).toBe(45);
    expect(plan.lineupAfter.starters).toContain(on?.id);
  });

  it("only offers bench players of the same position as the player going off", () => {
    mountEditor();
    addSub();
    const off = byId.get(select("sub-off-0").value);
    for (const option of Array.from(select("sub-on-0").options)) {
      expect(byId.get(option.value)?.position).toBe(off?.position);
    }
  });

  it("removes a substitution", () => {
    mountEditor();
    addSub();
    expect(screen.getByTestId("sub-off-0")).toBeTruthy();
    fireEvent.click(screen.getByTestId("sub-remove-0"));
    expect(screen.queryByTestId("sub-off-0")).toBeNull();
  });

  it("cannot add a sixth substitution and explains why", () => {
    mountEditor();
    for (let i = 0; i < MAX_SUBSTITUTIONS; i++) addSub();
    const add = screen.getByTestId("sub-add") as HTMLButtonElement;
    expect(add.disabled).toBe(true);
    expect(screen.getByTestId("sub-limit").textContent).toMatch(/5/);
  });

  it("passes changed tactics on with the plan and starts from the plan's tactics", () => {
    const onResume = mountEditor();
    expect(select("tactic-pressing").value).toBe(career.squadPlan.tactics.pressing);
    fireEvent.change(select("tactic-mentality"), { target: { value: "attacking" } });
    fireEvent.click(screen.getByTestId("start-second-half"));
    const plan = onResume.mock.calls[0]?.[0];
    expect(plan.change.tactics.mentality).toBe("attacking");
  });

  it("shows an error and does not resume when the plan is invalid", () => {
    const onResume = mountEditor();
    addSub();
    // The same bench player cannot come on twice when the keeper pair collides.
    addSub();
    fireEvent.change(select("sub-off-1"), { target: { value: select("sub-off-0").value } });
    fireEvent.click(screen.getByTestId("start-second-half"));
    expect(screen.getByTestId("half-time-error").textContent).toMatch(/\S/);
    expect(onResume).not.toHaveBeenCalled();
  });

  it("clears the error when the substitutions change", () => {
    mountEditor();
    addSub();
    addSub();
    fireEvent.change(select("sub-off-1"), { target: { value: select("sub-off-0").value } });
    fireEvent.click(screen.getByTestId("start-second-half"));
    fireEvent.click(screen.getByTestId("sub-remove-1"));
    expect(screen.queryByTestId("half-time-error")).toBeNull();
  });

  it("has Swedish labels", () => {
    mount(vi.fn(), "sv", editorFor(career));
    expect(within(screen.getByTestId("half-time-changes")).getByTestId("sub-add").textContent).toBe(
      "Lägg till byte",
    );
  });
});
