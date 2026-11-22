import { beforeAll, describe, expect, it } from "vitest";
import { aMatchInput } from "../action/action-builders";
import { computeActionStats } from "../action/action-stats";
import { playerRatings } from "../action/player-ratings";
import { toPhases } from "../action/to-phases";
import { toZoneEvents } from "../action/to-zone-events";
import { bigChanceStats, chancesOf } from "./chances-of";
import { createPhaseMatch } from "./create-phase-match";

const MATCHES = 100;
const BASE_SEED = 7000;

const input = aMatchInput().withEngineVersion(3).build();
const ids = [...input.home.starters, ...input.away.starters].map((p) => p.id);

const play = (seed: number) => {
  const match = createPhaseMatch(input, seed, { detail: "fast" });
  match.advanceTo(1_000_000);
  match.resume();
  match.advanceTo(1_000_000);
  return match;
};

describe("consumers of a v3 log", () => {
  const matches = [] as ReturnType<typeof play>[];

  beforeAll(() => {
    for (let i = 0; i < MATCHES; i++) matches.push(play(BASE_SEED + i));
  });

  it("gives a pass completion of 75% to 88%", () => {
    let passes = 0;
    let completed = 0;
    for (const { events } of matches) {
      const { teams } = computeActionStats(events, Number.POSITIVE_INFINITY);
      passes += teams.passes.home + teams.passes.away;
      completed += teams.completedPasses.home + teams.completedPasses.away;
    }

    expect(completed / passes).toBeGreaterThanOrEqual(0.75);
    expect(completed / passes).toBeLessThanOrEqual(0.88);
  });

  it("counts the shots and goals of the steps' chances", () => {
    for (const { events, steps } of matches.slice(0, 20)) {
      const { teams } = computeActionStats(events, Number.POSITIVE_INFINITY);
      const chances = chancesOf(steps);

      expect(teams.shots.home + teams.shots.away).toBe(chances.length);
      const goals = events.filter((e) => e.type === "shot" && e.outcome === "goal").length;
      expect(goals).toBe(chances.filter((c) => c.result === "goal").length);
    }
  });

  it("rates every player from 1 to 10 with a mean near the 6.0 baseline", () => {
    const all = matches.flatMap(({ events }) =>
      Object.values(playerRatings(events, input.home.starters.concat(input.away.starters))),
    );
    const mean = all.reduce((a, b) => a + b, 0) / all.length;
    const sd = Math.sqrt(all.reduce((a, b) => a + (b - mean) ** 2, 0) / all.length);

    expect(all.length).toBe(MATCHES * ids.length);
    expect(Math.min(...all)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...all)).toBeLessThanOrEqual(10);
    expect(mean).toBeGreaterThan(5.8);
    expect(mean).toBeLessThan(7.2);
    expect(sd).toBeGreaterThan(0.6);
    expect(sd).toBeLessThan(1.2);
  });

  it("lowers the rating of a shooter who missed a clear chance, as in v2", () => {
    const match = matches.find((m) => bigChanceStats(m.steps).teams.home.missed > 0);
    if (!match) throw new Error("no match with a missed clear chance in the sample");
    const missed = chancesOf(match.steps).find((c) => c.clear && c.result !== "goal");
    if (!missed) throw new Error("unreachable: the match has a missed clear chance");
    const without = match.events.filter(
      (e) => !(e.type === "shot" && e.actor === missed.shooter && e.xg === missed.xg),
    );

    const before = playerRatings(without, [{ id: missed.shooter }])[missed.shooter] ?? 0;
    const after = playerRatings(match.events, [{ id: missed.shooter }])[missed.shooter] ?? 0;

    expect(after).toBeLessThan(before + 0.2);
  });

  it("keeps the zone events within the log and ends each period", () => {
    for (const { events } of matches.slice(0, 10)) {
      const zones = toZoneEvents(events);

      expect(zones.length).toBeGreaterThan(events.length / 4);
      expect(zones.filter((z) => z.type === "goal").length).toBe(
        events.filter((e) => e.type === "shot" && e.outcome === "goal").length,
      );
    }
  });

  it("groups the log into 250 to 400 phases that match the steps' boundaries", () => {
    const counts = matches.map(({ events }) => toPhases(events).length);
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;

    expect(mean).toBeGreaterThanOrEqual(250);
    expect(mean).toBeLessThanOrEqual(400);
  });
});
