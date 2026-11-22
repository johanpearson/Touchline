import { describe, expect, it } from "vitest";
import { aTeamSheet } from "../action/action-builders";
import type { EnginePlayer } from "../action/engine-player";
import { PITCH_WIDTH } from "../action/pitch-metres";
import type { TeamSheet } from "../action/team-sheet";
import { createRng, type Rng } from "../rng";
import { drawChain, pickChallenger, pickPlayer, startStage } from "./draw-chain";
import {
  SHOT_DEPTH_MAX,
  SHOT_DEPTH_MIN,
  STAGE_END_DEPTH,
  WIDE_OFFSET_MAX,
  WIDE_OFFSET_MIN,
} from "./phase-constants";

const sheet = aTeamSheet("Home", "h").build();
const away = aTeamSheet("Away", "a").build();
const positionOf = (id: string): string =>
  (sheet.starters.find((p) => p.id === id) as EnginePlayer).position;

/** An Rng that returns `values` from `next` in order and 0.5 afterwards. */
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

const plan = (changes: Partial<Parameters<typeof drawChain>[0]> = {}) => ({
  team: "home" as const,
  sheet,
  start: "tackle" as const,
  ball: { x: 30, y: 34 },
  from: 0 as const,
  endedIn: 1 as const,
  shoots: false,
  ...changes,
});

describe("startStage", () => {
  it.each([
    [0, 0],
    [34.9, 0],
    [35, 1],
    [69.9, 1],
    [70, 2],
    [104, 2],
  ] as const)("puts depth %s in stage %s", (depth, stage) => {
    expect(startStage(depth)).toBe(stage);
  });
});

describe("pickPlayer", () => {
  it("never picks the goalkeeper or the excluded player", () => {
    const rng = createRng(1);
    const picks = Array.from({ length: 200 }, () =>
      pickPlayer(sheet, { stage: 1, attribute: "passing", exclude: "h-6" }, rng),
    );

    expect(picks.some((p) => p.id === "h-1" || p.id === "h-6")).toBe(false);
  });

  it("picks the first player when the draw is 0 and the last when it is just under 1", () => {
    const pool = sheet.starters.filter((p) => p.position !== "GK");

    expect(pickPlayer(sheet, { stage: 1, attribute: "passing" }, scripted(0)).id).toBe(
      (pool[0] as EnginePlayer).id,
    );
    expect(pickPlayer(sheet, { stage: 1, attribute: "passing" }, scripted(0.9999)).id).toBe(
      (pool[pool.length - 1] as EnginePlayer).id,
    );
  });

  it("weights by the position's share of the ball's third", () => {
    const rng = createRng(2);
    const counts = { DEF: 0, MID: 0, FWD: 0 } as Record<string, number>;
    for (let i = 0; i < 600; i++) {
      const p = pickPlayer(sheet, { stage: 2, attribute: "passing" }, rng);
      counts[p.position] = (counts[p.position] ?? 0) + 1;
    }

    // per player: a 4-4-2 has 4 defenders, 4 midfielders and 2 forwards
    expect((counts.FWD as number) / 2).toBeGreaterThan((counts.MID as number) / 4);
    expect((counts.MID as number) / 4).toBeGreaterThan((counts.DEF as number) / 4);
    expect(counts.DEF).toBeGreaterThan(0);
  });

  it("weights by the attribute rating", () => {
    const skilled = sheet.starters.map((p) =>
      p.id === "h-10" ? { ...p, attributes: { ...p.attributes, finishing: 1 } } : p,
    );
    const weakOthers = skilled.map((p) =>
      p.id === "h-10" ? p : { ...p, attributes: { ...p.attributes, finishing: 0.01 } },
    );
    const rng = createRng(3);
    const hits = Array.from(
      { length: 200 },
      () =>
        pickPlayer({ ...sheet, starters: weakOthers }, { stage: 2, attribute: "finishing" }, rng)
          .id,
    ).filter((id) => id === "h-10").length;

    expect(hits).toBeGreaterThan(100);
  });

  it("falls back to every outfield player when the position weights leave nobody", () => {
    const goalkeepers: TeamSheet = {
      ...sheet,
      starters: sheet.starters.map((p) => ({ ...p, position: "GK" as const })),
    };

    expect(pickPlayer(goalkeepers, { stage: 1, attribute: "passing" }, scripted(0)).id).toBe(
      (goalkeepers.starters[1] as EnginePlayer).id,
    );
  });
});

