import { PENALTY_XG } from "../action/decision-constants";
import { PITCH_LENGTH, type Point } from "../action/pitch-metres";
import { shotXg, toAttackingFrame } from "../action/shot-xg";
import type { TeamSheet } from "../action/team-sheet";
import type { Side } from "../match-state";
import type { Rng } from "../rng";
import type { Chance, ChanceAftermath, ChanceResult } from "./chance";
import { pickChallenger } from "./draw-chain";
import {
  END_LINE_DEPTH,
  FOUL_SHARE,
  LOST_INTERCEPTION_SHARE,
  LOST_TACKLE_SHARE,
  OUT_OF_PLAY_SHARE,
  PENALTY_FOUL_SHARE,
  PLACEHOLDER_WIDE_SHARE,
  SAVED_CORNER_SHARE,
  type Stage,
} from "./phase-constants";
import type { ChainLink, LostHow, PhaseStart, PhaseStep } from "./phase-step";

/** Pressure on the placeholder shot; the chance issue (#459) replaces the whole placeholder. */
const PLACEHOLDER_PRESSURE = 0.3;

type Ending =
  | { outcome: "lost"; how: LostHow; challenger: string }
  | { outcome: "foul"; offender: string; penalty: boolean }
  | { outcome: "outOfPlay" };

const lostHow = (draw: number): LostHow =>
  draw < LOST_TACKLE_SHARE
    ? "tackle"
    : draw < LOST_TACKLE_SHARE + LOST_INTERCEPTION_SHARE
      ? "interception"
      : "badPass";

/** How a possession that failed in `stage` ends: a lost ball, a foul on the attacker or out of play. */
export const drawFailure = (stage: Stage, defending: TeamSheet, rng: Rng): Ending => {
  const kind = rng.next();
  if (kind < FOUL_SHARE) {
    const offender = pickChallenger(defending, stage, rng);
    return {
      outcome: "foul",
      offender,
      penalty: stage === 2 && rng.chance(PENALTY_FOUL_SHARE),
    };
  }
  if (kind < FOUL_SHARE + OUT_OF_PLAY_SHARE) return { outcome: "outOfPlay" };
  const how = lostHow(rng.next());
  return { outcome: "lost", how, challenger: pickChallenger(defending, stage, rng) };
};

const placeholderResult = (xg: number, rng: Rng): ChanceResult => {
  if (rng.chance(xg)) return "goal";
  return rng.chance(PLACEHOLDER_WIDE_SHARE) ? "wide" : "saved";
};

const placeholderAftermath = (result: ChanceResult, rng: Rng): ChanceAftermath => {
  if (result === "goal") return "kickoff";
  if (result === "wide") return "goalKick";
  return rng.chance(SAVED_CORNER_SHARE) ? "corner" : "goalKick";
};

/**
 * A placeholder chance for the phase draw: the model's fields filled with simple draws (xG from the
 * shot position, goal with probability xG, otherwise saved or wide). The chance issue (#459) gives
 * the chance its creator, situation, kind and near misses.
 */
export const placeholderChance = (
  team: Side,
  start: PhaseStart,
  chain: readonly ChainLink[],
  keeper: string,
  rng: Rng,
): Chance => {
  const shooter = chain[chain.length - 1] as ChainLink;
  const creator = (chain[chain.length - 2] ?? shooter).player;
  const penalty = start === "penalty";
  const from: Point = shooter.at;
  const xg = penalty ? PENALTY_XG : shotXg(toAttackingFrame(team, from), PLACEHOLDER_PRESSURE);
  const result = placeholderResult(xg, rng);
  return {
    kind: penalty
      ? "penalty"
      : start === "corner" || start === "freeKick"
        ? "setPiece"
        : "openPlay",
    creator,
    shooter: shooter.player,
    situation: "box",
    xg,
    result,
    keeper,
    aftermath: placeholderAftermath(result, rng),
    from: { ...from },
  };
};

/** True when the last waypoint of an out-of-play possession is on the end line of the attacker's goal. */
export const overEndLine = (team: Side, last: Point): boolean =>
  toAttackingFrame(team, last).x >= END_LINE_DEPTH;

/** Moves the last waypoint of an out-of-play possession onto the line the ball crosses. */
export const onExitLine = (team: Side, last: Point): Point => {
  const local = toAttackingFrame(team, last);
  if (local.x >= END_LINE_DEPTH) return toAttackingFrame(team, { x: PITCH_LENGTH, y: local.y });
  return { x: last.x, y: last.y < 34 ? 0 : 68 };
};

export type { Ending, PhaseStep };
