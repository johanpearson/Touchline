import type { Period, Side } from "../match-state";
import type { Rng } from "../rng";
import { actionDuration } from "./action-duration";
import type { ActionEvent, PassEvent } from "./action-event";
import { buildOptions } from "./build-options";
import { chooseOption } from "./choose-option";
import { PENALTY_XG } from "./decision-constants";
import { CHALLENGE_PRESSURE_GAIN, NO_RECENT_TURNOVER, PENALTY_SPOT_DEPTH } from "./loop-constants";
import { markKeyPasses } from "./mark-key-passes";
import type { MatchInputV2 } from "./match-input-v2";
import type { Challenger, Resolution } from "./open-play-types";
import { PITCH_LENGTH, PITCH_WIDTH, type Point } from "./pitch-metres";
import type { PendingRestart, PlayState } from "./play-state";
import { pressureOn, type Shapes } from "./pressure";
import { resolveCarry } from "./resolve-carry";
import { resolveChallenge } from "./resolve-challenge";
import { resolveClearance } from "./resolve-clearance";
import { resolvePass } from "./resolve-pass";
import { resolveShot } from "./resolve-shot";
import { restartTaker } from "./restart-taker";
import { buildSnapshot } from "./snapshot";
import { phaseOf } from "./team-phase";
import { teamShape } from "./team-shape";
import type { TeamSheet } from "./team-sheet";

const CENTRE: Point = { x: PITCH_LENGTH / 2, y: PITCH_WIDTH / 2 };
const other = (side: Side): Side => (side === "home" ? "away" : "home");

export type ActionContext = {
  input: MatchInputV2;
  play: PlayState;
  time: number;
  period: Period;
  /** Decisions and outcomes. */
  sim: Rng;
  /** Snapshot jitter only; never feeds back into decisions. */
  presentation: Rng;
  /** The previous event, so a key pass can be marked when the shot follows. */
  previous?: ActionEvent;
};

export type ActionResult = {
  events: ActionEvent[];
  play: PlayState;
  /** Seconds until the next action. */
  duration: number;
  /** Set when the previous event was replaced (a key pass got its flag). */
  replacedPrevious?: ActionEvent;
};

export const kickoffFor = (team: Side): PendingRestart => ({
  team,
  variant: "kickoff",
  position: CENTRE,
});

/** The state at the start of a half: the ball on the centre spot, a kickoff waiting. */
export const kickoffPlay = (team: Side, score: PlayState["score"]): PlayState => ({
  possession: team,
  ball: CENTRE,
  restart: kickoffFor(team),
  lastType: "none",
  actionsSinceTurnover: NO_RECENT_TURNOVER,
  score,
});

const sheetOf = (input: MatchInputV2, side: Side): TeamSheet =>
  side === "home" ? input.home : input.away;

/** Both shapes for the current ball and phase of play. */
export const shapesFor = (input: MatchInputV2, play: PlayState, ball: Point): Shapes => {
  const last = { type: play.lastType, actionsSinceTurnover: play.actionsSinceTurnover };
  const shapeOf = (side: Side): Point[] => {
    const sheet = sheetOf(input, side);
    return teamShape(sheet, sheet.tactics, phaseOf(side, play.possession, ball, last), ball, side);
  };
  return { home: shapeOf("home"), away: shapeOf("away") };
};

/** The ball carrier stands on the ball. */
const withCarrier = (shapes: Shapes, side: Side, slot: number, ball: Point): Shapes => ({
  ...shapes,
  [side]: shapes[side].map((p, i) => (i === slot ? ball : p)),
});

const challengers = (
  sheet: TeamSheet,
  shape: readonly Point[],
  skip: number[] = [],
): Challenger[] =>
  sheet.starters.flatMap((player, slot) =>
    skip.includes(slot) ? [] : [{ slot, player, point: shape[slot] as Point }],
  );

const nearest = (list: readonly Challenger[], to: Point): Challenger | undefined =>
  list.reduce<Challenger | undefined>(
    (best, c) =>
      best === undefined ||
      Math.hypot(c.point.x - to.x, c.point.y - to.y) <
        Math.hypot(best.point.x - to.x, best.point.y - to.y)
        ? c
        : best,
    undefined,
  );

const penaltySpot = (team: Side): Point => ({
  x: team === "home" ? PITCH_LENGTH - PENALTY_SPOT_DEPTH : PENALTY_SPOT_DEPTH,
  y: PITCH_WIDTH / 2,
});

