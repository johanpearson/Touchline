import type { Side } from "../match-state";
import type { TeamTactics } from "../tactics";
import { PITCH_LENGTH, PITCH_WIDTH, type Point } from "./pitch-metres";
import {
  ATTACK_DEPTH,
  BALL_CLOSE_IN,
  BALL_PULL_DEPTH,
  BALL_PULL_DEPTH_MAX,
  BALL_PULL_LATERAL,
  BALL_PULL_LATERAL_MAX,
  CENTRE_Y,
  DEFENCE_DEPTH,
  GOALKEEPER_DEPTH,
  GOALKEEPER_FOLLOW,
  HALF_WAY,
  MENTALITY_COMPACTNESS,
  MENTALITY_LINE_HEIGHT,
  MIDFIELD_DEPTH,
  MIN_PLAYER_DISTANCE,
  PHASE_SHIFT,
  PITCH_MARGIN,
  PRESSING_COMPACTNESS,
  PRESSING_LINE_HEIGHT,
  SPREAD_PASSES,
  WIDTH_SCALE,
} from "./shape-constants";
import type { TeamPhase } from "./team-phase";
import type { FormationCounts, TeamSheet } from "./team-sheet";

/** A position in the side's own frame: depth from its own goal line and y across the pitch. */
type Local = { depth: number; y: number };

export type ShapeParameters = {
  /** Metres the block moves up the pitch (negative: back). */
  lineHeight: number;
  /** Multiplier on the distance between lines; below 1 is more compact. */
  compactness: number;
  /** Multiplier on the lateral spread. */
  width: number;
};

export const shapeParameters = (tactics: TeamTactics): ShapeParameters => ({
  lineHeight: PRESSING_LINE_HEIGHT[tactics.pressing] + MENTALITY_LINE_HEIGHT[tactics.mentality],
  compactness: PRESSING_COMPACTNESS[tactics.pressing] * MENTALITY_COMPACTNESS[tactics.mentality],
  width: WIDTH_SCALE[tactics.width],
});

const lanes = (count: number, depth: number): Local[] =>
  Array.from({ length: count }, (_, lane) => ({
    depth,
    y: (PITCH_WIDTH * (lane + 1)) / (count + 1),
  }));

/** Neutral anchors: goalkeeper, then defenders, midfielders and forwards, lanes from left to right. */
export const formationAnchors = (formation: FormationCounts): Local[] => [
  { depth: GOALKEEPER_DEPTH, y: CENTRE_Y },
  ...lanes(formation.defenders, DEFENCE_DEPTH),
  ...lanes(formation.midfielders, MIDFIELD_DEPTH),
  ...lanes(formation.forwards, ATTACK_DEPTH),
];

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const clampLocal = (p: Local): Local => ({
  depth: clamp(p.depth, PITCH_MARGIN, PITCH_LENGTH - PITCH_MARGIN),
  y: clamp(p.y, PITCH_MARGIN, PITCH_WIDTH - PITCH_MARGIN),
});

const applyBlock = (anchors: Local[], params: ShapeParameters, phase: TeamPhase): Local[] => {
  const shift = PHASE_SHIFT[phase] + params.lineHeight;
  return anchors.map((a, slot) =>
    slot === 0
      ? { depth: a.depth + shift * GOALKEEPER_FOLLOW, y: a.y }
      : {
          depth: DEFENCE_DEPTH + (a.depth - DEFENCE_DEPTH) * params.compactness + shift,
          y: CENTRE_Y + (a.y - CENTRE_Y) * params.width,
        },
  );
};

const pullBlock = (block: Local[], ball: Local): Local[] => {
  const dDepth = clamp(
    BALL_PULL_DEPTH * (ball.depth - HALF_WAY),
    -BALL_PULL_DEPTH_MAX,
    BALL_PULL_DEPTH_MAX,
  );
  const dY = clamp(
    BALL_PULL_LATERAL * (ball.y - CENTRE_Y),
    -BALL_PULL_LATERAL_MAX,
    BALL_PULL_LATERAL_MAX,
  );
  return block.map((p, slot) => (slot === 0 ? p : { depth: p.depth + dDepth, y: p.y + dY }));
};

const distance = (a: Local, b: Local): number => Math.hypot(a.depth - b.depth, a.y - b.y);

const closeInOnBall = (block: Local[], ball: Local): Local[] => {
  const nearest = block
    .map((p, slot) => ({ slot, d: distance(p, ball) }))
    .filter(({ slot }) => slot !== 0)
    .sort((a, b) => a.d - b.d || a.slot - b.slot)
    .slice(0, BALL_CLOSE_IN.length);
  const result = [...block];
  nearest.forEach(({ slot, d }, rank) => {
    const { share, maxMetres } = BALL_CLOSE_IN[rank] ?? { share: 0, maxMetres: 0 };
    const p = block[slot];
    if (!p || d === 0) return;
    const step = Math.min(d * share, maxMetres);
    result[slot] = {
      depth: p.depth + ((ball.depth - p.depth) / d) * step,
      y: p.y + ((ball.y - p.y) / d) * step,
    };
  });
  return result;
};

/** Pushes players that are too close apart, keeping everyone inside the pitch. Deterministic. */
const keepApart = (block: Local[]): Local[] => {
  let points = block.map(clampLocal);
  for (let pass = 0; pass < SPREAD_PASSES; pass++) {
    const next = points.map((p) => ({ ...p }));
    for (let i = 0; i < next.length; i++) {
      for (let j = i + 1; j < next.length; j++) {
        const a = next[i];
        const b = next[j];
        if (!a || !b) continue;
        const d = distance(a, b);
        if (d >= MIN_PLAYER_DISTANCE) continue;
        const push = (MIN_PLAYER_DISTANCE - d) / 2 + 0.01;
        const ux = d === 0 ? 0 : (a.depth - b.depth) / d;
        const uy = d === 0 ? -1 : (a.y - b.y) / d;
        a.depth += ux * push;
        a.y += uy * push;
        b.depth -= ux * push;
        b.y -= uy * push;
      }
    }
    points = next.map(clampLocal);
  }
  return points;
};

const toPitch = (local: Local, side: Side): Point => ({
  x: side === "home" ? local.depth : PITCH_LENGTH - local.depth,
  y: local.y,
});

/**
 * The 11 positions (metres) of `side`, in slot order: goalkeeper, then lines, lanes left to right.
 * Pure and RNG-free. The home side attacks towards x = 105; the away side is the exact mirror
 * (x flipped, y kept).
 */
export const teamShape = (
  sheet: TeamSheet,
  tactics: TeamTactics,
  phase: TeamPhase,
  ball: Point,
  side: Side,
): Point[] => {
  const localBall: Local = {
    depth: side === "home" ? ball.x : PITCH_LENGTH - ball.x,
    y: ball.y,
  };
  const block = applyBlock(formationAnchors(sheet.formation), shapeParameters(tactics), phase);
  const placed = closeInOnBall(pullBlock(block, localBall), localBall);
  return keepApart(placed).map((p) => toPitch(p, side));
};
