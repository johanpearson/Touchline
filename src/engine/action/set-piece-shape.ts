import type { Side } from "../match-state";
import type { SetPieceVariant } from "./action-event";
import { clamp } from "./attribute-rating";
import { PITCH_LENGTH, PITCH_WIDTH, type Point } from "./pitch-metres";
import { restartTaker } from "./restart-taker";
import { separate } from "./separate-players";
import {
  CENTRE_X,
  CENTRE_Y,
  CIRCLE_RADIUS,
  CORNER_COUNTER_COVER,
  CORNER_EDGE,
  CORNER_FAR_POST,
  CORNER_KEEPER,
  CORNER_MARKER_GOALSIDE,
  CORNER_NEAR_POST,
  CORNER_PENALTY_SPOT,
  CORNER_POSTS,
  FREE_KICK_BOX_RUNNERS,
  FREE_KICK_KEEPER_DEPTH,
  FREE_KICK_KEEPER_SHIFT,
  FREE_KICK_KEEPER_SHIFT_MAX,
  FREE_KICK_OUT_OF_RANGE_RUNNERS,
  FREE_KICK_RANGE,
  FREE_KICK_RUNNER_OFFSET,
  GOAL_KICK_PRESS,
  GOAL_KICK_PRESS_MIN_X,
  GOAL_KICK_SPLIT,
  KICKOFF_CIRCLE_MARGIN,
  KICKOFF_OWN_LIMIT,
  KICKOFF_SUPPORT_OFFSET,
  MARKER_GOALSIDE,
  PENALTY_KEEPER,
  PENALTY_OTHERS_MAX_X,
  THROW_OPTIONS,
  WALL_SIZE,
  WALL_SPACING,
} from "./set-piece-constants";
import { MIN_PLAYER_DISTANCE } from "./shape-constants";
import { toAttackingFrame } from "./shot-xg";
import { teamShape } from "./team-shape";
import type { TeamSheet } from "./team-sheet";

/**
 * Both sides' positions for a dead ball, in slot order, plus the slots the first action needs.
 * `targets` are the taker's side's receivers (box runners at a corner, the two options at a throw-in,
 * the midfielders and forwards at a goal kick, the support player at a kickoff); `wall` are the
 * opponents' slots in the wall of a free kick in range.
 */
export type SetPieceLayout = {
  home: Point[];
  away: Point[];
  taker: number;
  targets: number[];
  wall: number[];
  /** Slots standing on a fixed role point (taker, runners, wall, markers, keepers placed by the kind). */
  roles: Record<Side, number[]>;
};

type Frame = { own: Point[]; opp: Point[] };
type Limit = (p: Point) => Point;
type Roles = Frame & {
  targets: number[];
  wall: number[];
  /** Slots that stand on their exact role point; only the others move to keep their distance. */
  fixedOwn: number[];
  fixedOpp: number[];
  /** The limits of the kind (own half, outside the circle, ...) that a moved player must still respect. */
  limitOwn?: Limit;
  limitOpp?: Limit;
};

const other = (side: Side): Side => (side === "home" ? "away" : "home");
const dist = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);
const toPoint = (x: number, y: number): Point => ({ x, y });

/** True when a free kick from `spot` (pitch metres) is within shooting range of the goal `side` attacks. */
export const inFreeKickRange = (side: Side, spot: Point): boolean => {
  const local = toAttackingFrame(side, spot);
  return dist(local, toPoint(PITCH_LENGTH, CENTRE_Y)) <= FREE_KICK_RANGE;
};

/**
 * Puts one player on each target, greedily in order: the free player (not in `used`) nearest to the
 * target, the lowest slot on ties. Returns the new points and the slots used.
 */
const fill = (
  points: readonly Point[],
  used: readonly number[],
  targets: readonly Point[],
): { points: Point[]; slots: number[] } => {
  const result = [...points];
  const taken = [...used];
  const slots = targets.map((target) => {
    const slot = points.reduce(
      (best, p, i) =>
        taken.includes(i) || (best !== -1 && dist(p, target) >= dist(points[best] as Point, target))
          ? best
          : i,
      -1,
    );
    taken.push(slot);
    result[slot] = target;
    return slot;
  });
  return { points: result, slots };
};

