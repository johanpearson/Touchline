import { describe, expect, it } from "vitest";
import type { Side } from "../match-state";
import { createRng } from "../rng";
import { NEUTRAL_TACTICS, type TeamTactics } from "../tactics";
import { aMatchInputV2 } from "./action-builders";
import type { ActionEvent, PassEvent, ShotEvent } from "./action-event";
import { buildOptions } from "./build-options";
import {
  CARRY_KEPT_MAX,
  CARRY_KEPT_MIN,
  HOME_ADVANTAGE,
  PENALTY_XG,
  PRESSING_TURNOVER_BONUS,
} from "./decision-constants";
import type { EnginePlayer } from "./engine-player";
import { CHALLENGE_PRESSURE_GAIN, NO_RECENT_TURNOVER, PENALTY_SPOT_DEPTH } from "./loop-constants";
import type { MatchInputV2 } from "./match-input-v2";
import type { Challenger } from "./open-play-types";
import { PITCH_LENGTH, type Point } from "./pitch-metres";
import { type ActionContext, kickoffFor, kickoffPlay, playAction, shapesFor } from "./play-action";
import type { PlayState } from "./play-state";
import { pressureOn } from "./pressure";
import { carryKeptChance } from "./resolve-carry";
import { foulChance } from "./resolve-challenge";
import { interceptionChance } from "./resolve-interception";
import { laneInterceptors } from "./resolve-pass";
import { FREE_KICK_SHOT_PRESSURE } from "./set-piece-constants";
import { setPieceShape } from "./set-piece-shape";
import { shotXg, toAttackingFrame } from "./shot-xg";
import { actionTactics } from "./tactics-parameters";
import { phaseOf } from "./team-phase";
import { teamShape } from "./team-shape";

const input: MatchInputV2 = aMatchInputV2().build();
const sheets = { home: input.home, away: input.away };
const at = (x: number, y = 34): Point => ({ x, y });

/** A generator that returns the scripted values from `next` (then 0.999) and `ints` from `int`. */
const scripted = (values: number[], ints: number[] = []) => {
  let i = 0;
  let k = 0;
  const calls: [number, number][] = [];
  const rng = {
    ...createRng(1),
    next: () => values[i++] ?? 0.999,
    int: (min: number, max: number) => {
      calls.push([min, max]);
      return ints[k++] ?? min;
    },
  };
  return { rng, calls };
};

const play = (extra: Partial<PlayState> = {}): PlayState => ({
  possession: "home",
  ball: at(52.5),
  lastType: "pass",
  actionsSinceTurnover: 5,
  score: { home: 0, away: 0 },
  fouls: { home: 0, away: 0 },
  ...extra,
});
const context = (
  state: PlayState,
  rng: ActionContext["sim"],
  extra: Partial<ActionContext> = {},
) => ({
  input,
  play: state,
  time: 100,
  period: "firstHalf" as const,
  sim: rng,
  ...extra,
});
const idOf = (side: Side, slot: number) =>
  (side === "home" ? input.home : input.away).starters[slot]?.id;
const only = <T extends ActionEvent>(events: ActionEvent[]): T => {
  expect(events).toHaveLength(1);
  return events[0] as T;
};

const actorOf = (event: ActionEvent): string | undefined =>
  "actor" in event ? event.actor : undefined;

describe("kickoffPlay and kickoffFor", () => {
  it("starts a half with a kickoff on the centre spot for the given team", () => {
    const state = kickoffPlay("away", { home: 1, away: 2 }, { home: 3, away: 4 });
    expect(state.restart).toEqual({ team: "away", variant: "kickoff", position: at(52.5, 34) });
    expect(state.possession).toBe("away");
    expect(state.ball).toEqual(at(52.5, 34));
    expect(state.score).toEqual({ home: 1, away: 2 });
    expect(state.fouls).toEqual({ home: 3, away: 4 });
    expect(state.lastType).toBe("none");
    expect(state.actionsSinceTurnover).toBe(NO_RECENT_TURNOVER);
    expect(kickoffFor("home")).toEqual({
      team: "home",
      variant: "kickoff",
      position: at(52.5, 34),
    });
  });
});

