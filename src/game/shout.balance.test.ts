import { beforeAll, describe, expect, it } from "vitest";
import {
  type ActionEvent,
  createActionMatch,
  type MatchInput,
  type Side,
  type TeamSheet,
} from "../engine";
import type { Career } from "./career";
import { aCareer } from "./career-builders";
import type { Fixture } from "./generate-fixtures";
import { matchInputFor, matchSeed } from "./match-input-for";
import { EMPTY_MATCH_CHANGES, type MatchChanges, planChange } from "./plan-change";
import { SHOUT_DURATION_MINUTES, type ShoutKind } from "./shouts";

const MATCHES = 500;
/** Shouts as often as the cooldown allows: two in each half. */
const CONTINUOUS_MINUTES = [5, 25, 50, 70];
const END = 100_000;
/** Largest change in goal difference (goals per match) a shout used all the time may bring. */
const MAX_NET_GOAL_GAIN = 0.2;
/** The user's side, which is also the side that shouts. */
const SIDE: Side = "home";

type Run = { shots: number; shotsAgainst: number; actions: number; goalDifference: number };

const copyWithPrefix = (sheet: TeamSheet, prefix: string): TeamSheet => {
  const prefixed = <T extends { id: string }>(players: readonly T[]): T[] =>
    players.map((p) => ({ ...p, id: `${prefix}${p.id}` }));
  return { ...sheet, starters: prefixed(sheet.starters), bench: prefixed(sheet.bench) };
};

/** The user's club against an exact copy of itself with neutral tactics, so only the shouts differ. */
const mirrorInput = (career: Career, fixture: Fixture): MatchInput => {
  const input = matchInputFor(career, fixture);
  const own = input.home;
  return { ...input, away: copyWithPrefix({ ...own, tactics: input.away.tactics }, "x-") };
};

const userFixtureAsHome = (career: Career): Fixture => {
  const fixture = career.season.fixtures.find((f) => f.homeClubId === career.userClubId) as Fixture;
  return fixture;
};

const countShots = (events: readonly ActionEvent[], side: Side): number =>
  events.filter((e) => e.type === "shot" && e.team === side).length;

const advance = (match: ReturnType<typeof createActionMatch>, minute: number): void => {
  const limit = minute * 60;
  match.advanceTo(limit);
  if (match.state.period === "halfTime" && limit > match.state.time) {
    match.resume();
    match.advanceTo(limit);
  }
};

const playMatch = (
  career: Career,
  fixture: Fixture,
  seed: number,
  shout: ShoutKind | undefined,
): Run => {
  const match = createActionMatch(mirrorInput(career, fixture), seed, { detail: "fast" });
  let changes: MatchChanges = EMPTY_MATCH_CHANGES;
  const give = (minute: number, change: Parameters<typeof planChange>[3]) => {
    advance(match, minute);
    const planned = planChange(career, fixture, minute, change, changes);
    if (!planned.ok) throw new Error(planned.error);
    changes = planned.changes;
    match.applyChange(planned.change);
  };
  if (shout) {
    for (const minute of CONTINUOUS_MINUTES) {
      give(minute, { shout });
      give(minute + SHOUT_DURATION_MINUTES, {});
    }
  }
  match.advanceTo(END);
  if (match.state.period === "halfTime") match.resume();
  match.advanceTo(END);
  const { home, away } = match.state.score;
  return {
    shots: countShots(match.events, SIDE),
    shotsAgainst: countShots(match.events, "away"),
    actions: match.events.length,
    goalDifference: home - away,
  };
};

const averages = (runs: readonly Run[]): Run => {
  const mean = (pick: (r: Run) => number) =>
    runs.reduce((sum, r) => sum + pick(r), 0) / runs.length;
  return {
    shots: mean((r) => r.shots),
    shotsAgainst: mean((r) => r.shotsAgainst),
    actions: mean((r) => r.actions),
    goalDifference: mean((r) => r.goalDifference),
  };
};

describe("shout balance: touchline shouts used as often as allowed", () => {
  const career = aCareer();
  const fixture = userFixtureAsHome(career);
  const summary = new Map<ShoutKind | "none", Run>();

  const play = (shout: ShoutKind | undefined): Run => {
    const runs = Array.from({ length: MATCHES }, (_, i) =>
      playMatch(career, fixture, matchSeed(career, fixture) + i, shout),
    );
    return averages(runs);
  };

  beforeAll(() => {
    summary.set("none", play(undefined));
    for (const kind of ["pushUp", "calmDown", "pressTheBall", "holdShape"] as const) {
      summary.set(kind, play(kind));
    }
  }, 600_000);

  const of = (kind: ShoutKind | "none"): Run => summary.get(kind) as Run;

  it("Push up takes more shots than no shouts", () => {
    expect(of("pushUp").shots).toBeGreaterThan(of("none").shots);
  });

  it("Calm it down takes fewer shots than no shouts", () => {
    expect(of("calmDown").shots).toBeLessThan(of("none").shots);
  });

  it("Press the ball makes more actions than no shouts", () => {
    expect(of("pressTheBall").actions).toBeGreaterThan(of("none").actions);
  });

  it("Hold shape makes fewer actions than no shouts", () => {
    expect(of("holdShape").actions).toBeLessThan(of("none").actions);
  });

  it("Push up also concedes more shots, so it carries a risk", () => {
    expect(of("pushUp").shotsAgainst).toBeGreaterThan(of("none").shotsAgainst);
  });

  it.each(["pushUp", "calmDown", "pressTheBall", "holdShape"] as const)(
    "no shout gives a net advantage: %s",
    (kind) => {
      const gain = of(kind).goalDifference - of("none").goalDifference;
      expect(gain).toBeLessThan(MAX_NET_GOAL_GAIN);
    },
  );
});
