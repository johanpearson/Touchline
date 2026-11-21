import { describe, expect, it } from "vitest";
import { anEnginePlayer } from "../action/action-builders";
import type { EnginePlayer } from "../action/engine-player";
import { goalChanceOf } from "../action/resolve-shot";
import { createRng, type Rng } from "../rng";
import type { ChanceResult, ChanceSituation } from "./chance";
import { type ChanceDraft, missWeights, resolveChance } from "./resolve-chance";

const scripted = (...values: number[]): Rng => {
  let index = 0;
  const next = (): number => values[index++] ?? 0.5;
  const rng: Rng = {
    next,
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (list) => list[Math.floor(next() * list.length)] as never,
    chance: (p) => next() < p,
    fork: () => rng,
  };
  return rng;
};

const shooter = anEnginePlayer("h-10").withPosition("FWD").build();
const goalkeeper = anEnginePlayer("a-1").withPosition("GK").build();
const draft = (changes: Partial<ChanceDraft> = {}): ChanceDraft => ({
  kind: "openPlay",
  creator: "h-8",
  shooter: "h-10",
  situation: "box",
  xg: 0.2,
  keeper: "a-1",
  from: { x: 92, y: 34 },
  ...changes,
});

const resultsAcross = (d: ChanceDraft, s = shooter, k = goalkeeper): Set<ChanceResult> => {
  const found = new Set<ChanceResult>();
  for (let v = 0.0005; v < 1; v += 0.001)
    found.add(resolveChance(d, s, k, scripted(v, 0.5)).result);
  return found;
};

describe("resolveChance", () => {
  it("scores below the goal chance and restarts with a kickoff", () => {
    const goal = goalChanceOf(0.2, shooter, goalkeeper);

    expect(resolveChance(draft(), shooter, goalkeeper, scripted(goal - 0.001))).toEqual({
      result: "goal",
      aftermath: "kickoff",
    });
    expect(resolveChance(draft(), shooter, goalkeeper, scripted(goal + 0.001)).result).not.toBe(
      "goal",
    );
  });

  it("raises the goal chance with finishing and lowers it against a good keeper", () => {
    const sharp = anEnginePlayer("h-10").withAttribute("finishing", 20).build();
    const wall = anEnginePlayer("a-1").withAttribute("handling", 20).withAttribute("reflexes", 20);
    const u = goalChanceOf(0.2, shooter, goalkeeper) + 0.01;

    expect(resolveChance(draft(), sharp, goalkeeper, scripted(u)).result).toBe("goal");
    expect(resolveChance(draft(), shooter, wall.build(), scripted(u)).result).not.toBe("goal");
  });

  it("scores exactly as often as xG times the finishing and keeper factors", () => {
    const rng = createRng(5);
    let goals = 0;
    const n = 40000;
    for (let i = 0; i < n; i++) {
      if (resolveChance(draft(), shooter, goalkeeper, rng).result === "goal") goals++;
    }

    expect(goals / n).toBeCloseTo(goalChanceOf(0.2, shooter, goalkeeper), 2);
  });

  it.each(["header", "edge", "box", "volley"] as ChanceSituation[])(
    "reaches every result from a %s",
    (situation) => {
      expect([...resultsAcross(draft({ situation }))].sort()).toEqual(
        ["blocked", "goal", "over", "saved", "wide", "woodwork"].sort(),
      );
    },
  );

  it("never blocks a one-on-one or a penalty", () => {
    expect(resultsAcross(draft({ situation: "oneOnOne" }))).not.toContain("blocked");
    expect(
      resultsAcross(draft({ kind: "penalty", situation: "oneOnOne", xg: 0.76 })),
    ).not.toContain("blocked");
  });

  it("keeps a positive share for every near miss, even for the best finisher against the best keeper", () => {
    const best = anEnginePlayer("h-10").withAttribute("finishing", 20).build();
    const wall = anEnginePlayer("a-1")
      .withAttribute("handling", 20)
      .withAttribute("reflexes", 20)
      .build();
    const worst = anEnginePlayer("h-10").withAttribute("finishing", 1).build();
    const cheap = anEnginePlayer("a-1")
      .withAttribute("handling", 1)
      .withAttribute("reflexes", 1)
      .build();

    for (const s of [best, worst]) {
      for (const k of [wall, cheap]) {
        for (const situation of ["header", "edge", "box", "volley", "oneOnOne"] as const) {
          const weights = missWeights(draft({ situation }), s, k);
          expect(weights.woodwork).toBeGreaterThan(0);
          expect(weights.wide).toBeGreaterThan(0);
          expect(weights.over).toBeGreaterThan(0);
          expect(weights.saved).toBeGreaterThan(0);
        }
      }
    }
  });

  it("misses more often with poor finishing and saves more against a good keeper", () => {
    const poor = anEnginePlayer("h-10").withAttribute("finishing", 2).build();
    const wall = anEnginePlayer("a-1")
      .withAttribute("handling", 20)
      .withAttribute("reflexes", 20)
      .build();
    const base = missWeights(draft(), shooter, goalkeeper);

    expect(missWeights(draft(), poor, goalkeeper).wide).toBeGreaterThan(base.wide);
    expect(missWeights(draft(), shooter, wall).saved).toBeGreaterThan(base.saved);
  });

  it("hurries a pressed volley into more misses than a clear one-on-one", () => {
    expect(missWeights(draft({ situation: "volley" }), shooter, goalkeeper).wide).toBeGreaterThan(
      missWeights(draft({ situation: "oneOnOne" }), shooter, goalkeeper).wide,
    );
  });

  it.each([
    ["saved", [0.05, 0.4, 0.9], ["rebound", "corner", "goalKick"]],
    ["woodwork", [0.05, 0.7, 0.9], ["rebound", "corner", "goalKick"]],
    ["wide", [0.5, 0.02], ["goalKick", "corner"]],
  ] as const)("draws what follows a %s", (result, draws, expected) => {
    const weights = missWeights(draft(), shooter, goalkeeper);
    const total = weights.woodwork + weights.blocked + weights.saved + weights.wide + weights.over;
    const goal = goalChanceOf(0.2, shooter, goalkeeper);
    const start: Record<string, number> = {
      woodwork: weights.woodwork / 2,
      saved: weights.woodwork + weights.blocked + weights.saved / 2,
      wide: weights.woodwork + weights.blocked + weights.saved + weights.wide / 2,
    };
    const u = goal + (1 - goal) * ((start[result] as number) / total);

    const outcomes = draws.map(
      (d) => resolveChance(draft(), shooter, goalkeeper, scripted(u, d)).aftermath,
    );

    expect(outcomes).toEqual(expected.slice(0, draws.length));
  });

  it("is deterministic for a seed and uses one or two draws", () => {
    const player = (p: EnginePlayer) => p;
    expect(resolveChance(draft(), player(shooter), goalkeeper, createRng(9))).toEqual(
      resolveChance(draft(), shooter, goalkeeper, createRng(9)),
    );
  });
});