/** The play state after a resolution: who has the ball, any restart, the turnover count and the score. */
const afterResolution = (
  play: PlayState,
  resolution: Resolution<string>,
  type: ActionEvent["type"],
  goalBy?: Side,
): PlayState => {
  const side = goalBy === undefined ? resolution.possession.side : other(goalBy);
  const turnover = side !== play.possession;
  const restart: PendingRestart | undefined =
    goalBy === undefined ? resolution.restart : kickoffFor(side);
  return {
    possession: side,
    slot: restart === undefined ? resolution.possession.slot : undefined,
    ball: resolution.ball,
    restart,
    lastType: type,
    actionsSinceTurnover: turnover ? 0 : play.actionsSinceTurnover + 1,
    score: goalBy === undefined ? play.score : { ...play.score, [goalBy]: play.score[goalBy] + 1 },
  };
};

const nearestSlot = (shape: readonly Point[], ball: Point): number =>
  shape.reduce(
    (best, p, slot) =>
      Math.hypot(p.x - ball.x, p.y - ball.y) <
      Math.hypot((shape[best] as Point).x - ball.x, (shape[best] as Point).y - ball.y)
        ? slot
        : best,
    0,
  );

/** Takes the pending restart: the taker is chosen and the set-up is the plain shape (set pieces come later). */
const takeRestart = (ctx: ActionContext, restart: PendingRestart): ActionResult => {
  const { input, play, sim } = ctx;
  const ball = restart.variant === "penalty" ? penaltySpot(restart.team) : restart.position;
  const dead: PlayState = { ...play, ball, lastType: "setPiece" };
  const shapes = shapesFor(input, { ...dead, possession: restart.team }, ball);
  const sheet = sheetOf(input, restart.team);
  const slot = restartTaker(restart.variant, sheet.starters, shapes[restart.team], ball);
  const placed = withCarrier(shapes, restart.team, slot, ball);
  const event: ActionEvent = {
    type: "setPiece",
    variant: restart.variant,
    outcome: "taken",
    time: ctx.time,
    period: ctx.period,
    team: restart.team,
    actor: (sheet.starters[slot] as { id: string }).id,
    from: ball,
    to: ball,
    pressure: 0,
    snapshot: buildSnapshot(placed, ball, ctx.presentation),
  };
  const next: PlayState = {
    ...dead,
    possession: restart.team,
    slot,
    restart: undefined,
    penalty: restart.variant === "penalty",
    actionsSinceTurnover: restart.team === play.possession ? play.actionsSinceTurnover + 1 : 0,
  };
  const duration = actionDuration("setPiece", sheet.tactics.tempo, sim);
  return { events: [event], play: next, duration };
};

/** The 22-player snapshot for a period change, at the current ball. */
export const periodSnapshot = (ctx: Pick<ActionContext, "input" | "play" | "presentation">) =>
  buildSnapshot(shapesFor(ctx.input, ctx.play, ctx.play.ball), ctx.play.ball, ctx.presentation);

