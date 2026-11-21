import type { EnginePlayer } from "../action/engine-player";
import type { Point } from "../action/pitch-metres";
import { toAttackingFrame } from "../action/shot-xg";
import { actionTactics } from "../action/tactics-parameters";
import type { Side } from "../match-state";
import type { Rng } from "../rng";
import type { Chance } from "./chance";
import { drawChain, pickPlayer, startStage } from "./draw-chain";
import { drawChance } from "./draw-chance";
import { drawFailure, onExitLine } from "./draw-ending";
import {
  DIRECT_FREE_KICK_BAND,
  DIRECT_FREE_KICK_MIN_DEPTH,
  PENALTY_SPOT,
  STAGE_COUNT,
  STEP_MAX_SECONDS,
  STEP_MIN_SECONDS,
  type Stage,
} from "./phase-constants";
import type { PhaseState } from "./phase-state";
import type { ChainLink, PhaseStep } from "./phase-step";
import { resolveChance } from "./resolve-chance";
import { stageChance } from "./stage-strength";

const oneDecimal = (value: number): number => Math.round(value * 10) / 10;

/** The stage that stops the attack, or `undefined` when it gets through all of them. */
const stageReached = (state: PhaseState, rng: Rng): Stage | undefined => {
  for (
    let stage = startStage(toAttackingFrame(state.team, state.ball).x);
    stage < STAGE_COUNT;
    stage++
  ) {
    const s = stage as Stage;
    if (!rng.chance(stageChance(state.sheets, state.team, s, state.start))) return s;
  }
  return undefined;
};

/** Match seconds of a step: a longer chain and a slower tempo take longer, a fast tempo shortens it. */
const duration = (state: PhaseState, links: number, rng: Rng): number => {
  const exponent = actionTactics(state.sheets[state.team].tactics).tempoExponent;
  const span = STEP_MAX_SECONDS - STEP_MIN_SECONDS;
  const share = 0.5 * rng.next() ** exponent + 0.5 * ((links - 1) / 5);
  return STEP_MIN_SECONDS + span * Math.min(1, share);
};

const timing = (state: PhaseState, seconds: number) => {
  const natural = oneDecimal(state.time + seconds);
  const reachesEnd = natural >= state.periodEndsAt;
  return {
    startTime: state.time,
    endTime: reachesEnd
      ? oneDecimal(Math.max(state.periodEndsAt, state.time + STEP_MIN_SECONDS))
      : natural,
    periodEnd: reachesEnd,
  };
};

const keeperOf = (state: PhaseState): string => {
  const defending: Side = state.team === "home" ? "away" : "home";
  return (state.sheets[defending].starters[0] as { id: string }).id;
};

/** Draws the chance of a possession and its result, shooter against the defending keeper. */
const chanceOf = (state: PhaseState, chain: readonly ChainLink[], rng: Rng): Chance => {
  const keeper = keeperOf(state);
  const draft = drawChance(
    { team: state.team, start: state.start, ball: state.ball, chain, keeper },
    rng,
  );
  const shooter = state.sheets[state.team].starters.find((p) => p.id === draft.shooter);
  const goalkeeper = state.sheets[state.team === "home" ? "away" : "home"].starters[0];
  return {
    ...draft,
    ...resolveChance(draft, shooter as EnginePlayer, goalkeeper as EnginePlayer, rng),
  };
};

/** A penalty, or a free kick close enough to shoot at goal: one taker, one shot. */
const setPieceShot = (state: PhaseState, at: Point, rng: Rng): PhaseStep => {
  const taker = pickPlayer(state.sheets[state.team], { stage: 2, attribute: "finishing" }, rng);
  const chain: [ChainLink, ...ChainLink[]] = [{ player: taker.id, at }];
  const chance = chanceOf(state, chain, rng);
  const { startTime, endTime } = timing(state, STEP_MIN_SECONDS);
  return {
    team: state.team,
    period: state.period,
    startTime,
    endTime,
    start: state.start,
    chain,
    outcome: "chance",
    chance,
  };
};

const penaltySpot = (state: PhaseState): Point =>
  toAttackingFrame(state.team, { x: PENALTY_SPOT.depth, y: PENALTY_SPOT.y });

/** True for a free kick within range and in front of the goal: taken as a direct shot. */
const isDirectFreeKick = (state: PhaseState): boolean => {
  if (state.start !== "freeKick") return false;
  const local = toAttackingFrame(state.team, state.ball);
  return (
    local.x >= DIRECT_FREE_KICK_MIN_DEPTH &&
    Math.abs(local.y - PENALTY_SPOT.y) <= DIRECT_FREE_KICK_BAND
  );
};

/**
 * Draws one possession phase from `state`: the attack tries to get through build-up, progression
 * and final third (each stage a draw from the attacker's against the defender's strengths, tactics
 * and the home edge; a possession starts in the stage of the ball's third), then the step's chain and
 * its outcome are drawn. A possession that stops in a stage ends in a lost ball, a foul on the
 * attacker or out of play; one that gets through ends in a chance (`drawChance`, `resolveChance`).
 * A step that reaches the end of the period ends it. Pure: all randomness comes from `rng`.
 */
export const drawPhaseStep = (state: PhaseState, rng: Rng): PhaseStep => {
  if (state.start === "penalty") return setPieceShot(state, penaltySpot(state), rng);
  if (isDirectFreeKick(state)) return setPieceShot(state, state.ball, rng);
  const attacking = state.sheets[state.team];
  const defending: Side = state.team === "home" ? "away" : "home";
  const defence = state.sheets[defending];
  const from = startStage(toAttackingFrame(state.team, state.ball).x);
  const stopped = stageReached(state, rng);
  const failure = stopped === undefined ? undefined : drawFailure(stopped, defence, rng);
  const chain = drawChain(
    {
      team: state.team,
      sheet: attacking,
      start: state.start,
      ball: state.ball,
      from,
      endedIn: stopped ?? STAGE_COUNT,
      shoots: stopped === undefined,
    },
    rng,
  );
  const last = chain[chain.length - 1] as ChainLink;
  if (failure?.outcome === "outOfPlay") {
    chain[chain.length - 1] = { player: last.player, at: onExitLine(state.team, last.at) };
  }
  const { startTime, endTime, periodEnd } = timing(state, duration(state, chain.length, rng));
  const base = {
    team: state.team,
    period: state.period,
    startTime,
    endTime,
    start: state.start,
    chain,
  };
  if (periodEnd) return { ...base, outcome: "periodEnd" };
  if (failure === undefined) {
    return { ...base, outcome: "chance", chance: chanceOf(state, chain, rng) };
  }
  return { ...base, ...failure };
};