/**
 * The targets that keep `MIN_PLAYER_DISTANCE` from every `avoid` point. With `spreadOut`, an accepted
 * target also counts as an obstacle for the later ones; without it (a wall) targets ignore each other.
 */
const clearOf = (targets: readonly Point[], avoid: readonly Point[], spreadOut = true): Point[] => {
  const obstacles = [...avoid];
  return targets.filter((t) => {
    if (obstacles.some((o) => dist(o, t) < MIN_PLAYER_DISTANCE)) return false;
    if (spreadOut) obstacles.push(t);
    return true;
  });
};

/** Applies `move` to every player not in `except`. */
const mapOthers = (
  points: readonly Point[],
  except: readonly number[],
  move: (p: Point) => Point,
): Point[] => points.map((p, i) => (except.includes(i) ? p : move(p)));

const clampToPitch = (p: Point): Point => ({
  x: clamp(p.x, 0, PITCH_LENGTH),
  y: clamp(p.y, 0, PITCH_WIDTH),
});

const keeperOnly = [0];

const kickoff = (spot: Point, { own, opp }: Frame, taker: number): Roles => {
  const support = fill(
    own.map((p, i) => (i === taker ? spot : p)),
    [0, taker],
    [toPoint(spot.x + KICKOFF_SUPPORT_OFFSET.x, spot.y + KICKOFF_SUPPORT_OFFSET.y)],
  );
  const ownLimit: Limit = (p) => toPoint(Math.min(p.x, KICKOFF_OWN_LIMIT), p.y);
  const inOwnHalf = mapOthers(support.points, [taker, ...support.slots], ownLimit);
  const outsideCircle: Limit = (p) => {
    const x = Math.max(p.x, CENTRE_X);
    const reach = CIRCLE_RADIUS + KICKOFF_CIRCLE_MARGIN;
    const dy = Math.abs(p.y - spot.y);
    return dist(toPoint(x, p.y), spot) < reach
      ? toPoint(spot.x + Math.sqrt(reach * reach - dy * dy), p.y)
      : toPoint(x, p.y);
  };
  return {
    own: inOwnHalf,
    opp: opp.map(outsideCircle),
    targets: support.slots,
    wall: [],
    fixedOwn: [taker, ...support.slots],
    fixedOpp: [],
    limitOwn: ownLimit,
    limitOpp: outsideCircle,
  };
};

const throwIn = (spot: Point, { own, opp }: Frame, taker: number): Roles => {
  const inward = spot.y < CENTRE_Y ? 1 : -1;
  const options = THROW_OPTIONS.map((o) => toPoint(spot.x + o.x, spot.y + inward * o.y));
  const ownPlaced = fill(
    own.map((p, i) => (i === taker ? spot : p)),
    [0, taker],
    options,
  );
  const markers = fill(
    opp,
    keeperOnly,
    options.map((o) => toPoint(o.x + MARKER_GOALSIDE, o.y)),
  );
  return {
    own: ownPlaced.points,
    opp: markers.points,
    targets: ownPlaced.slots,
    wall: [],
    fixedOwn: [taker, ...ownPlaced.slots],
    fixedOpp: markers.slots,
  };
};

const goalKick = (
  spot: Point,
  { own, opp }: Frame,
  taker: number,
  receivers: readonly number[],
): Roles => {
  const ownPlaced = fill(
    own.map((p, i) => (i === taker ? spot : p)),
    [taker],
    GOAL_KICK_SPLIT.map((p) => toPoint(p.x, p.y)),
  );
  const pressLimit: Limit = (p) => toPoint(Math.max(p.x, GOAL_KICK_PRESS_MIN_X), p.y);
  const press = fill(
    opp.map(pressLimit),
    keeperOnly,
    GOAL_KICK_PRESS.map((p) => toPoint(p.x, p.y)),
  );
  return {
    own: ownPlaced.points,
    opp: press.points,
    targets: [...receivers],
    wall: [],
    fixedOwn: [taker, ...ownPlaced.slots],
    fixedOpp: [0, ...press.slots],
    limitOpp: pressLimit,
  };
};

