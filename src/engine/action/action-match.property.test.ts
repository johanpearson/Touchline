import * as fc from "fast-check";
import { describe, expect, it, vi } from "vitest";
import type { Side } from "../match-state";
import { type ActionEvent, SNAPSHOT_PLAYER_COUNT } from "./action-event";
import { arbMatchInputV2, arbSeed, propertyRuns } from "./arbitraries";
import { createActionMatch } from "./create-action-match";
import type { MatchInput } from "./match-input";
import { inPitch } from "./pitch-metres";

vi.setConfig({ testTimeout: 120_000 });

const FIRST_HALF_LIMIT = 10_000;
const MATCH_LIMIT = 20_000;
const EPSILON = 1e-6;
/** Properties that play whole matches or several matches per run use fewer runs by default. */
const WHOLE_MATCH_RUNS = 8;
/** All properties see the same random inputs, so a match is simulated once and shared. */
const DEFAULT_FC_SEED = 20_260_514;
const fcSeed = Number.parseInt(process.env.FC_SEED ?? "", 10) || DEFAULT_FC_SEED;

type Run = readonly [input: MatchInput, seed: number];

/** Fails with the shrunk counterexample and `seed`; rerun it with `FC_SEED=<seed>`. */
const forAll = <T>(arb: fc.Arbitrary<T>, check: (value: T) => boolean, defaultRuns = 25) =>
  fc.assert(fc.property(arb, check), { numRuns: propertyRuns(defaultRuns), seed: fcSeed });

const cache = new Map<string, ReturnType<typeof createActionMatch>>();
/**
 * Plays a match once per run and shares it between properties. Most properties only need the first
 * half (which also ends in a period change), so `wholeMatch` is opt-in: it also plays the second half.
 */
