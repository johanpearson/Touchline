import type { MatchEvent, ShotOutcome } from "./match-event";
import type { MatchInput } from "./match-input";
import type { MatchState, PitchPosition, Side } from "./match-state";
import { clamp, opponentOf, progressOf, xAtProgress } from "./pitch";
import type { Rng } from "./rng";
import { type TacticsModifiers, tacticsModifiers } from "./tactics";
import type { TeamMatchProfile } from "./team-match-profile";
import { shotXg } from "./xg";

/** The result of resolving one step of the simulation. */
export type Transition = { state: MatchState; events: MatchEvent[] };

/** Progress beyond which the attacking team may shoot. */
export const SHOOTING_ZONE = 0.76;
const CORNER_CHANCE = 0.3;
const LATERAL_CHANCE = 0.2;
const CENTRE: PitchPosition = { x: 0.5, y: 0.5 };

const tacticsOf = (input: MatchInput, side: Side): TacticsModifiers =>
  tacticsModifiers(side === "home" ? input.homeTactics : input.awayTactics);

const profileOf = (input: MatchInput, side: Side): TeamMatchProfile =>
  side === "home" ? input.home : input.away;

/** Danger is zero in the attacking team's own half and rises towards 1 at the opponent's goal. */
const dangerAt = (progress: number): number =>
  clamp((Math.max(0, progress - 0.5) / 0.5) ** 2, 0, 1);

const withBall = (
  state: MatchState,
  possession: Side,
  ball: PitchPosition,
  danger = dangerAt(progressOf(possession, ball.x)),
): MatchState => ({ ...state, possession, ball, danger });

const eventAt = (state: MatchState, team: Side, position: PitchPosition, intensity: number) => ({
  time: state.time,
  team,
  position,
  intensity: clamp(intensity, 0, 1),
});

/** Resolves a shot: goal (with kickoff for the conceding side), save, block or miss, then what follows. */
const resolveShot = (state: MatchState, input: MatchInput, rng: Rng): Transition => {
  const attacker = state.possession;
  const defender = opponentOf(attacker);
  const attack = profileOf(input, attacker);
  const defence = profileOf(input, defender);
  const tactics = tacticsOf(input, attacker);
  const progress = progressOf(attacker, state.ball.x);
  const xg = shotXg(progress, state.ball.y);
  const goalChance = clamp(
    xg * (0.9 + 0.2 * attack.finishing) * (1.1 - defence.goalkeeping * 0.15) * tactics.shotQuality,
    0,
    1,
  );
  const shotEvent = (outcome: ShotOutcome): MatchEvent => ({
    ...eventAt(state, attacker, state.ball, 0.6 + xg * 2),
    type: "shot",
    xg,
    outcome,
  });

  if (rng.chance(goalChance)) {
    const score = { ...state.score, [attacker]: state.score[attacker] + 1 };
    return {
      state: { ...withBall(state, defender, CENTRE, 0), score },
      events: [
        shotEvent("goal"),
        { ...eventAt(state, attacker, state.ball, 1), type: "goal", xg },
        { ...eventAt(state, defender, CENTRE, 0.3), type: "kickoff" },
      ],
    };
  }

  const outcome: ShotOutcome = rng.chance(0.1 + 0.1 * defence.defending)
    ? "blocked"
    : rng.chance(0.6)
      ? "saved"
      : "missed";
  const events = [shotEvent(outcome)];

  if (outcome !== "missed" && rng.chance(CORNER_CHANCE + tactics.cornerChance)) {
    const corner = { x: xAtProgress(attacker, 0.985), y: rng.chance(0.5) ? 0.03 : 0.97 };
    events.push({ ...eventAt(state, attacker, corner, 0.45), type: "corner" });
    return { state: withBall(state, attacker, corner), events };
  }

  const restart = { x: xAtProgress(defender, 0.08), y: 0.5 + (rng.next() - 0.5) * 0.4 };
  events.push({ ...eventAt(state, defender, restart, 0.2), type: "turnover" });
  return { state: withBall(state, defender, restart), events };
};

/** Resolves a build-up step: move the ball forward, sideways, or lose it. */
const resolveBuildUp = (state: MatchState, input: MatchInput, rng: Rng): Transition => {
  const attacker = state.possession;
  const defender = opponentOf(attacker);
  const attack = profileOf(input, attacker);
  const defence = profileOf(input, defender);
  const own = tacticsOf(input, attacker);
  const opposing = tacticsOf(input, defender);
  const progress = progressOf(attacker, state.ball.x);
  const advanceChance = clamp(
    0.56 +
      ((attack.buildUp + attack.progression) / 2 - defence.pressing) * 0.15 -
      progress * 0.22 +
      own.advanceChance +
      opposing.concededAdvanceChance,
    0.05,
    0.95,
  );

  if (rng.chance(advanceChance)) {
    const next = Math.min(0.97, progress + 0.05 + rng.next() * 0.14 + opposing.concededAdvanceStep);
    const ball = {
      x: xAtProgress(attacker, next),
      y: clamp(state.ball.y + (rng.next() - 0.5) * 0.35, 0.06, 0.94),
    };
    return {
      state: withBall(state, attacker, ball),
      events: [{ ...eventAt(state, attacker, ball, 0.18 + next * next * 0.75), type: "progress" }],
    };
  }

  if (rng.chance(LATERAL_CHANCE + own.lateralChance)) {
    const ball = { x: state.ball.x, y: clamp(state.ball.y + (rng.next() - 0.5) * 0.5, 0.06, 0.94) };
    return {
      state: withBall(state, attacker, ball),
      events: [{ ...eventAt(state, attacker, ball, 0.1), type: "lateral" }],
    };
  }

  return {
    state: withBall(state, defender, state.ball),
    events: [{ ...eventAt(state, defender, state.ball, 0.2), type: "turnover" }],
  };
};

/**
 * Resolves one transition of the zone model from `state` (whose `time` is the moment of the step).
 * Pure: the only randomness comes from `rng`.
 */
export const resolveTransition = (state: MatchState, input: MatchInput, rng: Rng): Transition => {
  const attack = profileOf(input, state.possession);
  const defence = profileOf(input, opponentOf(state.possession));
  const progress = progressOf(state.possession, state.ball.x);
  const own = tacticsOf(input, state.possession);
  const opposing = tacticsOf(input, opponentOf(state.possession));
  const shootChance = clamp(
    0.2 +
      attack.chanceCreation * 0.12 -
      defence.defending * 0.06 +
      own.shootChance +
      opposing.concededShootChance,
    0,
    1,
  );

  if (progress > SHOOTING_ZONE && rng.chance(shootChance)) return resolveShot(state, input, rng);
  return resolveBuildUp(state, input, rng);
};