describe("pickChallenger", () => {
  const share = (stage: 0 | 1 | 2, position: string): number => {
    const rng = createRng(4);
    const picks = Array.from({ length: 600 }, () => pickChallenger(away, stage, rng));
    return (
      picks.filter(
        (id) => (away.starters.find((p) => p.id === id) as EnginePlayer).position === position,
      ).length / 600
    );
  };

  it("mirrors the ball's third: the attacker's own third is the challenger's final third", () => {
    expect(share(0, "FWD")).toBeGreaterThan(0.3);
    expect(share(2, "FWD")).toBeLessThan(0.1);
  });

  it("uses the middle third for the middle stage", () => {
    expect(share(1, "MID")).toBeGreaterThan(share(1, "DEF"));
    expect(share(1, "FWD")).toBeGreaterThan(share(1, "DEF"));
  });
});

describe("drawChain", () => {
  const draw = (changes: Partial<Parameters<typeof drawChain>[0]>, seed = 7) =>
    drawChain(plan(changes), createRng(seed));

  it("lets the link count grow with the stages gained and keeps it between 2 and 6", () => {
    const counts = (from: 0 | 1 | 2, endedIn: 0 | 1 | 2 | 3) =>
      Array.from({ length: 80 }, (_, seed) => draw({ from, endedIn }, seed).length);

    expect(Math.min(...counts(0, 0))).toBe(2);
    expect(Math.max(...counts(0, 0))).toBe(3);
    expect(Math.min(...counts(0, 3))).toBe(5);
    expect(Math.max(...counts(0, 3))).toBe(6);
    expect(Math.max(...counts(2, 3))).toBe(4);
  });

  it("starts with the goalkeeper on a goal kick and otherwise with an outfield player", () => {
    const kick = draw({ start: "goalKick", ball: { x: 5.5, y: 34 } });

    expect(kick[0].player).toBe("h-1");
    expect(positionOf(draw({}, 9)[0].player)).not.toBe("GK");
  });

  it("starts the first link where the ball was", () => {
    expect(draw({ ball: { x: 41, y: 12 } })[0].at).toEqual({ x: 41, y: 12 });
  });

  it("never repeats a player in two consecutive links", () => {
    for (let seed = 0; seed < 100; seed++) {
      const chain = draw({ endedIn: 3, shoots: true }, seed);
      chain.slice(1).forEach((link, i) => {
        expect(link.player).not.toBe(chain[i]?.player);
      });
    }
  });

  it("ends a shooting possession in the shooting band at shot depth", () => {
    for (let seed = 0; seed < 100; seed++) {
      const last = draw({ endedIn: 3, from: 2, shoots: true }, seed).at(-1);
      expect(last?.at.x).toBeGreaterThanOrEqual(SHOT_DEPTH_MIN);
      expect(last?.at.x).toBeLessThanOrEqual(SHOT_DEPTH_MAX);
      expect(last?.at.y).toBeGreaterThanOrEqual(22);
      expect(last?.at.y).toBeLessThanOrEqual(46);
    }
  });

  it("ends a failed possession no deeper than its stage and no further back than the ball", () => {
    for (let seed = 0; seed < 100; seed++) {
      const last = draw({ endedIn: 1, ball: { x: 30, y: 34 } }, seed).at(-1);
      expect(last?.at.x).toBeLessThanOrEqual(STAGE_END_DEPTH[1] + 4);
      expect(last?.at.x).toBeGreaterThanOrEqual(26);
    }
  });

  it("keeps the ball deeper than where it started when the end would be behind it", () => {
    const chain = draw({ endedIn: 0, from: 0, ball: { x: 34, y: 34 } }, 1);

    expect(chain.at(-1)?.at.x).toBeGreaterThanOrEqual(34 - 3);
  });

  it("flips the path for the away side so it runs towards x = 0", () => {
    const chain = drawChain(
      plan({ team: "away", sheet: away, ball: { x: 75, y: 34 }, endedIn: 3, shoots: true }),
      createRng(5),
    );

    expect(chain[0].at).toEqual({ x: 75, y: 34 });
    expect(chain.at(-1)?.at.x).toBeLessThan(105 - SHOT_DEPTH_MIN + 0.001);
    expect(chain.at(-1)?.at.x).toBeGreaterThan(105 - SHOT_DEPTH_MAX - 0.001);
  });

  it("stays on the pitch", () => {
    for (let seed = 0; seed < 100; seed++) {
      for (const link of draw({ endedIn: 3, shoots: true, from: 1 }, seed)) {
        expect(link.at.x).toBeGreaterThanOrEqual(0);
        expect(link.at.x).toBeLessThanOrEqual(105);
        expect(link.at.y).toBeGreaterThanOrEqual(0);
        expect(link.at.y).toBeLessThanOrEqual(PITCH_WIDTH);
      }
    }
  });

  it("puts the creator of a wing chance near a touchline", () => {
    const wide = Array.from({ length: 200 }, (_, seed) =>
      draw({ endedIn: 3, from: 2, shoots: true }, seed),
    )
      .map((chain) => chain.at(-2) as { at: { y: number } })
      .filter((link) => link.at.y < WIDE_OFFSET_MAX + 0.001 || link.at.y > PITCH_WIDTH - 3);

    expect(wide.length).toBeGreaterThan(20);
    for (const link of wide) {
      const fromLine = Math.min(link.at.y, PITCH_WIDTH - link.at.y);
      expect(fromLine).toBeGreaterThanOrEqual(WIDE_OFFSET_MIN - 0.001);
    }
  });

  it("makes a wing creator more likely with a wide tactic", () => {
    const wideSheet: TeamSheet = { ...sheet, tactics: { ...sheet.tactics, width: "wide" } };
    const narrowSheet: TeamSheet = { ...sheet, tactics: { ...sheet.tactics, width: "narrow" } };
    const wings = (s: TeamSheet): number =>
      Array.from({ length: 300 }, (_, seed) =>
        drawChain(plan({ sheet: s, endedIn: 3, from: 2, shoots: true }), createRng(seed)),
      ).filter((chain) => {
        const y = chain.at(-2)?.at.y as number;
        return y < WIDE_OFFSET_MAX + 0.001 || y > PITCH_WIDTH - WIDE_OFFSET_MAX - 0.001;
      }).length;

    expect(wings(wideSheet)).toBeGreaterThan(wings(narrowSheet));
  });

  it("is deterministic for a seed", () => {
    expect(draw({ endedIn: 3, shoots: true }, 11)).toEqual(draw({ endedIn: 3, shoots: true }, 11));
  });
});