describe("playAction taking a restart", () => {
  it("takes a kickoff: a set-piece event by the taker, then play on with the taker on the ball", () => {
    const { rng } = scripted([0.5]);
    const result = playAction(
      context(kickoffPlay("home", { home: 0, away: 0 }, { home: 0, away: 0 }), rng),
    );
    const event = only(result.events);
    const layout = setPieceShape("kickoff", "home", at(52.5, 34), sheets);
    expect(event).toMatchObject({
      type: "setPiece",
      variant: "kickoff",
      outcome: "taken",
      time: 100,
      period: "firstHalf",
      team: "home",
      actor: idOf("home", layout.taker),
      from: at(52.5, 34),
      to: at(52.5, 34),
      pressure: 0,
    });
    expect(result.play).toMatchObject({
      possession: "home",
      slot: layout.taker,
      restart: undefined,
      penalty: false,
      lastType: "setPiece",
      ball: at(52.5, 34),
    });
    expect(result.play.setUp?.variant).toBe("kickoff");
    expect(result.play.setUp?.layout.taker).toBe(layout.taker);
    expect(result.duration).toBeGreaterThanOrEqual(2);
    expect(result.duration).toBeLessThanOrEqual(4);
  });

  it("counts the restart as a turnover for the other side and as one more action for the same side", () => {
    const corner = { team: "away" as const, variant: "corner" as const, position: at(0, 0) };
    const { rng } = scripted([0.5]);
    const turnover = playAction(context(play({ possession: "home", restart: corner }), rng));
    expect(turnover.play.possession).toBe("away");
    expect(turnover.play.actionsSinceTurnover).toBe(0);
    const same = playAction(
      context(play({ possession: "away", restart: corner }), scripted([0.5]).rng),
    );
    expect(same.play.actionsSinceTurnover).toBe(6);
  });

  it("sets a penalty up on the penalty spot of the attacked goal with the penalty flag", () => {
    const penalty = { team: "home" as const, variant: "penalty" as const, position: at(90, 30) };
    const result = playAction(context(play({ restart: penalty }), scripted([0.5]).rng));
    const event = only(result.events);
    expect(event.from).toEqual(at(PITCH_LENGTH - PENALTY_SPOT_DEPTH, 34));
    expect(result.play.penalty).toBe(true);
    expect(result.play.ball).toEqual(at(PITCH_LENGTH - PENALTY_SPOT_DEPTH, 34));
    const away = playAction(
      context(
        play({ possession: "away", restart: { ...penalty, team: "away" } }),
        scripted([0.5]).rng,
      ),
    );
    expect(away.play.ball).toEqual(at(PENALTY_SPOT_DEPTH, 34));
    expect(away.play.penalty).toBe(true);
  });

  it("does not flag a restart that is not a penalty", () => {
    const goalKick = { team: "home" as const, variant: "goalKick" as const, position: at(5.5, 34) };
    const result = playAction(context(play({ restart: goalKick }), scripted([0.5]).rng));
    expect(result.play.penalty).toBe(false);
    expect(result.play.slot).toBe(0);
  });
});

