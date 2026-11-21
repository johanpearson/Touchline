import { PITCH_LENGTH, PITCH_WIDTH, type Point } from "../action/pitch-metres";
import { toAttackingFrame } from "../action/shot-xg";
import type { Side } from "../match-state";
import { REBOUND_DEPTH } from "./chance-constants";
import { overEndLine } from "./draw-ending";
import { CENTRE, GOAL_KICK_DEPTH, PENALTY_SPOT } from "./phase-constants";
import type { PhaseState } from "./phase-state";
import type { PhaseStart, PhaseStep } from "./phase-step";

const other = (side: Side): Side => (side === "home" ? "away" : "home");

type Restart = { team: Side; start: PhaseStart; ball: Point };

const goalKick = (taker: Side): Restart => ({
  team: taker,
  start: "goalKick",
  ball: toAttackingFrame(taker, { x: GOAL_KICK_DEPTH, y: PITCH_WIDTH / 2 }),
});

const corner = (attacker: Side, from: Point): Restart => ({
  team: attacker,
  start: "corner",
  ball: toAttackingFrame(attacker, {
    x: PITCH_LENGTH,
    y: from.y < PITCH_WIDTH / 2 ? 0 : PITCH_WIDTH,
  }),
});

/** A rebound is a loose ball in front of goal that the defence gets first: it restarts as an interception. */
const reboundWon = (step: Extract<PhaseStep, { outcome: "chance" }>): Restart => ({
  team: other(step.team),
  start: "interception",
  ball: toAttackingFrame(step.team, {
    x: REBOUND_DEPTH,
    y: PENALTY_SPOT.y + (step.chance.from.y - PENALTY_SPOT.y) / 2,
  }),
});

const afterChance = (step: Extract<PhaseStep, { outcome: "chance" }>): Restart => {
  switch (step.chance.aftermath) {
    case "kickoff":
      return { team: other(step.team), start: "kickoff", ball: { ...CENTRE } };
    case "goalKick":
      return goalKick(other(step.team));
    case "rebound":
      return reboundWon(step);
    default:
      return corner(step.team, step.chance.from);
  }
};

const afterFoul = (step: Extract<PhaseStep, { outcome: "foul" }>, at: Point): Restart =>
  step.penalty
    ? {
        team: step.team,
        start: "penalty",
        ball: toAttackingFrame(step.team, { x: PENALTY_SPOT.depth, y: PENALTY_SPOT.y }),
      }
    : { team: step.team, start: "freeKick", ball: at };

const afterOutOfPlay = (team: Side, at: Point): Restart =>
  overEndLine(team, at) ? goalKick(other(team)) : { team: other(team), start: "throwIn", ball: at };

const afterLost = (step: Extract<PhaseStep, { outcome: "lost" }>, at: Point): Restart => ({
  team: other(step.team),
  start: step.how === "tackle" ? "tackle" : "interception",
  ball: at,
});

const restartAfter = (step: Exclude<PhaseStep, { outcome: "periodEnd" }>): Restart => {
  const at = step.chain[step.chain.length - 1]?.at ?? { ...CENTRE };
  switch (step.outcome) {
    case "chance":
      return afterChance(step);
    case "lost":
      return afterLost(step, at);
    case "foul":
      return afterFoul(step, at);
    case "outOfPlay":
      return afterOutOfPlay(step.team, at);
  }
};

/**
 * The state after `step`, for the next draw: who has the ball, how and where, from the step's
 * outcome. `undefined` after a period end (the match loop starts the next period). The sheets and
 * the period's end are carried over; the loop replaces the sheets after changes.
 */
export const nextPhaseState = (state: PhaseState, step: PhaseStep): PhaseState | undefined => {
  if (step.outcome === "periodEnd") return undefined;
  return { ...state, ...restartAfter(step), time: step.endTime };
};
