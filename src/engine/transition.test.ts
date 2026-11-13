import { describe, expect, it } from "vitest";
import { aMatchInput, aTeamProfile } from "./match-builders";
import type { MatchEvent } from "./match-event";
import type { MatchState, Side } from "./match-state";
import { progressOf, xAtProgress } from "./pitch";
import type { Rng } from "./rng";
import type { TeamMatchProfile } from "./team-match-profile";
import { resolveTransition, SHOOTING_ZONE } from "./transition";
import { shotXg } from "./xg";

/**
 * A scripted RNG. `chance` answers from `answers` (false once they run out) and records every
 * probability it was asked about, so tests can check how ratings move a probability without
 * depending on its exact value. `next` answers from `numbers` (0.5 once they run out).
 */
const scriptedRng = (answers: boolean[] = [], numbers: number[] = []) => {
  const asked: number[] = [];
  const rng: Rng = {
    next: () => numbers.shift() ?? 0.5,
    int: (min) => min,
    pick: (list) => list[0] as never,
    chance: (p) => {
      asked.push(p);
      return answers.shift() ?? false;
    },
    fork: () => rng,
  };
  return { rng, asked };
};

const stateAt = (side: Side, progress: number, y = 0.5): MatchState => ({
  time: 100,
  period: "firstHalf",
  possession: side,
  ball: { x: xAtProgress(side, progress), y },
  danger: 0,
  score: { home: 0, away: 0 },
});

/** Input where `attacker` has the given profile and the other side has `defender`. */
const inputFor = (side: Side, attacker: TeamMatchProfile, defender: TeamMatchProfile) =>
  side === "home"
    ? aMatchInput().withHome(attacker).withAway(defender).build()
    : aMatchInput().withHome(defender).withAway(attacker).build();

const average = () => aTeamProfile().build();
const ofType = <T extends MatchEvent["type"]>(events: readonly MatchEvent[], type: T) =>
  events.filter((e): e is Extract<MatchEvent, { type: T }> => e.type === type);

/** The probability asked by the first `chance` call of a transition. */
const firstChance = (
  state: MatchState,
  attacker: TeamMatchProfile,
  defender: TeamMatchProfile,
): number => {
  const { rng, asked } = scriptedRng();
  resolveTransition(state, inputFor(state.possession, attacker, defender), rng);
  return asked[0] as number;
};

/** The probability asked by the nth `chance` call (0-based) of a shot that is not a goal. */
const shotChance = (
  n: number,
  attacker: TeamMatchProfile,
  defender: TeamMatchProfile,
  answers: boolean[] = [true, false, false],
): number => {
  // Call order: 0 = shoot roll, 1 = goal roll, 2 = block roll, ...
  const { rng, asked } = scriptedRng(answers);
  resolveTransition(stateAt("home", 0.9), inputFor("home", attacker, defender), rng);
  return asked[n] as number;
};

const strong = (p: ReturnType<typeof aTeamProfile>) => p.withAllRatings(0.9).build();
const weak = (p: ReturnType<typeof aTeamProfile>) => p.withAllRatings(0.1).build();