const playMatch = ([input, seed]: Run, detail: "full" | "fast" = "fast", wholeMatch = false) => {
  const key = `${detail}:${wholeMatch}:${seed}:${JSON.stringify(input)}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  const match = createActionMatch(input, seed, { detail });
  match.advanceTo(FIRST_HALF_LIMIT);
  if (wholeMatch) {
    match.resume();
    match.advanceTo(MATCH_LIMIT);
  }
  cache.set(key, match);
  return match;
};

const arbRun: fc.Arbitrary<Run> = fc.tuple(arbMatchInputV2, arbSeed);
const other = (side: Side): Side => (side === "home" ? "away" : "home");
const idsOf = (input: MatchInput, side: Side) =>
  new Set([...input[side].starters, ...input[side].bench].map((p) => p.id));
const withoutSnapshot = (event: ActionEvent) => {
  const { snapshot: _snapshot, ...rest } = event;
  return rest;
};
const consecutive = (events: readonly ActionEvent[]) =>
  events.slice(1).map((event, i) => [events[i] as ActionEvent, event] as const);

/** The side with the ball when `event` starts (a tackle is made against the ball carrier). */
const holderBefore = (event: ActionEvent): Side | undefined =>
  event.type === "periodChange"
    ? undefined
    : event.type === "tackle"
      ? other(event.team)
      : event.team;

/** The side that certainly has the ball after `event`; undefined where it depends on the resolution. */
const holderAfter = (event: ActionEvent): Side | undefined => {
  switch (event.type) {
    case "pass":
      return event.outcome === "complete" ? event.team : undefined;
    case "carry":
      return event.outcome === "kept" ? event.team : undefined;
    case "tackle":
      return event.outcome === "won"
        ? event.team
        : event.outcome === "lost"
          ? other(event.team)
          : undefined;
    case "setPiece":
      return event.team;
    case "foul":
      return event.team;
    case "shot":
      return event.outcome === "goal" ? other(event.team) : undefined;
    default:
      return undefined;
  }
};

describe("action engine properties", () => {
  it("keeps every event on the pitch", () => {
    forAll(arbRun, (run) => playMatch(run).events.every((e) => inPitch(e.from) && inPitch(e.to)));
  });

  it("follows an out-of-play outcome with its restart, or with the end of the half", () => {
    forAll(arbRun, (run) =>
      consecutive(playMatch(run).events).every(([event, next]) => {
        const outOfPlay = "outcome" in event && event.outcome === "outOfPlay";
        if (!outOfPlay) return true;
        return (
          next.type === "periodChange" || (next.type === "setPiece" && next.variant !== "kickoff")
        );
      }),
    );
  });

  it("gives every snapshot 22 players and the ball inside the pitch", () => {
    forAll(arbRun, (run) =>
      playMatch(run, "full").events.every(
        (e) =>
          e.snapshot !== undefined &&
          e.snapshot.players.length === SNAPSHOT_PLAYER_COUNT &&
          e.snapshot.players.every(inPitch) &&
          inPitch(e.snapshot.ball),
      ),
    );
  });

  it("never lets event times decrease", () => {
    forAll(arbRun, (run) => consecutive(playMatch(run).events).every(([a, b]) => b.time >= a.time));
  });

  it("spaces consecutive play actions 2 to 4 seconds apart", () => {
    // Documented bounds: a period change shares the time of the one before it (half-time to second
    // half) or comes up to 4 s after the last action, as the whistle can be sooner than 2 s after
    // it; the first action of a half shares the time of the period change that starts it.
    forAll(arbRun, (run) =>
      consecutive(playMatch(run).events).every(([previous, event]) => {
        const gap = event.time - previous.time;
        if (previous.type === "periodChange") return Math.abs(gap) < EPSILON;
        if (event.type === "periodChange") return gap > 0 && gap <= 4 + EPSILON;
        return gap >= 2 - EPSILON && gap <= 4 + EPSILON;
      }),
    );
  });

  it("gives the same log however time is split across advanceTo calls", () => {
    const arbSplits = fc.array(fc.integer({ min: 1, max: 3000 }), { maxLength: 12 });
    forAll(
      fc.tuple(arbRun, arbSplits),
      ([run, splits]) => {
        const [input, seed] = run;
        const whole = playMatch(run, "fast", true);
        const split = createActionMatch(input, seed, { detail: "fast" });
        let at = 0;
        for (const step of splits) {
          at += step;
          split.advanceTo(at);
        }
        split.advanceTo(FIRST_HALF_LIMIT);
        split.resume();
        for (const step of splits) {
          at += step;
          split.advanceTo(at);
        }
        split.advanceTo(MATCH_LIMIT);
        expect(split.events).toEqual(whole.events);
        expect(split.state).toEqual(whole.state);
        return true;
      },
      10,
    );
  });

  it("gives the same log in fast detail as in full detail, minus the snapshots", () => {
    forAll(
      arbRun,
      (run) => {
        const fast = playMatch(run, "fast", true);
        const full = playMatch(run, "full", true);
        expect(fast.events).toEqual(full.events.map(withoutSnapshot));
        expect(fast.state).toEqual(full.state);
        return true;
      },
      WHOLE_MATCH_RUNS,
    );
  });

  it("keeps the score equal to the number of goal events", () => {
    forAll(arbRun, (run) => {
      const match = playMatch(run);
      const goals = (side: Side) =>
        match.events.filter((e) => e.type === "shot" && e.outcome === "goal" && e.team === side)
          .length;
      return match.state.score.home === goals("home") && match.state.score.away === goals("away");
    });
  });

  it("changes possession only through events that change it", () => {
    forAll(arbRun, (run) =>
      consecutive(playMatch(run).events).every(([event, next]) => {
        const holder = holderAfter(event);
        const nextHolder = holderBefore(next);
        return holder === undefined || nextHolder === undefined || holder === nextHolder;
      }),
    );
  });

  it("lets only the side in possession shoot", () => {
    forAll(arbRun, (run) =>
      consecutive(playMatch(run).events).every(([event, next]) => {
        if (next.type !== "shot") return true;
        const holder = holderAfter(event);
        return holder === undefined || holder === next.team;
      }),
    );
  });

  it("never names a player of the wrong side", () => {
    forAll(arbRun, (run) => {
      const [input] = run;
      const home = idsOf(input, "home");
      const away = idsOf(input, "away");
      return playMatch(run).events.every((e) => {
        if (e.type === "periodChange") return true;
        const own = e.team === "home" ? home : away;
        const foe = e.team === "home" ? away : home;
        if (!own.has(e.actor)) return false;
        if (e.type === "pass" && !own.has(e.target)) return false;
        return e.opponent === undefined || foe.has(e.opponent);
      });
    });
  });

  it("does not depend on the order in which unrelated matches are played", () => {
    forAll(
      fc.tuple(arbRun, arbRun),
      ([first, second]) => {
        const alone = createActionMatch(first[0], first[1], { detail: "fast" });
        alone.advanceTo(FIRST_HALF_LIMIT);
        playMatch(second, "fast");
        const after = createActionMatch(first[0], first[1], { detail: "fast" });
        after.advanceTo(FIRST_HALF_LIMIT);
        expect(after.events).toEqual(alone.events);
        return true;
      },
      WHOLE_MATCH_RUNS,
    );
  });
});