describe("playAction penalties and goals", () => {
  const taker = 10;
  const penaltyPlay = (extra: Partial<PlayState> = {}) =>
    play({ penalty: true, slot: taker, ball: at(PITCH_LENGTH - PENALTY_SPOT_DEPTH, 34), ...extra });

  it("scores a penalty below its goal chance: a shot event, the score, a kickoff for the other side", () => {
    const result = playAction(context(penaltyPlay(), scripted([0]).rng));
    const event = only<ShotEvent>(result.events);
    expect(event).toMatchObject({
      type: "shot",
      team: "home",
      actor: idOf("home", taker),
      opponent: idOf("away", 0),
      outcome: "goal",
      xg: PENALTY_XG,
    });
    expect(result.play.score).toEqual({ home: 1, away: 0 });
    expect(result.play.restart).toEqual({
      team: "away",
      variant: "kickoff",
      position: at(52.5, 34),
    });
    expect(result.play.possession).toBe("away");
    expect(result.play.slot).toBeUndefined();
    expect(result.play.lastType).toBe("shot");
    expect(result.play.actionsSinceTurnover).toBe(0);
    expect(result.play.fouls).toEqual({ home: 0, away: 0 });
  });

  it("scores for the away side and gives the kickoff to the home side", () => {
    const state = penaltyPlay({ possession: "away", ball: at(PENALTY_SPOT_DEPTH, 34) });
    const result = playAction(context(state, scripted([0]).rng));
    expect(result.play.score).toEqual({ home: 0, away: 1 });
    expect(result.play.restart?.team).toBe("home");
    expect(result.play.possession).toBe("home");
  });

  it("adds a goal to the existing score", () => {
    const result = playAction(
      context(penaltyPlay({ score: { home: 2, away: 3 } }), scripted([0]).rng),
    );
    expect(result.play.score).toEqual({ home: 3, away: 3 });
  });

  it("gives a goal kick to the keeper's side after a missed penalty and leaves the score alone", () => {
    const result = playAction(
      context(penaltyPlay({ score: { home: 1, away: 0 } }), scripted([0.999]).rng),
    );
    const event = only<ShotEvent>(result.events);
    expect(event.outcome).toBe("missed");
    expect(result.play.score).toEqual({ home: 1, away: 0 });
    expect(result.play.restart?.variant).toBe("goalKick");
    expect(result.play.restart?.team).toBe("away");
    expect(result.play.possession).toBe("away");
    expect(result.play.actionsSinceTurnover).toBe(0);
  });

  it("keeps the count of actions going when the shooting side keeps the ball", () => {
    // A saved penalty that the keeper pushes out for a corner stays with the shooting side.
    const result = playAction(context(penaltyPlay(), scripted([0.8, 0]).rng));
    const event = only<ShotEvent>(result.events);
    expect(event.outcome).toBe("saved");
    expect(result.play.possession).toBe("home");
    expect(result.play.actionsSinceTurnover).toBe(6);
    expect(result.play.restart?.variant).toBe("corner");
  });

  it("marks the pass before a shot as a key pass when the receiver shoots, and only then", () => {
    const earlier: PassEvent = {
      type: "pass",
      variant: "short",
      outcome: "complete",
      time: 97,
      period: "firstHalf",
      team: "home",
      actor: idOf("home", 5) as string,
      target: idOf("home", taker) as string,
      from: at(80),
      to: at(94),
      pressure: 0,
    };
    const marked = playAction(context(penaltyPlay(), scripted([0]).rng, { previous: earlier }));
    expect(marked.replacedPrevious).toEqual({ ...earlier, keyPass: true });
    const other = { ...earlier, target: idOf("home", 4) as string };
    const unmarked = playAction(context(penaltyPlay(), scripted([0]).rng, { previous: other }));
    expect(unmarked.replacedPrevious).toBeUndefined();
    const none = playAction(context(penaltyPlay(), scripted([0]).rng));
    expect(none.replacedPrevious).toBeUndefined();
  });
});

describe("playAction free kicks and first passes", () => {
  const spot = at(85, 34);
  const layoutFor = (
    variant: "freeKick" | "corner" | "throwIn" | "goalKick" | "kickoff",
    p: Point,
    side: Side = "home",
  ) => setPieceShape(variant, side, p, sheets);

  it("shoots a free kick in range straight at goal with the free-kick pressure and no challenge draw", () => {
    const layout = layoutFor("freeKick", spot);
    expect(layout.wall.length).toBeGreaterThan(0);
    const state = play({ ball: spot, slot: layout.taker, setUp: { variant: "freeKick", layout } });
    const result = playAction(context(state, scripted([0]).rng));
    const event = only<ShotEvent>(result.events);
    expect(event.type).toBe("shot");
    expect(event.actor).toBe(idOf("home", layout.taker));
    expect(event.xg).toBe(shotXg(toAttackingFrame("home", spot), FREE_KICK_SHOT_PRESSURE));
    expect(event.outcome).toBe("goal");
  });

  it("plays a free kick out of range as open play, not a shot with the free-kick xG", () => {
    const far = at(40, 20);
    const layout = layoutFor("freeKick", far);
    expect(layout.wall).toEqual([]);
    const state = play({ ball: far, slot: layout.taker, setUp: { variant: "freeKick", layout } });
    const result = playAction(context(state, scripted([0.999, 0.5]).rng));
    const event = only(result.events);
    expect(event.type).not.toBe("setPiece");
    expect(event.type === "shot" ? event.xg : 0).not.toBe(
      shotXg(toAttackingFrame("home", far), FREE_KICK_SHOT_PRESSURE),
    );
  });

  it.each([
    ["corner", at(105, 0), "cross"],
    ["throwIn", at(40, 0), "short"],
    ["goalKick", at(5.5, 34), "long"],
  ] as const)(
    "plays the first pass of a %s as a %s to a drawn target",
    (variant, p, passVariant) => {
      const layout = layoutFor(variant, p);
      expect(layout.targets.length).toBeGreaterThan(1);
      const state = play({ ball: p, slot: layout.taker, setUp: { variant, layout } });
      const { rng, calls } = scripted([0.999], [1]);
      const result = playAction(context(state, rng));
      const event = only<PassEvent>(result.events);
      expect(calls).toEqual([[0, layout.targets.length - 1]]);
      expect(event.type).toBe("pass");
      expect(event.variant).toBe(passVariant);
      expect(event.actor).toBe(idOf("home", layout.taker));
      expect(event.target).toBe(idOf("home", layout.targets[1] as number));
      expect(event.from).toEqual(p);
    },
  );

  it("does not draw a first-pass target for a set piece without one", () => {
    const layout = layoutFor("kickoff", at(52.5, 34));
    const state = play({
      ball: at(52.5, 34),
      slot: layout.taker,
      setUp: { variant: "kickoff", layout },
    });
    const { calls } = (() => {
      const s = scripted([0.999, 0.5], [1]);
      playAction(context(state, s.rng));
      return s;
    })();
    expect(calls).toEqual([]);
  });
});