describe("resolveTransition: deciding whether to shoot", () => {
  it("does not look for a shot before the shooting zone", () => {
    const { rng, asked } = scriptedRng([true, true]);

    const { events } = resolveTransition(
      stateAt("home", 0.5),
      inputFor("home", average(), average()),
      rng,
    );

    expect(ofType(events, "shot")).toHaveLength(0);
    expect(asked).toHaveLength(1); // only the build-up decision
  });

  it("does not shoot exactly on the edge of the shooting zone", () => {
    const { rng } = scriptedRng([true, true]);

    const { events } = resolveTransition(
      stateAt("home", SHOOTING_ZONE),
      inputFor("home", average(), average()),
      rng,
    );

    expect(ofType(events, "shot")).toHaveLength(0);
  });

  it("shoots just inside the shooting zone when the shoot roll succeeds", () => {
    const { rng } = scriptedRng([true]);

    const { events } = resolveTransition(
      stateAt("home", SHOOTING_ZONE + 0.01),
      inputFor("home", average(), average()),
      rng,
    );

    expect(ofType(events, "shot")).toHaveLength(1);
  });

  it("builds up instead when the shoot roll fails in the shooting zone", () => {
    const { rng } = scriptedRng([false, true]);

    const { events } = resolveTransition(
      stateAt("home", 0.9),
      inputFor("home", average(), average()),
      rng,
    );

    expect(ofType(events, "shot")).toHaveLength(0);
    expect(events).toHaveLength(1);
  });

  it("measures the shooting zone towards the goal the away side attacks", () => {
    const { rng } = scriptedRng([true]);

    const { events } = resolveTransition(
      stateAt("away", 0.9),
      inputFor("away", average(), average()),
      rng,
    );

    expect(ofType(events, "shot")).toHaveLength(1);
  });

  it("makes better chance creation raise the shoot chance", () => {
    const state = stateAt("home", 0.9);
    const low = firstChance(state, aTeamProfile().withChanceCreation(0.1).build(), average());
    const high = firstChance(state, aTeamProfile().withChanceCreation(0.9).build(), average());

    expect(high).toBeGreaterThan(low);
  });

  it("makes better defending lower the shoot chance", () => {
    const state = stateAt("home", 0.9);
    const low = firstChance(state, average(), aTeamProfile().withDefending(0.1).build());
    const high = firstChance(state, average(), aTeamProfile().withDefending(0.9).build());

    expect(high).toBeLessThan(low);
  });

  it("keeps the shoot chance for average teams in a sensible range", () => {
    const p = firstChance(stateAt("home", 0.9), average(), average());

    expect(p).toBeGreaterThan(0.1);
    expect(p).toBeLessThan(0.5);
  });

  it("never lets any rating combination push the shoot chance outside 0..1", () => {
    for (const [a, d] of [
      [strong(aTeamProfile()), weak(aTeamProfile())],
      [weak(aTeamProfile()), strong(aTeamProfile())],
    ] as const) {
      const p = firstChance(stateAt("home", 0.9), a, d);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });
});

describe("resolveTransition: resolving a shot", () => {
  const shoot = (answers: boolean[], numbers: number[] = [], side: Side = "home") => {
    const { rng } = scriptedRng([true, ...answers], numbers);
    return resolveTransition(stateAt(side, 0.9, 0.4), inputFor(side, average(), average()), rng);
  };

  it("records the shot with its xG, position, time and intensity", () => {
    const { events } = shoot([false, false, false]);
    const [shot] = ofType(events, "shot");

    expect(shot).toMatchObject({ time: 100, team: "home", position: { x: 0.9, y: 0.4 } });
    expect(shot?.xg).toBeCloseTo(shotXg(0.9, 0.4));
    expect(shot?.intensity).toBeCloseTo(0.6 + (shot?.xg ?? 0) * 2);
  });

  it("scores a goal: updates the score, logs shot, goal and kickoff, and restarts from the centre", () => {
    const { state, events } = shoot([true]);

    expect(events.map((e) => e.type)).toEqual(["shot", "goal", "kickoff"]);
    expect(ofType(events, "shot")[0]?.outcome).toBe("goal");
    expect(ofType(events, "goal")[0]).toMatchObject({
      team: "home",
      position: { x: 0.9, y: 0.4 },
      intensity: 1,
    });
    expect(ofType(events, "kickoff")[0]).toMatchObject({
      team: "away",
      position: { x: 0.5, y: 0.5 },
    });
    expect(state.score).toEqual({ home: 1, away: 0 });
    expect(state.possession).toBe("away");
    expect(state.ball).toEqual({ x: 0.5, y: 0.5 });
    expect(state.danger).toBe(0);
  });

  it("credits the goal to the away side when it attacks", () => {
    const { state, events } = shoot([true], [], "away");

    expect(state.score).toEqual({ home: 0, away: 1 });
    expect(state.possession).toBe("home");
    expect(ofType(events, "kickoff")[0]?.team).toBe("home");
  });

  it("does not change the incoming state", () => {
    const before = stateAt("home", 0.9);
    const copy = structuredClone(before);
    const { rng } = scriptedRng([true, true]);

    resolveTransition(before, inputFor("home", average(), average()), rng);

    expect(before).toEqual(copy);
  });

  it("logs a blocked shot when the block roll succeeds", () => {
    expect(ofType(shoot([false, true, false]).events, "shot")[0]?.outcome).toBe("blocked");
  });

  it("logs a saved shot when it is not blocked and the save roll succeeds", () => {
    expect(ofType(shoot([false, false, true, false]).events, "shot")[0]?.outcome).toBe("saved");
  });

  it("logs a missed shot when it is neither blocked nor saved", () => {
    expect(ofType(shoot([false, false, false]).events, "shot")[0]?.outcome).toBe("missed");
  });

  it("gives the defending side a goal-kick style turnover after a miss", () => {
    const { state, events } = shoot([false, false, false], [0.5]);

    expect(events.map((e) => e.type)).toEqual(["shot", "turnover"]);
    expect(state.possession).toBe("away");
    expect(state.ball.x).toBeCloseTo(xAtProgress("away", 0.08));
    expect(state.ball.y).toBeCloseTo(0.5);
    expect(ofType(events, "turnover")[0]?.team).toBe("away");
  });

  it("spreads the restart position across the width of the pitch", () => {
    const left = shoot([false, false, false], [0]).state.ball.y;
    const right = shoot([false, false, false], [1]).state.ball.y;

    expect(left).toBeCloseTo(0.3);
    expect(right).toBeCloseTo(0.7);
  });

  it("awards a corner after a saved shot and keeps possession", () => {
    const { state, events } = shoot([false, false, true, true, true]);

    const corner = ofType(events, "corner")[0];
    expect(events.map((e) => e.type)).toEqual(["shot", "corner"]);
    expect(corner).toMatchObject({ team: "home", intensity: 0.45 });
    expect(corner?.position.x).toBeCloseTo(0.985);
    expect(corner?.position.y).toBe(0.03);
    expect(state.possession).toBe("home");
    expect(state.ball).toEqual(corner?.position);
  });

  it("awards a corner after a blocked shot, on the other flank when the flank roll fails", () => {
    const { events } = shoot([false, true, true, false]);

    expect(ofType(events, "corner")[0]?.position.y).toBe(0.97);
  });

  it("puts the away side's corner at its own attacking corner", () => {
    const { events } = shoot([false, true, true, true], [], "away");

    expect(ofType(events, "corner")[0]?.position.x).toBeCloseTo(xAtProgress("away", 0.985));
  });

  it("never awards a corner after a miss", () => {
    const { events } = shoot([false, false, false, true]);

    expect(ofType(events, "corner")).toHaveLength(0);
  });

  it("makes better finishing raise the goal chance and better goalkeeping lower it", () => {
    const base = shotChance(1, average(), average());
    const finisher = shotChance(1, aTeamProfile().withFinishing(0.9).build(), average());
    const keeper = shotChance(1, average(), aTeamProfile().withGoalkeeping(0.9).build());

    expect(finisher).toBeGreaterThan(base);
    expect(keeper).toBeLessThan(base);
  });

  it("makes a good chance more likely to score than a poor one", () => {
    const asked = (y: number, progress: number) => {
      const { rng, asked } = scriptedRng([true]);
      resolveTransition(stateAt("home", progress, y), inputFor("home", average(), average()), rng);
      return asked[1] as number;
    };

    expect(asked(0.5, 0.97)).toBeGreaterThan(asked(0.1, 0.8));
  });

  it("keeps the goal chance a fraction of the xG, never above 1", () => {
    const p = shotChance(1, strong(aTeamProfile()), weak(aTeamProfile()));
    const xg = shotXg(0.9, 0.5);

    expect(p).toBeGreaterThan(xg * 0.5);
    expect(p).toBeLessThanOrEqual(1);
  });

  it("makes better defending raise the block chance within a small range", () => {
    const low = shotChance(2, average(), aTeamProfile().withDefending(0).build());
    const high = shotChance(2, average(), aTeamProfile().withDefending(1).build());

    expect(low).toBeCloseTo(0.1);
    expect(high).toBeCloseTo(0.2);
  });

  it("asks about the save chance only for unblocked shots", () => {
    const { rng, asked } = scriptedRng([true, false, true, false]);
    resolveTransition(stateAt("home", 0.9), inputFor("home", average(), average()), rng);

    // shoot, goal, block, corner-after-block (no save roll for a blocked shot)
    expect(asked).toHaveLength(4);
  });
});

describe("resolveTransition: building up", () => {
  const build = (
    answers: boolean[],
    numbers: number[] = [],
    side: Side = "home",
    progress = 0.3,
    y = 0.5,
  ) => {
    const { rng } = scriptedRng(answers, numbers);
    return resolveTransition(stateAt(side, progress, y), inputFor(side, average(), average()), rng);
  };

  it("advances the ball towards goal and logs a progress event when the advance roll succeeds", () => {
    const { state, events } = build([true], [0, 0.5]);

    expect(events.map((e) => e.type)).toEqual(["progress"]);
    expect(state.possession).toBe("home");
    expect(progressOf("home", state.ball.x)).toBeCloseTo(0.35);
    expect(state.ball.y).toBeCloseTo(0.5);
    expect(events[0]).toMatchObject({ team: "home", time: 100, position: state.ball });
  });

  it("advances by up to 0.19 per step", () => {
    const { state } = build([true], [1, 0.5]);

    expect(progressOf("home", state.ball.x)).toBeCloseTo(0.49);
  });

  it("never advances beyond 0.97", () => {
    const { state } = build([false, true], [1, 0.5], "home", 0.95);

    expect(progressOf("home", state.ball.x)).toBeCloseTo(0.97);
  });

  it("advances the away side towards the home goal", () => {
    const { state } = build([true], [0, 0.5], "away");

    expect(state.ball.x).toBeCloseTo(1 - 0.35);
  });

  it("drifts sideways while advancing but stays on the pitch", () => {
    expect(build([true], [0, 1], "home", 0.3, 0.5).state.ball.y).toBeCloseTo(0.675);
    expect(build([true], [0, 0], "home", 0.3, 0.5).state.ball.y).toBeCloseTo(0.325);
    expect(build([true], [0, 1], "home", 0.3, 0.9).state.ball.y).toBe(0.94);
    expect(build([true], [0, 0], "home", 0.3, 0.1).state.ball.y).toBe(0.06);
  });

  it("makes progress events stronger the closer to goal they happen", () => {
    const early = build([true], [0, 0.5], "home", 0.2).events[0]?.intensity ?? 0;
    const late = build([true], [0, 0.5], "home", 0.8).events[0]?.intensity ?? 0;

    expect(early).toBeGreaterThanOrEqual(0.18);
    expect(late).toBeGreaterThan(early);
    expect(late).toBeLessThanOrEqual(1);
  });

  it("raises the danger as the attack gets closer to goal", () => {
    const farther = build([true], [0, 0.5], "home", 0.5).state.danger; // progress 0.55
    const nearer = build([false, true], [1, 0.5], "home", 0.78).state.danger; // progress 0.97

    expect(nearer).toBeGreaterThan(farther);
    expect(nearer).toBeLessThanOrEqual(1);
  });

  it("has no danger while the attack is still in its own half", () => {
    const { state } = build([true], [0, 0.5], "home", 0.1); // progress 0.15

    expect(state.danger).toBe(0);
  });

  it("has no danger for the side that wins the ball in its own half", () => {
    // Home lose the ball at x=0.8, which is progress 0.2 for away.
    const { state } = build([false, false], [], "home", 0.8);

    expect(state.possession).toBe("away");
    expect(state.danger).toBe(0);
  });

  it("moves the ball sideways and keeps possession on a lateral pass", () => {
    const { state, events } = build([false, true], [1]);

    expect(events.map((e) => e.type)).toEqual(["lateral"]);
    expect(events[0]?.intensity).toBe(0.1);
    expect(state.possession).toBe("home");
    expect(state.ball.x).toBe(0.3);
    expect(state.ball.y).toBeCloseTo(0.75);
  });

  it("keeps lateral passes on the pitch", () => {
    expect(build([false, true], [1], "home", 0.3, 0.9).state.ball.y).toBe(0.94);
    expect(build([false, true], [0], "home", 0.3, 0.1).state.ball.y).toBe(0.06);
  });

  it("turns the ball over where it was lost", () => {
    const { state, events } = build([false, false]);

    expect(events.map((e) => e.type)).toEqual(["turnover"]);
    expect(events[0]).toMatchObject({ team: "away", intensity: 0.2, position: { x: 0.3, y: 0.5 } });
    expect(state.possession).toBe("away");
    expect(state.ball).toEqual({ x: 0.3, y: 0.5 });
  });

  it("sets the danger for the side that wins the ball", () => {
    // Away win the ball at x=0.3, which is progress 0.7 for them.
    const { state } = build([false, false]);

    expect(state.danger).toBeCloseTo(((0.7 - 0.5) / 0.5) ** 2);
  });

  it("makes better build-up and progression raise the advance chance", () => {
    const s = stateAt("home", 0.3);
    const base = firstChance(s, average(), average());

    expect(firstChance(s, aTeamProfile().withBuildUp(0.9).build(), average())).toBeGreaterThan(
      base,
    );
    expect(firstChance(s, aTeamProfile().withProgression(0.9).build(), average())).toBeGreaterThan(
      base,
    );
  });

  it("weighs build-up and progression equally", () => {
    const s = stateAt("home", 0.3);

    expect(firstChance(s, aTeamProfile().withBuildUp(0.9).build(), average())).toBeCloseTo(
      firstChance(s, aTeamProfile().withProgression(0.9).build(), average()),
    );
  });

  it("makes better pressing by the defence lower the advance chance", () => {
    const s = stateAt("home", 0.3);

    expect(firstChance(s, average(), aTeamProfile().withPressing(0.9).build())).toBeLessThan(
      firstChance(s, average(), average()),
    );
  });

  it("makes advancing harder the closer the ball is to goal", () => {
    expect(firstChance(stateAt("home", 0.6), average(), average())).toBeLessThan(
      firstChance(stateAt("home", 0.2), average(), average()),
    );
  });

  it("keeps the advance chance between 5% and 95% whatever the ratings", () => {
    const s = stateAt("home", 0.3);

    const none = aTeamProfile().withAllRatings(0).build();
    const all = aTeamProfile().withAllRatings(1).build();

    expect(firstChance(s, none, all)).toBeCloseTo(0.05);
    expect(firstChance(s, all, none)).toBeCloseTo(0.95);
  });

  it("lets a modest rating edge shift the advance chance only modestly", () => {
    const s = stateAt("home", 0.3);
    const edge = firstChance(
      s,
      aTeamProfile().withBuildUp(0.6).withProgression(0.6).build(),
      average(),
    );

    expect(edge - firstChance(s, average(), average())).toBeLessThan(0.15);
  });

  it("gives average teams a decent but not certain advance chance", () => {
    const p = firstChance(stateAt("home", 0.3), average(), average());

    expect(p).toBeGreaterThan(0.4);
    expect(p).toBeLessThan(0.8);
  });

  it("only asks about a lateral pass after the advance roll fails", () => {
    const { rng, asked } = scriptedRng([true]);
    resolveTransition(stateAt("home", 0.3), inputFor("home", average(), average()), rng);

    expect(asked).toHaveLength(1);
  });

  it("makes a lateral pass a minority outcome", () => {
    const { rng, asked } = scriptedRng([false, false]);
    resolveTransition(stateAt("home", 0.3), inputFor("home", average(), average()), rng);

    expect(asked[1]).toBeGreaterThan(0);
    expect(asked[1]).toBeLessThan(0.5);
  });
});