describe("drawChain with a scripted draw", () => {
  it("places the waypoints on the line from the ball to the target, plus jitter", () => {
    // count 4, end depth 70 - 0.2 * 25, target y 0.25 * 68, first player, then per link x and y jitter and a player
    const chain = drawChain(
      plan(),
      scripted(0.5, 0.2, 0.25, 0.5, 0.9, 0.1, 0.5, 0.1, 0.9, 0.5, 0.5),
    );

    expect(chain).toHaveLength(4);
    expect(chain[0].at).toEqual({ x: 30, y: 34 });
    expect(chain[1].at.x).toBeCloseTo(30 + 35 / 3 + 0.4 * 4, 6);
    expect(chain[1].at.y).toBeCloseTo(34 - 17 / 3 - 0.4 * 14, 6);
    expect(chain[2].at.x).toBeCloseTo(30 + 70 / 3 - 0.4 * 4, 6);
    expect(chain[2].at.y).toBeCloseTo(34 - 34 / 3 + 0.4 * 14, 6);
    expect(chain[3].at.x).toBeCloseTo(65, 6);
    expect(chain[3].at.y).toBeCloseTo(17, 6);
  });

  it("keeps waypoints at least 1 m inside the touchlines", () => {
    const chain = drawChain(plan({ ball: { x: 30, y: 0 } }), scripted(0.5, 0.2, 0, 0.5, 0, 0, 0.5));

    expect(chain[1].at.y).toBe(1);
    const far = drawChain(
      plan({ ball: { x: 30, y: PITCH_WIDTH } }),
      scripted(0.5, 0.2, 0.999, 0.5, 0.999, 0.999, 0.5),
    );
    expect(far[1].at.y).toBe(PITCH_WIDTH - 1);
  });

  it("mirrors the path for the away side", () => {
    const chain = drawChain(
      plan({ team: "away", sheet: away, ball: { x: 75, y: 34 } }),
      scripted(0.5, 0.2, 0.25, 0.5, 0.9, 0.1, 0.5, 0.1, 0.9, 0.5, 0.5),
    );

    expect(chain[0].at).toEqual({ x: 75, y: 34 });
    expect(chain[3].at.x).toBeCloseTo(105 - 65, 6);
  });

  it("puts the shooter in the shooting band at a depth drawn from the shot range", () => {
    // from stage 2: count 3, depth 0.25 of the range, y 0.25 of the band
    const chain = drawChain(
      plan({ ball: { x: 70, y: 34 }, from: 2, endedIn: 3, shoots: true }),
      scripted(0, 0.25, 0.25, 0.5, 0.99, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5),
    );

    expect(chain.at(-1)?.at.x).toBeCloseTo(SHOT_DEPTH_MIN + 0.25 * 12, 6);
    expect(chain.at(-1)?.at.y).toBeCloseTo(22 + 0.25 * 24, 6);
  });

  it.each([
    [0.2, WIDE_OFFSET_MIN + 0.5 * (WIDE_OFFSET_MAX - WIDE_OFFSET_MIN)],
    [0.5, PITCH_WIDTH - (WIDE_OFFSET_MIN + 0.5 * (WIDE_OFFSET_MAX - WIDE_OFFSET_MIN))],
    [0.7, PITCH_WIDTH - (WIDE_OFFSET_MIN + 0.5 * (WIDE_OFFSET_MAX - WIDE_OFFSET_MIN))],
  ])("places a wing creator on the side drawn %s", (side, y) => {
    // count 3; the creator (link 1) is on the wing: chance 0.1, waypoint jitter, offset 0.5, side
    const chain = drawChain(
      plan({ ball: { x: 70, y: 34 }, from: 2, endedIn: 3, shoots: true }),
      scripted(0, 0, 0.5, 0.5, 0.1, 0.5, 0.5, 0.5, side),
    );

    expect(chain[1].at.y).toBeCloseTo(y, 6);
    expect(chain[1].at.x).toBeCloseTo(77, 6);
  });

  it("leaves the creator in the middle when the wing draw fails", () => {
    const chain = drawChain(
      plan({ ball: { x: 70, y: 34 }, from: 2, endedIn: 3, shoots: true }),
      scripted(0, 0, 0.5, 0.5, 0.5),
    );

    expect(chain[1].at.y).toBeCloseTo(34, 6);
  });

  it("does not draw a wing creator for a possession that does not shoot", () => {
    const chain = drawChain(
      plan({ ball: { x: 70, y: 34 }, from: 2, endedIn: 3 }),
      scripted(0, 0, 0.5, 0.5, 0.1, 0.5, 0.5, 0.5, 0.1),
    );

    expect(chain[1].at.y).toBeGreaterThan(20);
  });
});

