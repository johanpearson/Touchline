import { describe, expect, it } from "vitest";
import { createRng } from "../rng";
import { anEnginePlayer } from "./action-builders";
import {
  BLOCK_CORNER_SHARE,
  BLOCKED_WEIGHT_PER_BLOCKER,
  MISSED_WEIGHT,
  REBOUND_DISTANCE,
  SAVE_CATCH_SHARE,
  SAVE_CORNER_SHARE,
  SAVED_WEIGHT,
  SHOT_BLOCK_RADIUS,
  WOODWORK_WEIGHT,
} from "./decision-constants";
import type { EngineAttributeName } from "./engine-player";
import type { Challenger } from "./open-play-types";
import { goalChance, resolveShot, type ShotInput } from "./resolve-shot";

const scripted = (...values: number[]) => {
  let i = 0;
  return { ...createRng(1), next: () => values[i++] ?? 0.99 };
};
const at = (x: number, y = 34) => ({ x, y });
const playerWith = (id: string, attributes: Partial<Record<EngineAttributeName, number>>) =>
  Object.entries(attributes)
    .reduce(
      (b, [name, value]) => b.withAttribute(name as EngineAttributeName, value),
      anEnginePlayer(id),
    )
    .build();
const challenger = (slot: number, point: { x: number; y: number }): Challenger => ({
  slot,
  point,
  player: anEnginePlayer(`c${slot}`).build(),
});
const keeperAt = challenger(0, at(104.5));
const input = (extra: Partial<ShotInput> = {}): ShotInput => ({
  side: "home",
  shooter: anEnginePlayer("s").build(),
  shooterSlot: 9,
  from: at(94),
  keeper: keeperAt,
  blockers: [],
  xg: 0.2,
  pressure: 0,
  ...extra,
});

/** The first draw that leaves `fraction` of the non-goal remainder behind it, for a goal chance of 0.2. */
const drawAt = (fraction: number, chance = 0.2) => chance + fraction * (1 - chance);

describe("resolveShot goal boundary", () => {
  it("is a goal below the goal chance and not a goal exactly at it", () => {
    expect(resolveShot(input(), scripted(0.2 - 1e-9)).outcome).toBe("goal");
    expect(resolveShot(input(), scripted(0.2)).outcome).not.toBe("goal");
  });

  it("puts a goal for the away side on the home goal line", () => {
    const r = resolveShot(input({ side: "away", from: at(11) }), scripted(0));
    expect(r.ball).toEqual(at(0));
    expect(r.possession).toEqual({ side: "home" });
  });
});

describe("resolveShot remainder bands", () => {
  type Case = {
    label: string;
    extra: Partial<ShotInput>;
    blockers: number;
    keeperSkill: number;
    finishing: number;
    pressure: number;
  };
  const cases: Case[] = [
    {
      label: "average shooter and keeper, no pressure",
      extra: {},
      blockers: 0,
      keeperSkill: 0.5,
      finishing: 0.5,
      pressure: 0,
    },
    {
      label: "a strong keeper",
      extra: { keeper: { ...keeperAt, player: playerWith("k", { handling: 20, reflexes: 20 }) } },
      blockers: 0,
      keeperSkill: 1,
      finishing: 0.5,
      pressure: 0,
    },
    {
      label: "a poor finisher under pressure",
      extra: { shooter: playerWith("s", { finishing: 4 }), pressure: 0.5 },
      blockers: 0,
      keeperSkill: 0.5,
      finishing: 0.2,
      pressure: 0.5,
    },
    {
      label: "two defenders on the lane",
      extra: { blockers: [challenger(3, at(98, 34)), challenger(4, at(100, 34.5))] },
      blockers: 2,
      keeperSkill: 0.5,
      finishing: 0.5,
      pressure: 0,
    },
  ];

  it.each(cases)("splits the remainder by weight with $label", (c) => {
    const w = {
      woodwork: WOODWORK_WEIGHT,
      blocked: BLOCKED_WEIGHT_PER_BLOCKER * c.blockers,
      saved: SAVED_WEIGHT * (0.5 + c.keeperSkill),
      missed: MISSED_WEIGHT * (1.5 - c.finishing) * (1 + c.pressure),
    };
    const total = w.woodwork + w.blocked + w.saved + w.missed;
    const edges = [w.woodwork, w.woodwork + w.blocked, w.woodwork + w.blocked + w.saved].map(
      (e) => e / total,
    );
    const base = input(c.extra);
    const chance = goalChance(base);
    const probe = (fraction: number) =>
      resolveShot(base, scripted(drawAt(fraction, chance), 0.99)).outcome;
    expect(probe(edges[0] - 1e-6)).toBe("woodwork");
    expect(probe(edges[0] + 1e-6)).toBe(c.blockers > 0 ? "blocked" : "saved");
    expect(probe(edges[1] + 1e-6)).toBe("saved");
    expect(probe(edges[2] - 1e-6)).toBe("saved");
    expect(probe(edges[2] + 1e-6)).toBe("missed");
    expect(probe(0.9999)).toBe("missed");
  });
});

