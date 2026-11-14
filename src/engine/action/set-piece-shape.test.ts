import { describe, expect, it } from "vitest";
import { anEnginePlayer, aTeamSheet } from "./action-builders";
import { inPitch, PITCH_LENGTH, type Point } from "./pitch-metres";
import { inFreeKickRange, type SetPieceLayout, setPieceShape } from "./set-piece-shape";
import { MIN_PLAYER_DISTANCE } from "./shape-constants";

const sheets = { home: aTeamSheet().build(), away: aTeamSheet().build() };
const near = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) < 1e-9;
const has = (points: readonly Point[], p: Point) => points.some((q) => near(q, p));
const mirror = (p: Point): Point => ({ x: PITCH_LENGTH - p.x, y: p.y });
const all = (l: SetPieceLayout) => [...l.home, ...l.away];

describe("setPieceShape", () => {
  it("puts the kickoff taker on the spot, the support in the circle and everyone in their own half", () => {
    const l = setPieceShape("kickoff", "home", { x: 52.5, y: 34 }, sheets);

    expect(l.home[l.taker]).toEqual({ x: 52.5, y: 34 });
    expect(l.targets).toHaveLength(1);
    expect(l.home[l.targets[0] as number]).toEqual({ x: 50.5, y: 38 });
    expect(l.home.every((p) => p.x <= 52.5)).toBe(true);
    expect(l.away.every((p) => p.x >= 52.5)).toBe(true);
    expect(l.away.every((p) => Math.hypot(p.x - 52.5, p.y - 34) >= 9.15)).toBe(true);
  });

  it("puts the thrower on the line, two options and a marker goalside of each", () => {
    const l = setPieceShape("throwIn", "home", { x: 40, y: 0 }, sheets);
    const options = [
      { x: 48, y: 7 },
      { x: 34, y: 11 },
    ];

    expect(l.home[l.taker]).toEqual({ x: 40, y: 0 });
    expect(l.targets.map((s) => l.home[s])).toEqual(options);
    expect(has(l.away, { x: 50, y: 7 })).toBe(true);
    expect(has(l.away, { x: 36, y: 11 })).toBe(true);
  });

  it("puts the keeper on a goal kick, splits two defenders and presses with four", () => {
    const l = setPieceShape("goalKick", "home", { x: 5.5, y: 34 }, sheets);

    expect(l.taker).toBe(0);
    expect(l.home[0]).toEqual({ x: 5.5, y: 34 });
    expect(has(l.home, { x: 12, y: 17 })).toBe(true);
    expect(has(l.home, { x: 12, y: 51 })).toBe(true);
    for (const y of [14, 28, 40, 54]) expect(has(l.away, { x: 26, y })).toBe(true);
    expect(l.away.every((p) => p.x >= 17.5)).toBe(true);
    expect(l.targets.every((s) => s !== 0)).toBe(true);
    expect(l.targets.length).toBeGreaterThan(0);
  });

  it("sets up a corner with runners at both posts, the penalty spot, the box edge and cover", () => {
    const l = setPieceShape("corner", "home", { x: 105, y: 0 }, sheets);

    expect(l.home[l.taker]).toEqual({ x: 105, y: 0 });
    expect(l.targets.map((s) => l.home[s])).toEqual([
      { x: 101, y: 29.5 },
      { x: 101, y: 38.5 },
      { x: 94, y: 34 },
    ]);
    for (const p of [
      { x: 88, y: 23 },
      { x: 88, y: 45 },
      { x: 50, y: 24 },
      { x: 50, y: 44 },
    ]) {
      expect(has(l.home, p)).toBe(true);
    }
    expect(l.away[0]).toEqual({ x: 104, y: 34 });
    expect(has(l.away, { x: 103, y: 29.5 })).toBe(true);
  });

  it("builds a wall of four at 9.15 m on the line to goal for a free kick in range", () => {
    const l = setPieceShape("freeKick", "home", { x: 80, y: 34 }, sheets);

    expect(inFreeKickRange("home", { x: 80, y: 34 })).toBe(true);
    expect(l.home[l.taker]).toEqual({ x: 80, y: 34 });
    expect(l.wall).toHaveLength(4);
    expect(l.wall.map((s) => l.away[s])).toEqual([
      { x: 89.15, y: 32.8 },
      { x: 89.15, y: 33.6 },
      { x: 89.15, y: 34.4 },
      { x: 89.15, y: 35.2 },
    ]);
    expect(l.away[0]).toEqual({ x: 103.5, y: 34 });
  });

  it("has no wall for a free kick out of range", () => {
    const l = setPieceShape("freeKick", "home", { x: 40, y: 20 }, sheets);

    expect(inFreeKickRange("home", { x: 40, y: 20 })).toBe(false);
    expect(l.wall).toEqual([]);
    expect(l.targets).toHaveLength(2);
    expect(l.home[l.taker]).toEqual({ x: 40, y: 20 });
  });

  it("puts the penalty taker on the spot, the keeper on the line and everyone else outside the box and arc", () => {
    const l = setPieceShape("penalty", "home", { x: 94, y: 34 }, sheets);

    expect(l.home[l.taker]).toEqual({ x: 94, y: 34 });
    expect(l.away[0]).toEqual({ x: 105, y: 34 });
    const others = [...l.home.filter((_, i) => i !== l.taker), ...l.away.filter((_, i) => i !== 0)];
    for (const p of others) {
      expect(p.x).toBeLessThanOrEqual(84.5);
      expect(Math.hypot(p.x - 94, p.y - 34)).toBeGreaterThanOrEqual(9.15);
    }
  });

  it.each([
    ["kickoff", { x: 52.5, y: 34 }],
    ["throwIn", { x: 60, y: 68 }],
    ["goalKick", { x: 5.5, y: 34 }],
    ["corner", { x: 105, y: 68 }],
    ["freeKick", { x: 85, y: 20 }],
    ["freeKick", { x: 30, y: 50 }],
    ["penalty", { x: 94, y: 34 }],
  ] as const)("mirrors a %s for the away side", (kind, spot) => {
    const home = setPieceShape(kind, "home", spot, sheets);
    const away = setPieceShape(kind, "away", mirror(spot), sheets);

    expect(away.taker).toBe(home.taker);
    expect(away.targets).toEqual(home.targets);
    expect(away.wall).toEqual(home.wall);
    expect(home.home.map((p, i) => near(mirror(p), away.away[i] as Point))).not.toContain(false);
    expect(home.away.map((p, i) => near(mirror(p), away.home[i] as Point))).not.toContain(false);
  });

  it("keeps 22 players inside the pitch for every kind and many spots", () => {
    const kinds = ["kickoff", "throwIn", "goalKick", "corner", "freeKick", "penalty"] as const;
    for (const kind of kinds) {
      for (const side of ["home", "away"] as const) {
        for (let x = 0; x <= 105; x += 15) {
          for (let y = 0; y <= 68; y += 17) {
            const l = setPieceShape(kind, side, { x, y }, sheets);
            expect(all(l)).toHaveLength(22);
            expect(all(l).every(inPitch)).toBe(true);
          }
        }
      }
    }
  });

  it("takes corners and free kicks with the best passer plus vision", () => {
    const starters = sheets.home.starters.map((p, i) =>
      i === 6 ? anEnginePlayer(p.id).withAttribute("vision", 18).build() : p,
    );
    const custom = { ...sheets, home: aTeamSheet().withStarters(starters).build() };

    expect(setPieceShape("corner", "home", { x: 105, y: 0 }, custom).taker).toBe(6);
    expect(setPieceShape("freeKick", "home", { x: 80, y: 34 }, custom).taker).toBe(6);
  });
});