const corner = (spot: Point, { own, opp }: Frame, taker: number): Roles => {
  const towards = spot.y < CENTRE_Y ? -1 : 1;
  const at = (p: { x: number; y: number }): Point => toPoint(p.x, CENTRE_Y + towards * p.y);
  const runners = [CORNER_NEAR_POST, CORNER_FAR_POST, CORNER_PENALTY_SPOT].map(at);
  const edge = CORNER_EDGE.map(at);
  const cover = CORNER_COUNTER_COVER.map(at);
  const ownPlaced = fill(
    own.map((p, i) => (i === taker ? spot : p)),
    [0, taker],
    [...runners, ...edge, ...cover],
  );
  const goalside = [...runners, ...edge].map((p) => toPoint(p.x + CORNER_MARKER_GOALSIDE, p.y));
  const defending = fill(
    opp.map((p, i) => (i === 0 ? at(CORNER_KEEPER) : p)),
    keeperOnly,
    [...CORNER_POSTS.map(at), ...goalside],
  );
  return {
    own: ownPlaced.points,
    opp: defending.points,
    targets: ownPlaced.slots.slice(0, runners.length),
    wall: [],
    fixedOwn: [taker, ...ownPlaced.slots],
    fixedOpp: [0, ...defending.slots],
  };
};

const freeKick = (spot: Point, { own, opp }: Frame, taker: number): Roles => {
  const goal = toPoint(PITCH_LENGTH, CENTRE_Y);
  const d = dist(spot, goal);
  const inRange = d <= FREE_KICK_RANGE;
  const ownTaker = own.map((p, i) => (i === taker ? spot : p));
  if (!inRange) {
    const runners = fill(
      ownTaker,
      [0, taker],
      FREE_KICK_OUT_OF_RANGE_RUNNERS.map((r) => toPoint(spot.x + r.x, spot.y + r.y)),
    );
    return {
      own: runners.points,
      opp,
      targets: runners.slots,
      wall: [],
      fixedOwn: [taker, ...runners.slots],
      fixedOpp: [],
    };
  }
  const ux = d === 0 ? 1 : (goal.x - spot.x) / d;
  const uy = d === 0 ? 0 : (goal.y - spot.y) / d;
  const wallPoints = Array.from({ length: WALL_SIZE }, (_, k) => {
    const lateral = (k - (WALL_SIZE - 1) / 2) * WALL_SPACING;
    return toPoint(
      spot.x + ux * CIRCLE_RADIUS - uy * lateral,
      spot.y + uy * CIRCLE_RADIUS + ux * lateral,
    );
  });
  const runnerPoints = [
    toPoint(spot.x - uy * FREE_KICK_RUNNER_OFFSET, spot.y + ux * FREE_KICK_RUNNER_OFFSET),
    toPoint(spot.x + uy * FREE_KICK_RUNNER_OFFSET, spot.y - ux * FREE_KICK_RUNNER_OFFSET),
    ...FREE_KICK_BOX_RUNNERS.map((r) => toPoint(r.x, CENTRE_Y + r.y)),
  ];
  const ownPlaced = fill(ownTaker, [0, taker], clearOf(runnerPoints, [spot]));
  const shift = clamp(
    (spot.y - CENTRE_Y) * FREE_KICK_KEEPER_SHIFT,
    -FREE_KICK_KEEPER_SHIFT_MAX,
    FREE_KICK_KEEPER_SHIFT_MAX,
  );
  const keeper = toPoint(FREE_KICK_KEEPER_DEPTH, CENTRE_Y + shift);
  const wallClear = clearOf(wallPoints.map(clampToPitch), [keeper], false);
  const wall = fill(
    opp.map((p, i) => (i === 0 ? keeper : p)),
    keeperOnly,
    wallClear,
  );
  const boxMarkers = fill(
    wall.points,
    [0, ...wall.slots],
    clearOf(
      FREE_KICK_BOX_RUNNERS.map((r) => toPoint(r.x + MARKER_GOALSIDE, CENTRE_Y + r.y)),
      [keeper, ...wallClear],
    ),
  );
  return {
    own: ownPlaced.points,
    opp: boxMarkers.points,
    targets: [],
    wall: wall.slots,
    fixedOwn: [taker, ...ownPlaced.slots],
    fixedOpp: [0, ...wall.slots, ...boxMarkers.slots],
  };
};

