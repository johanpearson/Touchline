import { describe, expect, it } from "vitest";
import type { Side } from "../match-state";
import { aTeamSheet } from "./action-builders";
import { PITCH_LENGTH, type Point } from "./pitch-metres";
import {
  FREE_KICK_BOX_RUNNERS,
  FREE_KICK_KEEPER_DEPTH,
  FREE_KICK_KEEPER_SHIFT_MAX,
  FREE_KICK_RANGE,
  MARKER_GOALSIDE,
} from "./set-piece-constants";
import { inFreeKickRange, setPieceShape } from "./set-piece-shape";

const sheets = { home: aTeamSheet().build(), away: aTeamSheet().build() };
const CENTRE_Y = 34;
const has = (points: readonly Point[], p: Point) =>
  points.some((q) => Math.hypot(q.x - p.x, q.y - p.y) < 1e-9);
const sorted = (slots: readonly number[]) => [...slots].sort((a, b) => a - b);
const foeOf = (side: Side): Side => (side === "home" ? "away" : "home");
const mirror = (p: Point): Point => ({ x: PITCH_LENGTH - p.x, y: p.y });
const spotFor = (side: Side, p: Point): Point => (side === "home" ? p : mirror(p));

describe.each(["home", "away"] as const)("set-piece roles for the %s side", (side) => {
  const foe = foeOf(side);

  it("lists the taker and the support player of a kickoff, and nobody on the other side", () => {
    const l = setPieceShape("kickoff", side, spotFor(side, { x: 52.5, y: 34 }), sheets);
    expect(sorted(l.roles[side])).toEqual(sorted([l.taker, ...l.targets]));
    expect(l.roles[foe]).toEqual([]);
  });

  it("lists the thrower and two options, and the two markers, of a throw-in", () => {
    const l = setPieceShape("throwIn", side, spotFor(side, { x: 40, y: 0 }), sheets);
    expect(sorted(l.roles[side])).toEqual(sorted([l.taker, ...l.targets]));
    expect(l.targets).toHaveLength(2);
    expect(l.roles[foe]).toHaveLength(2);
  });

  it("lists the keeper and two defenders of a goal kick, and the opposing keeper and four pressers", () => {
    const l = setPieceShape("goalKick", side, spotFor(side, { x: 5.5, y: 34 }), sheets);
    expect(l.roles[side]).toHaveLength(3);
    expect(l.roles[side]).toContain(l.taker);
    expect(l.roles[foe]).toHaveLength(5);
    expect(l.roles[foe]).toContain(0);
    expect(l.roles[side]).not.toContain(l.targets[0]);
  });

  it("lists taker, three runners, two box-edge players and two cover players of a corner", () => {
    const l = setPieceShape("corner", side, spotFor(side, { x: 105, y: 0 }), sheets);
    expect(l.roles[side]).toHaveLength(1 + 3 + 2 + 2);
    expect(l.roles[side]).toContain(l.taker);
    for (const target of l.targets) expect(l.roles[side]).toContain(target);
    expect(l.roles[foe]).toContain(0);
    expect(l.roles[foe].length).toBeGreaterThan(3);
  });

  it("lists the keeper, the wall and the box markers on the defending side of a free kick in range", () => {
    const l = setPieceShape("freeKick", side, spotFor(side, { x: 80, y: 34 }), sheets);
    expect(l.roles[side]).toContain(l.taker);
    expect(l.roles[foe]).toContain(0);
    for (const slot of l.wall) expect(l.roles[foe]).toContain(slot);
    expect(l.roles[foe].length).toBeGreaterThan(1 + l.wall.length);
    expect(l.targets).toEqual([]);
  });

  it("lists only the taker and the runners of a free kick out of range", () => {
    const l = setPieceShape("freeKick", side, spotFor(side, { x: 40, y: 20 }), sheets);
    expect(sorted(l.roles[side])).toEqual(sorted([l.taker, ...l.targets]));
    expect(l.roles[foe]).toEqual([]);
    expect(l.wall).toEqual([]);
  });

  it("lists the taker against the keeper of a penalty", () => {
    const l = setPieceShape("penalty", side, spotFor(side, { x: 94, y: 34 }), sheets);
    expect(l.roles[side]).toEqual([l.taker]);
    expect(l.roles[foe]).toEqual([0]);
    expect(l.targets).toEqual([]);
    expect(l.wall).toEqual([]);
  });
});