/** Where the ball carrier stands and what he can do, worked out with the same pieces the engine uses. */
const prepare = (ball: Point, slot: number) => {
  const state = play({ ball, slot });
  const raw = shapesFor(input, state, ball);
  const shapes = { ...raw, home: raw.home.map((p, i) => (i === slot ? ball : p)) };
  const pressure = pressureOn(ball, "home", shapes, actionTactics(input.away.tactics).pressRadius);
  const options = buildOptions(
    {
      side: "home",
      slot,
      players: input.home.starters,
      foeTactics: input.away.tactics,
      transition: false,
    },
    shapes,
    input.home.tactics,
  );
  const challenger = shapes.away
    .map((point, awaySlot) => ({ point, awaySlot }))
    .filter((c) => c.awaySlot !== 0)
    .reduce((best, c) =>
      Math.hypot(c.point.x - ball.x, c.point.y - ball.y) <
      Math.hypot(best.point.x - ball.x, best.point.y - ball.y)
        ? c
        : best,
    );
  return { state, shapes, pressure, options, challenger: challenger.awaySlot };
};
const carrierBall = at(60, 34);
const carrierSlot = 6;

describe("playAction challenges", () => {
  const { state, pressure, challenger } = prepare(carrierBall, carrierSlot);
  const threshold = CHALLENGE_PRESSURE_GAIN * pressure;
  const tackler = input.away.starters[challenger];

  it("has pressure on the carrier to work with", () => {
    expect(pressure).toBeGreaterThan(0.2);
  });

  it("challenges when the draw is just below the pressure threshold and not exactly at it", () => {
    const challenged = playAction(context(state, scripted([threshold - 1e-9, 0]).rng));
    expect(["foul", "tackle"]).toContain(only(challenged.events).type);
    const open = playAction(context(state, scripted([threshold, 0.5]).rng));
    expect(["foul", "tackle"]).not.toContain(only(open.events).type);
  });

  it("whistles a foul for the carrier's side: a free kick, a foul counted against the tackler's side", () => {
    const result = playAction(context(state, scripted([0, 0]).rng));
    const event = only(result.events);
    expect(event).toMatchObject({
      type: "foul",
      team: "home",
      actor: idOf("home", carrierSlot),
      opponent: tackler?.id,
      outcome: "freeKick",
      from: carrierBall,
      to: carrierBall,
      time: 100,
      period: "firstHalf",
    });
    expect(event.pressure).toBeCloseTo(pressure, 9);
    expect(result.play.restart).toEqual({
      team: "home",
      variant: "freeKick",
      position: carrierBall,
    });
    expect(result.play.fouls).toEqual({ home: 0, away: 1 });
    expect(result.play.possession).toBe("home");
    expect(result.play.lastType).toBe("foul");
    expect(result.play.actionsSinceTurnover).toBe(6);
  });

  it("counts fouls on top of the earlier ones and against the other side for an away carrier", () => {
    const counted = playAction(
      context({ ...state, fouls: { home: 2, away: 4 } }, scripted([0, 0]).rng),
    );
    expect(counted.play.fouls).toEqual({ home: 2, away: 5 });
  });

  it("gives a penalty for a foul inside the attacked box", () => {
    const box = prepare(at(100, 34), 9);
    expect(box.pressure).toBeGreaterThan(0);
    const result = playAction(context(box.state, scripted([0, 0]).rng));
    const event = only(result.events);
    expect(event.type).toBe("foul");
    expect(event.type === "foul" ? event.outcome : "").toBe("penalty");
    expect(result.play.restart?.variant).toBe("penalty");
  });

  it("lets the tackler win the ball: a tackle event by the defender and the ball changes sides", () => {
    const draw = foulChance(tackler as EnginePlayer) + 1e-6;
    const result = playAction(context(state, scripted([0, draw]).rng));
    const event = only(result.events);
    expect(event).toMatchObject({
      type: "tackle",
      team: "away",
      actor: tackler?.id,
      opponent: idOf("home", carrierSlot),
      outcome: "won",
      from: carrierBall,
      to: carrierBall,
    });
    expect(result.play.possession).toBe("away");
    expect(result.play.slot).toBe(challenger);
    expect(result.play.actionsSinceTurnover).toBe(0);
    expect(result.play.lastType).toBe("tackle");
    expect(result.play.fouls).toEqual({ home: 0, away: 0 });
  });

  it("lets the carrier keep the ball when the tackle is lost", () => {
    const result = playAction(context(state, scripted([0, 0.9999]).rng));
    const event = only(result.events);
    expect(event).toMatchObject({
      type: "tackle",
      team: "away",
      actor: tackler?.id,
      outcome: "lost",
    });
    expect(result.play.possession).toBe("home");
    expect(result.play.slot).toBe(carrierSlot);
    expect(result.play.actionsSinceTurnover).toBe(6);
  });
});