const penalty = (spot: Point, { own, opp }: Frame, taker: number): Roles => {
  const behind = (p: Point): Point => toPoint(Math.min(p.x, PENALTY_OTHERS_MAX_X), p.y);
  const ownPlaced = mapOthers(own, [taker], behind).map((p, i) => (i === taker ? spot : p));
  const oppPlaced = mapOthers(opp, keeperOnly, behind).map((p, i) =>
    i === 0 ? toPoint(PENALTY_KEEPER.x, PENALTY_KEEPER.y) : p,
  );
  return {
    own: ownPlaced,
    opp: oppPlaced,
    targets: [],
    wall: [],
    fixedOwn: [taker],
    fixedOpp: keeperOnly,
    limitOwn: behind,
    limitOpp: behind,
  };
};

/**
 * The 22 positions of a dead ball for `kind` taken by `side` at `spot` (pitch metres). Built in the
 * taker's attacking frame from each side's plain `setPiece` shape: the roles of the kind (taker,
 * runners, wall, markers, pressing line) are put on fixed points with the nearest free players, the
 * others keep their plain positions with the limits of the kind (own half at a kickoff, outside the
 * box and the arc at a penalty) and are moved apart (`separate`) so they stand `MIN_PLAYER_DISTANCE`
 * from everyone; role points never move, so role points that would end up closer than `MIN_PLAYER_DISTANCE` (a free-kick
 * runner or marker next to the wall or the keeper) are left out, and only the taker and the wall players
 * among themselves may stand closer. The away side is the exact x-mirror. Pure and RNG-free: the taker
 * comes from attributes (`restartTaker`), the roles from distance with the lowest slot on ties.
 */
export const setPieceShape = (
  kind: SetPieceVariant,
  side: Side,
  spot: Point,
  sheets: Record<Side, TeamSheet>,
): SetPieceLayout => {
  const foe = other(side);
  const plain = (s: Side): Point[] => teamShape(sheets[s], sheets[s].tactics, "setPiece", spot, s);
  const ownPlain = plain(side);
  const taker = restartTaker(kind, sheets[side].starters, ownPlain, spot);
  const frame: Frame = {
    own: ownPlain.map((p) => toAttackingFrame(side, p)),
    opp: plain(foe).map((p) => toAttackingFrame(side, p)),
  };
  const local = toAttackingFrame(side, spot);
  const roles = ((): Roles => {
    switch (kind) {
      case "kickoff":
        return kickoff(local, frame, taker);
      case "throwIn":
        return throwIn(local, frame, taker);
      case "goalKick": {
        const receivers = sheets[side].starters.flatMap((p, i) =>
          i !== 0 && (p.position === "MID" || p.position === "FWD") ? [i] : [],
        );
        return goalKick(local, frame, taker, receivers);
      }
      case "corner":
        return corner(local, frame, taker);
      case "freeKick":
        return freeKick(local, frame, taker);
      case "penalty":
        return penalty(local, frame, taker);
    }
  })();
  const toPitch = (points: readonly Point[]): Point[] =>
    points.map((p) => clampToPitch(toAttackingFrame(side, p)));
  const spread = (
    points: readonly Point[],
    fixed: readonly number[],
    limit?: Limit,
    exempt?: number,
  ) => separate(points, fixed, (p) => clampToPitch(limit ? limit(p) : p), exempt);
  const ownPitch = toPitch(spread(roles.own, roles.fixedOwn, roles.limitOwn, taker));
  const oppPitch = toPitch(spread(roles.opp, roles.fixedOpp, roles.limitOpp));
  return {
    home: side === "home" ? ownPitch : oppPitch,
    away: side === "home" ? oppPitch : ownPitch,
    taker,
    targets: roles.targets,
    wall: roles.wall,
    roles: {
      home: side === "home" ? roles.fixedOwn : roles.fixedOpp,
      away: side === "home" ? roles.fixedOpp : roles.fixedOwn,
    },
  };
};