/** Plays one action: a restart if one is waiting, otherwise whatever the ball carrier (or a challenger) does. */
export const playAction = (ctx: ActionContext): ActionResult => {
  const { input, play, sim } = ctx;
  if (play.restart !== undefined) return takeRestart(ctx, play.restart);

  const side = play.possession;
  const foe = other(side);
  const sheet = sheetOf(input, side);
  const foeSheet = sheetOf(input, foe);
  const ball = play.ball;
  const raw = shapesFor(input, play, ball);
  const slot = play.slot ?? nearestSlot(raw[side], ball);
  const shapes = withCarrier(raw, side, slot, ball);
  const carrier = sheet.starters[slot] as TeamSheet["starters"][number];
  const pressure = pressureOn(ball, side, shapes);
  const opponents = challengers(foeSheet, shapes[foe]);
  const outfieldOpponents = opponents.filter((o) => o.slot !== 0);
  const keeper = opponents[0] as Challenger;
  const snapshot = buildSnapshot(shapes, ball, ctx.presentation);
  const base = { time: ctx.time, period: ctx.period, snapshot, pressure, from: ball };
  const finish = (
    events: ActionEvent[],
    resolution: Resolution<string>,
    goalBy?: Side,
  ): ActionResult => {
    const type = (events.at(-1) as ActionEvent).type;
    const next = afterResolution(play, resolution, type, goalBy);
    return {
      events,
      play: next,
      duration: actionDuration(type, sheet.tactics.tempo, sim),
    };
  };
  const shoot = (xg: number, penalty: boolean): ActionResult => {
    const resolution = resolveShot(
      {
        side,
        shooter: carrier,
        shooterSlot: slot,
        from: ball,
        keeper,
        blockers: outfieldOpponents,
        xg,
        pressure: penalty ? 0 : pressure,
        penalty,
      },
      sim,
    );
    const goal = resolution.outcome === "goal";
    const event: ActionEvent = {
      ...base,
      type: "shot",
      team: side,
      actor: carrier.id,
      opponent: keeper.player.id,
      outcome: resolution.outcome,
      xg,
      to: resolution.ball,
    };
    const result = finish([event], resolution, goal ? side : undefined);
    const previous = ctx.previous;
    if (previous === undefined) return result;
    const [marked] = markKeyPasses([previous, event]);
    return marked === previous ? result : { ...result, replacedPrevious: marked as PassEvent };
  };

  if (play.penalty === true) return shoot(PENALTY_XG, true);

  const challenger = nearest(outfieldOpponents, ball);
  if (challenger !== undefined && sim.next() < CHALLENGE_PRESSURE_GAIN * pressure) {
    const resolution = resolveChallenge(
      {
        carrierSide: side,
        carrierSlot: slot,
        carrier,
        tacklerSlot: challenger.slot,
        tackler: challenger.player,
        point: ball,
        pressure,
      },
      sim,
    );
    if (resolution.outcome === "foul") {
      const foul: ActionEvent = {
        ...base,
        type: "foul",
        team: side,
        actor: carrier.id,
        opponent: challenger.player.id,
        outcome: resolution.restart?.variant === "penalty" ? "penalty" : "freeKick",
        to: ball,
      };
      return finish([foul], resolution);
    }
    const tackle: ActionEvent = {
      ...base,
      type: "tackle",
      team: foe,
      actor: challenger.player.id,
      opponent: carrier.id,
      outcome: resolution.outcome,
      to: ball,
    };
    return finish([tackle], resolution);
  }

  const option = chooseOption(
    buildOptions({ side, slot, players: sheet.starters }, shapes, sheet.tactics),
    sim,
  );
  switch (option.type) {
    case "shot":
      return shoot(option.xg, false);
    case "pass": {
      const receiver = sheet.starters[option.target] as TeamSheet["starters"][number];
      const resolution = resolvePass(
        {
          side,
          passer: carrier,
          receiverSlot: option.target,
          receiver,
          variant: option.variant,
          from: ball,
          to: option.to,
          pressure,
          opponents,
        },
        sim,
      );
      const interceptor =
        resolution.outcome === "intercepted" && resolution.possession.slot !== undefined
          ? foeSheet.starters[resolution.possession.slot]
          : undefined;
      const event: ActionEvent = {
        ...base,
        type: "pass",
        team: side,
        actor: carrier.id,
        target: receiver.id,
        variant: option.variant,
        outcome: resolution.outcome,
        to: resolution.ball,
        ...(interceptor === undefined ? {} : { opponent: interceptor.id }),
      };
      return finish([event], resolution);
    }
    case "carry": {
      const resolution = resolveCarry(
        {
          side,
          carrier,
          carrierSlot: slot,
          from: ball,
          to: option.to,
          pressure,
          defender: nearest(outfieldOpponents, ball),
        },
        sim,
      );
      const tackler =
        resolution.outcome === "tackled" && resolution.possession.slot !== undefined
          ? foeSheet.starters[resolution.possession.slot]
          : undefined;
      const event: ActionEvent = {
        ...base,
        type: "carry",
        team: side,
        actor: carrier.id,
        outcome: resolution.outcome,
        to: resolution.ball,
        ...(tackler === undefined ? {} : { opponent: tackler.id }),
      };
      return finish([event], resolution);
    }
    case "clearance": {
      const resolution = resolveClearance(
        {
          side,
          clearer: carrier,
          clearerSlot: slot,
          from: ball,
          pressure,
          teammates: challengers(sheet, shapes[side], [slot]),
          opponents,
        },
        sim,
      );
      const event: ActionEvent = {
        ...base,
        type: "clearance",
        team: side,
        actor: carrier.id,
        outcome: resolution.outcome,
        to: resolution.ball,
      };
      return finish([event], resolution);
    }
  }
};