describe("playAction open play", () => {
  /** A draw that lands in the middle of the band of the option at `index`. */
  const drawFor = (weights: number[], index: number) => {
    const total = weights.reduce((a, b) => a + b, 0);
    const before = weights.slice(0, index).reduce((a, b) => a + b, 0);
    return (before + (weights[index] as number) / 2) / total;
  };
  const indexOf = (options: ReturnType<typeof prepare>["options"], type: string) =>
    options.findIndex((o) => o.type === type);

  it("takes the carrier from the nearest player when no one is named", () => {
    const { shapes } = prepare(carrierBall, carrierSlot);
    const nearest = shapes.home
      .map((p, i) => ({ i, d: Math.hypot(p.x - carrierBall.x, p.y - carrierBall.y) }))
      .reduce((a, b) => (b.d < a.d ? b : a)).i;
    const state = play({ ball: carrierBall });
    const result = playAction(context(state, scripted([0.999, 0.5]).rng));
    expect(actorOf(only(result.events))).toBe(idOf("home", nearest));
  });

  it("shoots when the draw lands in the shot band: the option's xG, the shooter's id, the keeper as opponent", () => {
    const { state, options } = prepare(at(95, 30), 9);
    const index = indexOf(options, "shot");
    const shot = options[index];
    const result = playAction(
      context(
        state,
        scripted([
          0.999,
          drawFor(
            options.map((o) => o.weight),
            index,
          ),
        ]).rng,
      ),
    );
    const event = only<ShotEvent>(result.events);
    expect(event.type).toBe("shot");
    expect(event.xg).toBe(shot?.type === "shot" ? shot.xg : -1);
    expect(event.actor).toBe(idOf("home", 9));
    expect(event.opponent).toBe(idOf("away", 0));
    expect(event.from).toEqual(at(95, 30));
  });

  it("passes to the option's target with its variant when the draw lands in a pass band", () => {
    const { state, options } = prepare(carrierBall, carrierSlot);
    const index = options.findIndex((o) => o.type === "pass" && o.weight > 0.2);
    const option = options[index];
    const result = playAction(
      context(
        state,
        scripted([
          0.999,
          drawFor(
            options.map((o) => o.weight),
            index,
          ),
          0,
        ]).rng,
      ),
    );
    const event = only<PassEvent>(result.events);
    expect(event.type).toBe("pass");
    expect(event.variant).toBe(option?.type === "pass" ? option.variant : "");
    expect(event.target).toBe(idOf("home", option?.type === "pass" ? option.target : -1));
    expect(actorOf(event)).toBe(idOf("home", carrierSlot));
    expect(event.outcome).toBe("complete");
  });

  it("carries when the draw lands in the carry band, and names the tackler of a lost carry", () => {
    const { state, options, challenger } = prepare(carrierBall, carrierSlot);
    const index = indexOf(options, "carry");
    const draw = drawFor(
      options.map((o) => o.weight),
      index,
    );
    const kept = playAction(context(state, scripted([0.999, draw, 0]).rng));
    const keptEvent = only(kept.events);
    expect(keptEvent.type).toBe("carry");
    expect(keptEvent.type === "carry" ? keptEvent.outcome : "").toBe("kept");
    expect(keptEvent.type === "carry" ? keptEvent.opponent : "x").toBeUndefined();
    const lost = playAction(context(state, scripted([0.999, draw, 0.999]).rng));
    const lostEvent = only(lost.events);
    expect(lostEvent.type).toBe("carry");
    expect(lostEvent.type === "carry" ? lostEvent.outcome : "").toBe("tackled");
    expect(lostEvent.type === "carry" ? lostEvent.opponent : "").toBe(idOf("away", challenger));
    expect(lost.play.possession).toBe("away");
    expect(lost.play.slot).toBe(challenger);
  });

  it("clears the ball when the draw lands in the clearance band", () => {
    const { state, options } = prepare(carrierBall, carrierSlot);
    const index = indexOf(options, "clearance");
    expect(options[index]?.weight).toBeGreaterThan(0);
    const result = playAction(
      context(
        state,
        scripted([
          0.999,
          drawFor(
            options.map((o) => o.weight),
            index,
          ),
        ]).rng,
      ),
    );
    const event = only(result.events);
    expect(event.type).toBe("clearance");
    expect(actorOf(event)).toBe(idOf("home", carrierSlot));
    expect(event.team).toBe("home");
  });

  it("builds snapshots only when a presentation stream is given", () => {
    const { state } = prepare(carrierBall, carrierSlot);
    const without = playAction(context(state, scripted([0.999, 0.5, 0]).rng));
    expect(only(without.events).snapshot).toBeUndefined();
    const withPresentation = playAction(
      context(state, scripted([0.999, 0.5, 0]).rng, { presentation: createRng(7) }),
    );
    expect(only(withPresentation.events).snapshot?.players).toHaveLength(22);
  });

  it("gives every action a duration of two to four seconds", () => {
    const { state } = prepare(carrierBall, carrierSlot);
    const result = playAction(context(state, scripted([0.999, 0.5, 0, 0]).rng));
    expect(result.duration).toBeGreaterThanOrEqual(2);
    expect(result.duration).toBeLessThanOrEqual(4);
  });
});