describe("setPieceShape spacing", () => {
  const kinds = ["kickoff", "throwIn", "goalKick", "corner", "freeKick", "penalty"] as const;
  const closePairs = (
    points: readonly Point[],
    exempt: (i: number, j: number) => boolean,
  ): string[] =>
    points.flatMap((a, i) =>
      points.flatMap((b, j) =>
        j > i && !exempt(i, j) && Math.hypot(a.x - b.x, a.y - b.y) < MIN_PLAYER_DISTANCE - 1e-6
          ? [`${i}-${j}`]
          : [],
      ),
    );

  it("keeps players of one side at least MIN_PLAYER_DISTANCE apart, except the taker and pairs of role points", () => {
    const violations: string[] = [];
    for (const kind of kinds) {
      for (const side of ["home", "away"] as const) {
        for (let x = 0; x <= 105; x += 7.5) {
          for (let y = 0; y <= 68; y += 8.5) {
            const l = setPieceShape(kind, side, { x, y }, sheets);
            const own = side === "home" ? l.home : l.away;
            const opp = side === "home" ? l.away : l.home;
            const label = `${kind} ${side} (${x},${y})`;
            const bothRoles = (slots: readonly number[]) => (i: number, j: number) =>
              slots.includes(i) && slots.includes(j);
            for (const pair of closePairs(
              own,
              (i, j) => i === l.taker || j === l.taker || bothRoles(l.roles[side])(i, j),
            ))
              violations.push(`${label} own ${pair}`);
            const foe = side === "home" ? "away" : "home";
            for (const pair of closePairs(opp, bothRoles(l.roles[foe])))
              violations.push(`${label} opp ${pair}`);
          }
        }
      }
    }
    expect(violations).toEqual([]);
  });
});

describe("setPieceShape roles", () => {
  it("lists the taker and keeps role points exact while unassigned players move", () => {
    const l = setPieceShape("corner", "home", { x: 105, y: 0 }, sheets);

    expect(l.roles.home).toContain(l.taker);
    expect(l.roles.home).toHaveLength(1 + 3 + 2 + 2);
    expect(l.roles.away).toContain(0);
  });
});
