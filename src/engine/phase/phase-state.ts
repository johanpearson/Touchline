import type { Point } from "../action/pitch-metres";
import type { TeamSheet } from "../action/team-sheet";
import type { Period, Side } from "../match-state";
import type { PerSide } from "../per-side";
import { CENTRE } from "./phase-constants";
import type { PhaseStart } from "./phase-step";

/** Everything `drawPhaseStep` needs to draw the next possession phase. */
export type PhaseState = {
  /** The players on the pitch with their effective attributes and tactics (the loop keeps them current). */
  sheets: PerSide<TeamSheet>;
  /** The side that has the ball. */
  team: Side;
  period: Period;
  /** Match seconds when the possession starts. */
  time: number;
  /** Match seconds at which the period ends; a step that reaches it ends the period. */
  periodEndsAt: number;
  start: PhaseStart;
  /** Where the possession starts, in metres. */
  ball: Point;
};

/** The state at kick-off of the first half: the home side has the ball in the centre circle. */
export const kickoffState = (sheets: PerSide<TeamSheet>, periodEndsAt: number): PhaseState => ({
  sheets,
  team: "home",
  period: "firstHalf",
  time: 0,
  periodEndsAt,
  start: "kickoff",
  ball: { ...CENTRE },
});
