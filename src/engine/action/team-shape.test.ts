import { describe, expect, it } from "vitest";
import { NEUTRAL_TACTICS, type TeamTactics } from "../tactics";
import { aTeamSheet } from "./action-builders";
import { inPitch, PITCH_LENGTH, type Point } from "./pitch-metres";
import { FORWARD_LANE_SPACING, MIN_PLAYER_DISTANCE } from "./shape-constants";
import type { TeamPhase } from "./team-phase";
import { formationAnchors, shapeParameters, teamShape } from "./team-shape";
import type { FormationCounts } from "./team-sheet";

const FORMATIONS: FormationCounts[] = [
  { defenders: 4, midfielders: 4, forwards: 2 },
  { defenders: 4, midfielders: 3, forwards: 3 },
  { defenders: 4, midfielders: 5, forwards: 1 },
  { defenders: 3, midfielders: 5, forwards: 2 },
  { defenders: 5, midfielders: 3, forwards: 2 },
  { defenders: 3, midfielders: 4, forwards: 3 },
];
const PHASES: TeamPhase[] = [
  "buildUp",
  "progression",
  "attack",
  "defending",
  "transition",
  "setPiece",
];
const sheetFor = (formation: FormationCounts) => aTeamSheet().withFormation(formation).build();
const sheet442 = sheetFor(FORMATIONS[0] as FormationCounts);
const centre: Point = { x: 52.5, y: 34 };
const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
const outfield = (points: Point[]) => points.slice(1);
const spread = (points: Point[]) =>
  Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y));

describe("formationAnchors", () => {
  it("places a 4-4-2 as goalkeeper, then lines at fixed depths with evenly spread lanes", () => {
    const anchors = formationAnchors(FORMATIONS[0] as FormationCounts);
    expect(anchors).toHaveLength(11);
    expect(anchors[0]).toEqual({ depth: 5, y: 34 });
    expect(anchors.slice(1, 5).map((a) => [a.depth, a.y])).toEqual([
      [30, 13.6],
      [30, 27.2],
      [30, 40.8],
      [30, 54.4],
    ]);
    expect(anchors.slice(5, 9).every((a) => a.depth === 52)).toBe(true);
    expect(anchors.slice(9).map((a) => a.y)).toEqual([28, 40]);
    expect(anchors.slice(9).every((a) => a.depth === 72)).toBe(true);
  });

  it("keeps the forwards in the central channel, FORWARD_LANE_SPACING apart, whatever their number", () => {
    const forwardsOf = (forwards: number) =>
      formationAnchors({ defenders: 4, midfielders: 6 - forwards, forwards })
        .slice(-forwards)
        .map((a) => a.y);
    expect(FORWARD_LANE_SPACING).toBe(12);
    expect(forwardsOf(1)).toEqual([34]);
    expect(forwardsOf(2)).toEqual([28, 40]);
    expect(forwardsOf(3)).toEqual([22, 34, 46]);
  });

  it.each(FORMATIONS)("gives 11 ordered anchors for %j", (formation) => {
    const anchors = formationAnchors(formation);
    expect(anchors).toHaveLength(11);
    for (let i = 2; i < 11; i++) {
      const [a, b] = [anchors[i - 1], anchors[i]];
      expect(b && a && (b.depth > a.depth || (b.depth === a.depth && b.y > a.y))).toBe(true);
    }
  });
});

describe("shapeParameters", () => {
  it("is the baseline for neutral tactics", () => {
    expect(shapeParameters(NEUTRAL_TACTICS)).toEqual({ lineHeight: 0, compactness: 1, width: 1 });
  });

  it("combines pressing and mentality", () => {
    const p = shapeParameters({
      mentality: "attacking",
      pressing: "high",
      width: "wide",
      tempo: "normal",
    });
    expect(p.lineHeight).toBe(5);
    expect(p.compactness).toBeCloseTo(0.94 * 1.04, 10);
    expect(p.width).toBe(1.35);
    const q = shapeParameters({
      mentality: "defensive",
      pressing: "low",
      width: "narrow",
      tempo: "fast",
    });
    expect(q.lineHeight).toBe(-5.5);
    expect(q.compactness).toBeCloseTo(1.05 * 0.96, 10);
    expect(q.width).toBe(0.9);
  });
});

