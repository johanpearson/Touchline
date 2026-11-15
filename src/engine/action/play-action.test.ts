import { describe, expect, it } from "vitest";
import type { Side } from "../match-state";
import { createRng } from "../rng";
import { aMatchInputV2 } from "./action-builders";
import type { ActionEvent, PassEvent, ShotEvent } from "./action-event";
import { PENALTY_XG } from "./decision-constants";
import { NO_RECENT_TURNOVER, PENALTY_SPOT_DEPTH } from "./loop-constants";
import type { MatchInputV2 } from "./match-input-v2";
import { PITCH_LENGTH, type Point } from "./pitch-metres";
import { type ActionContext, kickoffFor, kickoffPlay, playAction } from "./play-action";
import type { PlayState } from "./play-state";
import { FREE_KICK_SHOT_PRESSURE } from "./set-piece-constants";
import { setPieceShape } from "./set-piece-shape";
import { shotXg, toAttackingFrame } from "./shot-xg";

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
