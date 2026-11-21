import { PITCH_LENGTH, type Point } from "../action/pitch-metres";
import { toAttackingFrame } from "../action/shot-xg";
import type { TeamSheet } from "../action/team-sheet";
import type { Side } from "../match-state";
import type { Rng } from "../rng";
import { pickChallenger } from "./draw-chain";
import {
  END_LINE_DEPTH,
  FOUL_SHARE,
  LOST_INTERCEPTION_SHARE,
  LOST_TACKLE_SHARE,
  OUT_OF_PLAY_SHARE,
  PENALTY_FOUL_SHARE,
  type Stage,
} from "./phase-constants";
import type { LostHow, PhaseStep } from "./phase-step";

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