describe("drawChain weights", () => {
  const only = (id: string, attribute: string): TeamSheet => ({
    ...sheet,
    starters: sheet.starters.map((p) => ({
      ...p,
      attributes: { ...p.attributes, finishing: 0.01, vision: 0.01, passing: 0.01 },
      ...(p.id === id
        ? {
            attributes: {
              ...p.attributes,
              finishing: 0.01,
              vision: 0.01,
              passing: 0.01,
              [attribute]: 1,
            },
          }
        : {}),
    })),
  });
  const share = (s: TeamSheet, index: number, from: 0 | 2 = 2): number => {
    let hits = 0;
    for (let seed = 0; seed < 150; seed++) {
      const chain = drawChain(
        plan({
          sheet: s,
          ball: { x: from === 2 ? 70 : 20, y: 34 },
          from,
          endedIn: 3,
          shoots: true,
        }),
        createRng(seed),
      );
      if (chain[index < 0 ? chain.length + index : index]?.player === "h-10") hits++;
    }
    return hits / 150;
  };

  it("picks the shooter by finishing", () => {
    expect(share(only("h-10", "finishing"), -1)).toBeGreaterThan(0.5);
  });

  it("picks the creator by vision", () => {
    expect(share(only("h-10", "vision"), -2)).toBeGreaterThan(0.5);
  });

  it("picks the other links by passing", () => {
    const byPassing = share(only("h-10", "passing"), 1, 0);

    expect(byPassing).toBeGreaterThan(0.2);
    expect(byPassing).toBeGreaterThan(share(only("h-10", "finishing"), 1, 0) + 0.1);
  });

  it("weights every link of a possession that does not shoot by passing", () => {
    const s = only("h-10", "passing");
    const hits = Array.from({ length: 150 }, (_, seed) =>
      drawChain(plan({ sheet: s, ball: { x: 70, y: 34 }, from: 2, endedIn: 2 }), createRng(seed)),
    ).filter((chain) => chain.at(-1)?.player === "h-10").length;

    expect(hits / 150).toBeGreaterThan(0.4);
  });
});