describe("resolveShot save, block and rebound boundaries", () => {
  const saved = drawAt(0.5); // inside the saved band for the default input

  it("gives a corner below the save corner share and a catch exactly at it", () => {
    expect(resolveShot(input(), scripted(saved, SAVE_CORNER_SHARE - 1e-9)).restart?.variant).toBe(
      "corner",
    );
    const at_ = resolveShot(input(), scripted(saved, SAVE_CORNER_SHARE));
    expect(at_.restart).toBeUndefined();
    expect(at_.possession).toEqual({ side: "away", slot: 0 });
  });

  it("gives a catch below the catch share and a rebound exactly at it", () => {
    const catches = resolveShot(input(), scripted(saved, SAVE_CATCH_SHARE - 1e-9));
    expect(catches.possession).toEqual({ side: "away", slot: 0 });
    const rebound = resolveShot(input(), scripted(saved, SAVE_CATCH_SHARE));
    expect(rebound.ball.x).toBeCloseTo(105 - REBOUND_DISTANCE, 9);
  });

  it("gives a corner for a block below the block corner share and a loose ball exactly at it", () => {
    const blocker = challenger(4, at(98, 34));
    const blocked = drawAt(0.1);
    const corner = resolveShot(
      input({ blockers: [blocker] }),
      scripted(blocked, BLOCK_CORNER_SHARE - 1e-9),
    );
    expect(corner.outcome).toBe("blocked");
    expect(corner.restart?.variant).toBe("corner");
    const loose = resolveShot(
      input({ blockers: [blocker] }),
      scripted(blocked, BLOCK_CORNER_SHARE),
    );
    expect(loose.restart).toBeUndefined();
    expect(loose.ball).toEqual(blocker.point);
  });

  it("takes the corner on the side of the shot, on the goal line of the attacked end", () => {
    const low = resolveShot(input({ from: at(94, 10) }), scripted(saved, 0));
    expect(low.restart).toEqual({ team: "home", variant: "corner", position: at(105, 0) });
    const away = resolveShot(input({ side: "away", from: at(11, 50) }), scripted(saved, 0));
    expect(away.restart).toEqual({ team: "away", variant: "corner", position: at(0, 68) });
  });

  it("places a rebound the rebound distance in front of the goal, halfway to the shooter's side", () => {
    const home = resolveShot(input({ from: at(94, 10) }), scripted(saved, 0.99));
    expect(home.ball.x).toBeCloseTo(105 - REBOUND_DISTANCE, 9);
    expect(home.ball.y).toBeCloseTo(34 + (10 - 34) / 2, 9);
    const away = resolveShot(input({ side: "away", from: at(11, 50) }), scripted(saved, 0.99));
    expect(away.ball.x).toBeCloseTo(REBOUND_DISTANCE, 9);
    expect(away.ball.y).toBeCloseTo(34 + (50 - 34) / 2, 9);
  });

  it("keeps a rebound with the shooter when a defender is exactly as near, and gives it to a nearer defender", () => {
    const ball = { x: 105 - REBOUND_DISTANCE, y: 34 };
    const shooterDistance = ball.x - 94;
    const tied = challenger(3, at(ball.x + shooterDistance, 34));
    expect(resolveShot(input({ blockers: [tied] }), scripted(saved, 0.99)).possession).toEqual({
      side: "home",
      slot: 9,
    });
    const nearer = challenger(3, at(ball.x + shooterDistance - 0.1, 34));
    expect(resolveShot(input({ blockers: [nearer] }), scripted(saved, 0.99)).possession).toEqual({
      side: "away",
      slot: 3,
    });
  });

  it("measures the nearest defender by true distance, in both axes", () => {
    const a = challenger(3, at(97, 35.4));
    const b = challenger(4, at(101, 33.2));
    const blocked = drawAt(0.1);
    const r = resolveShot(input({ blockers: [b, a] }), scripted(blocked, 0.99));
    expect(r.outcome).toBe("blocked");
    expect(r.possession).toEqual({ side: "away", slot: 3 });
    expect(r.ball).toEqual(a.point);
  });

  it("counts a defender exactly at the block radius from the lane as a blocker, and one a hair further as none", () => {
    const edge = challenger(4, at(100, 34 + SHOT_BLOCK_RADIUS));
    const outside = challenger(4, at(100, 34 + SHOT_BLOCK_RADIUS + 1e-6));
    const total = WOODWORK_WEIGHT + BLOCKED_WEIGHT_PER_BLOCKER + SAVED_WEIGHT + MISSED_WEIGHT;
    const mid = WOODWORK_WEIGHT / total + 1e-3;
    expect(resolveShot(input({ blockers: [edge] }), scripted(drawAt(mid), 0.99)).outcome).toBe(
      "blocked",
    );
    expect(
      resolveShot(input({ blockers: [outside] }), scripted(drawAt(mid), 0.99)).outcome,
    ).not.toBe("blocked");
  });

  it("ignores defenders on the lane for a penalty", () => {
    const blocker = challenger(4, at(100, 34));
    const total = WOODWORK_WEIGHT + SAVED_WEIGHT + MISSED_WEIGHT;
    const first = WOODWORK_WEIGHT / total + 1e-3;
    const r = resolveShot(
      input({ blockers: [blocker], penalty: true }),
      scripted(drawAt(first), 0.99),
    );
    expect(r.outcome).toBe("saved");
  });
});
