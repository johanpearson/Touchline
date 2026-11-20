import { beforeAll, describe, expect, it } from "vitest";
import { aMatchInput } from "./action-builders";
import { BASE_SEED, between } from "./balance-test-support";
import { createActionMatch } from "./create-action-match";
import { toPhases } from "./to-phases";

const MATCHES = 200;

type Totals = { phases: number; actions: number; goals: number; shots: number; xg: number };

const play = (seed: number) => {
  const match = createActionMatch(aMatchInput().build(), seed, { detail: "fast" });
  match.advanceTo(1_000_000);
  match.resume();
  match.advanceTo(1_000_000);
  return match.events;
};

describe("possession phases over seeded matches", () => {
  let phasesPerMatch = 0;
  let sums: { log: Totals; phases: Totals };

  beforeAll(() => {
    const log: Totals = { phases: 0, actions: 0, goals: 0, shots: 0, xg: 0 };
    const phases: Totals = { phases: 0, actions: 0, goals: 0, shots: 0, xg: 0 };
    for (let i = 0; i < MATCHES; i++) {
      const events = play(BASE_SEED + i);
      const grouped = toPhases(events);
      phases.phases += grouped.length;
      phases.actions += grouped.reduce((n, p) => n + p.actions.length, 0);
      phases.goals += grouped.filter((p) => p.outcome === "goal").length;
      for (const p of grouped) {
        for (const index of p.actions) {
          const e = events[index];
          if (e?.type !== "shot") continue;
          phases.shots += 1;
          phases.xg += e.xg;
        }
      }
      for (const e of events) {
        log.actions += 1;
        if (e.type !== "shot") continue;
        log.shots += 1;
        log.xg += e.xg;
        if (e.outcome === "goal") log.goals += 1;
      }
    }
    phasesPerMatch = phases.phases / MATCHES;
    console.info(
      `Phases per match: ${phasesPerMatch.toFixed(1)}, actions ${(log.actions / MATCHES).toFixed(0)}`,
    );
    sums = { log, phases };
  }, 300_000);

  it("plays 250 to 400 phases per match on average", () => between(phasesPerMatch, 250, 400));
  it("holds every action of the log once", () =>
    expect(sums.phases.actions).toBe(sums.log.actions));
  it("sums goals, shots and xG over phases to the log's", () => {
    expect(sums.phases.goals).toBe(sums.log.goals);
    expect(sums.phases.shots).toBe(sums.log.shots);
    expect(sums.phases.xg).toBeCloseTo(sums.log.xg, 6);
  });
});