describe("set-piece wall and receivers", () => {
  it.each([
    ["kickoff", { x: 52.5, y: 34 }],
    ["throwIn", { x: 40, y: 0 }],
    ["goalKick", { x: 5.5, y: 34 }],
    ["corner", { x: 105, y: 0 }],
    ["freeKick", { x: 40, y: 20 }],
    ["penalty", { x: 94, y: 34 }],
  ] as const)("builds no wall for a %s", (kind, spot) => {
    expect(setPieceShape(kind, "home", spot, sheets).wall).toEqual([]);
  });

  it("offers only midfielders and forwards as receivers of a goal kick, and never the keeper", () => {
    const l = setPieceShape("goalKick", "home", { x: 5.5, y: 34 }, sheets);
    const starters = sheets.home.starters;
    expect(l.targets.length).toBeGreaterThan(0);
    for (const slot of l.targets) {
      expect(slot).not.toBe(0);
      expect(["MID", "FWD"]).toContain(starters[slot]?.position);
    }
    const outfield = starters.flatMap((p, i) =>
      p.position === "MID" || p.position === "FWD" ? [i] : [],
    );
    expect(sorted(l.targets)).toEqual(sorted(outfield));
  });
});

describe("free kick range", () => {
  const goalDistance = (x: number) => PITCH_LENGTH - x;

  it("counts a spot exactly at the range as in range, and a hair further out as out of range", () => {
    const edge = { x: PITCH_LENGTH - FREE_KICK_RANGE, y: CENTRE_Y };
    expect(goalDistance(edge.x)).toBe(FREE_KICK_RANGE);
    expect(inFreeKickRange("home", edge)).toBe(true);
    expect(inFreeKickRange("home", { ...edge, x: edge.x - 0.01 })).toBe(false);
    expect(inFreeKickRange("away", mirror(edge))).toBe(true);
    expect(inFreeKickRange("away", mirror({ ...edge, x: edge.x - 0.01 }))).toBe(false);
  });

  it("builds a wall exactly at the range and none a hair further out", () => {
    const edge = { x: PITCH_LENGTH - FREE_KICK_RANGE, y: CENTRE_Y };
    expect(setPieceShape("freeKick", "home", edge, sheets).wall.length).toBeGreaterThan(0);
    expect(setPieceShape("freeKick", "home", { ...edge, x: edge.x - 0.01 }, sheets).wall).toEqual(
      [],
    );
  });

  it("puts the wall between the ball and the goal for a kick from the side", () => {
    const spot = { x: 85, y: 12 };
    const l = setPieceShape("freeKick", "home", spot, sheets);
    const goal = { x: PITCH_LENGTH, y: CENTRE_Y };
    const total = Math.hypot(goal.x - spot.x, goal.y - spot.y);
    for (const slot of l.wall) {
      const p = l.away[slot] as Point;
      const along =
        ((p.x - spot.x) * (goal.x - spot.x) + (p.y - spot.y) * (goal.y - spot.y)) / total;
      expect(along).toBeCloseTo(9.15, 6);
    }
  });
});

describe("free kick keeper and box players", () => {
  it("shifts the keeper towards the side of the kick by a tenth of the offset", () => {
    const low = setPieceShape("freeKick", "home", { x: 90, y: 24 }, sheets);
    expect(low.away[0]).toEqual({ x: FREE_KICK_KEEPER_DEPTH, y: CENTRE_Y - 1 });
    const high = setPieceShape("freeKick", "home", { x: 90, y: 44 }, sheets);
    expect(high.away[0]).toEqual({ x: FREE_KICK_KEEPER_DEPTH, y: CENTRE_Y + 1 });
  });

  it("limits the keeper's shift to the maximum on either side", () => {
    const low = setPieceShape("freeKick", "home", { x: 100, y: 6 }, sheets);
    expect(low.away[0]).toEqual({
      x: FREE_KICK_KEEPER_DEPTH,
      y: CENTRE_Y - FREE_KICK_KEEPER_SHIFT_MAX,
    });
    const high = setPieceShape("freeKick", "home", { x: 100, y: 62 }, sheets);
    expect(high.away[0]).toEqual({
      x: FREE_KICK_KEEPER_DEPTH,
      y: CENTRE_Y + FREE_KICK_KEEPER_SHIFT_MAX,
    });
  });

  it("sends two runners into the box and marks each of them goalside", () => {
    const l = setPieceShape("freeKick", "home", { x: 80, y: 34 }, sheets);
    for (const r of FREE_KICK_BOX_RUNNERS) {
      expect(has(l.home, { x: r.x, y: CENTRE_Y + r.y })).toBe(true);
      expect(has(l.away, { x: r.x + MARKER_GOALSIDE, y: CENTRE_Y + r.y })).toBe(true);
    }
  });
});