describe("playAction press, home advantage and transition effects", () => {
  const highPress: TeamTactics = { ...NEUTRAL_TACTICS, pressing: "high" };
  const PRESS = PRESSING_TURNOVER_BONUS.high;
  const EPS = 1e-9;

  /** Everything the carrier's decision uses, worked out with the same pieces the engine uses. */
  const scenario = (
    side: Side,
    ball: Point,
    foeTactics: TeamTactics,
    extra: Partial<PlayState> = {},
    slot = 6,
  ) => {
    const foe: Side = side === "home" ? "away" : "home";
    const custom = aMatchInputV2()
      .withHome({ ...input.home, tactics: side === "home" ? NEUTRAL_TACTICS : foeTactics })
      .withAway({ ...input.away, tactics: side === "away" ? NEUTRAL_TACTICS : foeTactics })
      .build();
    const state = play({ possession: side, ball, slot, ...extra });
    const raw = shapesFor(custom, state, ball);
    const shapes = { ...raw, [side]: raw[side].map((p, i) => (i === slot ? ball : p)) };
    const mine = side === "home" ? custom.home : custom.away;
    const theirs = side === "home" ? custom.away : custom.home;
    const pressure = pressureOn(ball, side, shapes, actionTactics(foeTactics).pressRadius);
    const opponents: Challenger[] = theirs.starters.map((player, i) => ({
      slot: i,
      player,
      point: shapes[foe][i] as Point,
    }));
    const transition =
      phaseOf(side, state.possession, ball, {
        type: state.lastType,
        actionsSinceTurnover: state.actionsSinceTurnover,
      }) === "transition";
    const options = buildOptions(
      { side, slot, players: mine.starters, foeTactics: theirs.tactics, transition },
      shapes,
      mine.tactics,
    );
    const nearestOutfield = opponents
      .filter((o) => o.slot !== 0)
      .reduce((a, b) =>
        Math.hypot(b.point.x - ball.x, b.point.y - ball.y) <
        Math.hypot(a.point.x - ball.x, a.point.y - ball.y)
          ? b
          : a,
      );
    return {
      custom,
      state,
      shapes,
      mine,
      theirs,
      pressure,
      opponents,
      options,
      nearestOutfield,
      slot,
      run: (draws: number[]) =>
        playAction({ ...context(state, scripted(draws).rng), input: custom }),
    };
  };
  const bandMiddle = (weights: number[], index: number) => {
    const total = weights.reduce((a, b) => a + b, 0);
    const before = weights.slice(0, index).reduce((a, b) => a + b, 0);
    return (before + (weights[index] as number) / 2) / total;
  };
  const bandAt = (weights: number[], draw: number) => {
    const total = weights.reduce((a, b) => a + b, 0);
    let acc = 0;
    for (let i = 0; i < weights.length; i++) {
      acc += (weights[i] as number) / total;
      if (draw < acc) return i;
    }
    return weights.length - 1;
  };

  // [side, ball, expected net interception bonus against the passer, expected kept bonus]
  const cases = [
    ["home", at(30), PRESS, HOME_ADVANTAGE - PRESS],
    ["home", at(70), 0, HOME_ADVANTAGE],
    ["home", at(52.5), 0, HOME_ADVANTAGE],
    ["away", at(75), PRESS + HOME_ADVANTAGE, -HOME_ADVANTAGE - PRESS],
    ["away", at(30), HOME_ADVANTAGE, -HOME_ADVANTAGE],
  ] as const;

  it.each(cases)(
    "%s passer at %j: the interception chance carries the press and the opponent's home edge",
    (side, ball, bonus) => {
      const sc = scenario(side, ball, highPress);
      const index = sc.options.findIndex(
        (o) =>
          o.type === "pass" &&
          o.variant !== "cross" &&
          o.weight > 0 &&
          laneInterceptors(o.from, o.to, sc.opponents).length > 0,
      );
      expect(index).toBeGreaterThanOrEqual(0);
      const draw = bandMiddle(
        sc.options.map((o) => o.weight),
        index,
      );
      const lane = laneInterceptors(
        sc.options[index]?.from as Point,
        sc.options[index]?.to as Point,
        sc.opponents,
      );
      const best = lane.reduce((a, b) =>
        interceptionChance(b, sc.pressure, bonus) > interceptionChance(a, sc.pressure, bonus)
          ? b
          : a,
      );
      const chance = interceptionChance(best, sc.pressure, bonus);
      const completion = 0.999;

      const taken = sc.run([0.999, draw, completion, chance - EPS]);
      const intercepted = only<PassEvent>(taken.events);
      expect(intercepted.outcome).toBe("intercepted");
      expect(intercepted.opponent).toBe(sc.theirs.starters[best.slot]?.id);
      expect(taken.play.slot).toBe(best.slot);
      expect(taken.play.possession).toBe(side === "home" ? "away" : "home");

      const missed = sc.run([0.999, draw, completion, chance + EPS]);
      const kept = only<PassEvent>(missed.events);
      expect(kept.outcome).not.toBe("intercepted");
      expect("opponent" in kept).toBe(false);
    },
  );

  it("leaves the opponent off a completed pass", () => {
    const sc = scenario("home", at(30), highPress);
    const index = sc.options.findIndex((o) => o.type === "pass" && o.weight > 0.2);
    const done = sc.run([
      0.999,
      bandMiddle(
        sc.options.map((o) => o.weight),
        index,
      ),
      0,
    ]);
    const event = only<PassEvent>(done.events);
    expect(event.outcome).toBe("complete");
    expect("opponent" in event).toBe(false);
  });

  it.each(cases)(
    "%s carrier at %j: the kept chance carries home edge minus the press",
    (side, ball, _bonus, keptBonus) => {
      const sc = scenario(side, ball, highPress);
      const index = sc.options.findIndex((o) => o.type === "carry");
      const option = sc.options[index];
      const chance = carryKeptChance({
        side,
        carrier: sc.mine.starters[sc.slot] as EnginePlayer,
        carrierSlot: sc.slot,
        from: ball,
        to: option?.to as Point,
        pressure: sc.pressure,
        defender: sc.nearestOutfield,
        keptBonus,
      });
      expect(chance).toBeGreaterThan(CARRY_KEPT_MIN);
      expect(chance).toBeLessThan(CARRY_KEPT_MAX);
      const draw = bandMiddle(
        sc.options.map((o) => o.weight),
        index,
      );
      const kept = only(sc.run([0.999, draw, chance - EPS]).events);
      expect(kept.type === "carry" ? kept.outcome : "").toBe("kept");
      const lost = only(sc.run([0.999, draw, chance + EPS]).events);
      expect(lost.type === "carry" ? lost.outcome : "").toBe("tackled");
    },
  );

  it("weights the options with the space behind a press only right after a turnover", () => {
    const ball = at(60);
    const fresh = scenario("home", ball, highPress, {
      lastType: "tackle",
      actionsSinceTurnover: 0,
    });
    const settled = scenario("home", ball, highPress, {
      lastType: "pass",
      actionsSinceTurnover: 5,
    });
    const freshWeights = fresh.options.map((o) => o.weight);
    const settledWeights = settled.options.map((o) => o.weight);
    const carry = fresh.options.findIndex((o) => o.type === "carry");
    const grid = Array.from({ length: 999 }, (_, i) => (i + 1) / 1000);
    const onlyFresh = grid.find(
      (d) => bandAt(freshWeights, d) === carry && bandAt(settledWeights, d) !== carry,
    );
    const onlySettled = grid.find(
      (d) => bandAt(settledWeights, d) === carry && bandAt(freshWeights, d) !== carry,
    );
    expect(onlyFresh).toBeDefined();
    expect(onlySettled).toBeDefined();
    const typeOf = (sc: typeof fresh, draw: number | undefined) =>
      only(sc.run([0.999, draw as number, 0]).events).type;
    expect(typeOf(fresh, onlyFresh)).toBe("carry");
    expect(typeOf(settled, onlyFresh)).not.toBe("carry");
    expect(typeOf(settled, onlySettled)).toBe("carry");
    expect(typeOf(fresh, onlySettled)).not.toBe("carry");
  });

  it("never lets the goalkeeper challenge the ball carrier", () => {
    const sc = scenario("home", at(100), NEUTRAL_TACTICS, {}, 9);
    const keeper = sc.shapes.away[0] as Point;
    const chosen = sc.nearestOutfield.point;
    expect(Math.hypot(keeper.x - 100, keeper.y - 34)).toBeLessThan(
      Math.hypot(chosen.x - 100, chosen.y - 34),
    );
    const event = only(sc.run([0, 0]).events);
    expect(event.type).toBe("foul");
    expect(event.type === "foul" ? event.opponent : "").toBe(
      sc.theirs.starters[sc.nearestOutfield.slot]?.id,
    );
  });
});

describe("shapesFor", () => {
  it("gives each side its own shape for the phase of play, a transition just after a turnover", () => {
    const ball = at(60);
    const fresh = play({ lastType: "tackle", actionsSinceTurnover: 0, ball });
    const settled = play({ lastType: "pass", actionsSinceTurnover: 5, ball });
    const expected = (state: PlayState) => ({
      home: teamShape(
        input.home,
        input.home.tactics,
        phaseOf("home", state.possession, ball, {
          type: state.lastType,
          actionsSinceTurnover: state.actionsSinceTurnover,
        }),
        ball,
        "home",
      ),
      away: teamShape(
        input.away,
        input.away.tactics,
        phaseOf("away", state.possession, ball, {
          type: state.lastType,
          actionsSinceTurnover: state.actionsSinceTurnover,
        }),
        ball,
        "away",
      ),
    });
    expect(shapesFor(input, fresh, ball)).toEqual(expected(fresh));
    expect(shapesFor(input, settled, ball)).toEqual(expected(settled));
    expect(shapesFor(input, fresh, ball)).not.toEqual(shapesFor(input, settled, ball));
  });
});