describe("teamShape", () => {
  it("returns 11 points with the goalkeeper first and deepest", () => {
    const shape = teamShape(sheet442, NEUTRAL_TACTICS, "progression", centre, "home");
    expect(shape).toHaveLength(11);
    expect(Math.min(...shape.map((p) => p.x))).toBe(shape[0]?.x);
  });

  it("is deterministic", () => {
    const a = teamShape(sheet442, NEUTRAL_TACTICS, "attack", { x: 80, y: 10 }, "home");
    expect(teamShape(sheet442, NEUTRAL_TACTICS, "attack", { x: 80, y: 10 }, "home")).toEqual(a);
  });

  it("pushes the block up in attacking phases and back in defending ones", () => {
    const x = (phase: TeamPhase) =>
      mean(outfield(teamShape(sheet442, NEUTRAL_TACTICS, phase, centre, "home")).map((p) => p.x));
    expect(x("attack")).toBeGreaterThan(x("progression"));
    expect(x("progression")).toBeGreaterThan(x("buildUp"));
    expect(x("buildUp")).toBeGreaterThan(x("defending"));
  });

  it("moves the whole block by exactly the phase shift when the ball is far from every player", () => {
    const ball: Point = { x: 52.5, y: 34 };
    const base = teamShape(sheet442, NEUTRAL_TACTICS, "progression", ball, "home");
    const attack = teamShape(sheet442, NEUTRAL_TACTICS, "attack", ball, "home");
    // The back four are not among the two nearest to the centre spot, so they move exactly 8 m.
    expect(attack[1]?.x).toBeCloseTo((base[1]?.x ?? 0) + 8, 6);
    expect(attack[0]?.x).toBeCloseTo((base[0]?.x ?? 0) + 2, 6);
  });

  it("places a high line further up than a low line", () => {
    const x = (pressing: TeamTactics["pressing"]) =>
      teamShape(sheet442, { ...NEUTRAL_TACTICS, pressing }, "progression", centre, "home")[1]?.x ??
      0;
    expect(x("high")).toBeGreaterThan(x("medium"));
    expect(x("medium")).toBeGreaterThan(x("low"));
  });

  it("is wider with wide and narrower with narrow", () => {
    const s = (width: TeamTactics["width"]) =>
      spread(teamShape(sheet442, { ...NEUTRAL_TACTICS, width }, "progression", centre, "home"));
    expect(s("wide")).toBeGreaterThan(s("normal"));
    expect(s("normal")).toBeGreaterThan(s("narrow"));
  });

  it("is shorter between the lines with high pressing than with low pressing", () => {
    const length = (pressing: TeamTactics["pressing"]) => {
      const shape = teamShape(
        sheet442,
        { ...NEUTRAL_TACTICS, pressing },
        "progression",
        centre,
        "home",
      );
      return (shape[9]?.x ?? 0) - (shape[1]?.x ?? 0);
    };
    expect(length("high")).toBeLessThan(length("medium"));
    expect(length("medium")).toBeLessThan(length("low"));
  });

  it("shifts the block towards the ball, vertically and laterally, by a bounded amount", () => {
    const at = (ball: Point) => teamShape(sheet442, NEUTRAL_TACTICS, "progression", ball, "home");
    const far = at({ x: 100, y: 34 });
    const near = at({ x: 5, y: 34 });
    expect((far[1]?.x ?? 0) - (near[1]?.x ?? 0)).toBeCloseTo(12, 6);
    const left = at({ x: 52.5, y: 0 });
    const right = at({ x: 52.5, y: 68 });
    expect((right[1]?.y ?? 0) - (left[1]?.y ?? 0)).toBeCloseTo(10, 6);
  });

  it("moves the nearest player towards the ball", () => {
    const ball = { x: 60, y: 60 };
    const withBall = teamShape(sheet442, NEUTRAL_TACTICS, "progression", ball, "home");
    const distanceTo = (p?: Point) => Math.hypot((p?.x ?? 0) - ball.x, (p?.y ?? 0) - ball.y);
    const anchors = formationAnchors(sheet442.formation);
    const nearestAnchor = Math.min(
      ...anchors.slice(1).map((a) => Math.hypot(a.depth - ball.x, a.y - ball.y)),
    );
    expect(Math.min(...withBall.slice(1).map(distanceTo))).toBeLessThan(nearestAnchor);
  });

  it.each(PHASES)("makes the away side the mirror of the home side in the %s phase", (phase) => {
    const ball = { x: 30, y: 12 };
    const home = teamShape(
      sheet442,
      NEUTRAL_TACTICS,
      phase,
      { x: PITCH_LENGTH - ball.x, y: ball.y },
      "home",
    );
    const away = teamShape(sheet442, NEUTRAL_TACTICS, phase, ball, "away");
    expect(away).toEqual(home.map((p) => ({ x: PITCH_LENGTH - p.x, y: p.y })));
  });

  it.each(FORMATIONS)(
    "keeps every player on the pitch and apart for %j in all phases, tactics and ball positions",
    (formation) => {
      const tactics: TeamTactics[] = [];
      for (const mentality of ["defensive", "balanced", "attacking"] as const)
        for (const pressing of ["low", "medium", "high"] as const)
          for (const width of ["narrow", "normal", "wide"] as const)
            tactics.push({ mentality, pressing, width, tempo: "normal" });
      {
        const sheet = sheetFor(formation);
        for (const phase of PHASES)
          for (const t of tactics)
            for (const side of ["home", "away"] as const)
              for (let bx = 0; bx <= 105; bx += 15)
                for (let by = 0; by <= 68; by += 17) {
                  const shape = teamShape(sheet, t, phase, { x: bx, y: by }, side);
                  expect(shape.every(inPitch)).toBe(true);
                  for (let i = 0; i < 11; i++)
                    for (let j = i + 1; j < 11; j++) {
                      const [a, b] = [shape[i], shape[j]];
                      const d = Math.hypot((a?.x ?? 0) - (b?.x ?? 0), (a?.y ?? 0) - (b?.y ?? 0));
                      if (d < MIN_PLAYER_DISTANCE - 1e-6)
                        throw new Error(
                          `too close ${d} ${JSON.stringify({ formation, phase, t, bx, by, side })}`,
                        );
                    }
                }
      }
    },
  );
});

describe("shapeParameters and mentality", () => {
  it("lowers compactness for defensive and raises it for attacking mentality", () => {
    const base = shapeParameters(NEUTRAL_TACTICS).compactness;
    expect(
      shapeParameters({ ...NEUTRAL_TACTICS, mentality: "defensive" }).compactness,
    ).toBeLessThan(base);
    expect(
      shapeParameters({ ...NEUTRAL_TACTICS, mentality: "attacking" }).compactness,
    ).toBeGreaterThan(base);
  });
});
