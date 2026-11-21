import type { Point } from "../action/pitch-metres";
import type { Period, Side } from "../match-state";
import type { Chance } from "./chance";

/** How the possession began: a restart, or the ball won in open play. */
export type PhaseStart =
  | "kickoff"
  | "tackle"
  | "interception"
  | "goalKick"
  | "throwIn"
  | "corner"
  | "freeKick"
  | "penalty";

/** One player of the chain and where the ball was when he had it, in metres. */
export type ChainLink = { player: string; at: Point };

/** How a lost possession was lost. */
export type LostHow = "tackle" | "interception" | "badPass";

type StepBase = {
  /** The side with the ball. */
  team: Side;
  period: Period;
  /** Match seconds, one decimal; a step lasts 10 to 25 s. */
  startTime: number;
  endTime: number;
  start: PhaseStart;
  /**
   * The players involved in order with the ball path as waypoints: 2 to 6 for open play, a single
   * taker for a penalty. The last player takes the shot, the foul, the loss or the exit.
   */
  chain: readonly [ChainLink, ...ChainLink[]];
};

/**
 * One possession phase of an engine v3 match: one side's control of the ball with a single outcome.
 * A chance is a first-class part of the outcome.
 */
export type PhaseStep = StepBase &
  (
    | { outcome: "chance"; chance: Chance }
    | { outcome: "lost"; how: LostHow; challenger: string }
    /** `team` is the fouled side; `penalty` when the foul was in the box. */
    | { outcome: "foul"; offender: string; penalty: boolean }
    | { outcome: "outOfPlay" }
    /** The whistle ends the period during the possession. */
    | { outcome: "periodEnd" }
  );

export type PhaseStepOutcome = PhaseStep["outcome"];
