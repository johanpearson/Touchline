import {
  type ActionEvent,
  type ChanceResult,
  chancesOf,
  createActionMatch,
  createMatch,
  type StepChance,
} from "../../../engine";
import { anActionMatchSetup } from "../action-match-fixture";

type Base = { time: number; team?: "home" | "away"; x?: number; y?: number };

const at = (b: Base) => {
  const point = { x: b.x ?? 52.5, y: b.y ?? 34 };
  return {
    time: b.time,
    period: "firstHalf" as const,
    team: b.team ?? ("home" as const),
    from: point,
    to: point,
    pressure: 0,
    actor: "a",
  };
};

export const aPass = (b: Base): ActionEvent => ({
  ...at(b),
  type: "pass",
  variant: "short",
  outcome: "complete",
  target: "b",
});
export const aCarry = (b: Base): ActionEvent => ({
  ...at(b),
  type: "carry",
  outcome: "kept",
});
export const aShot = (b: Base & { outcome?: "goal" | "saved"; xg?: number }): ActionEvent => ({
  ...at(b),
  type: "shot",
  outcome: b.outcome ?? "saved",
  xg: b.xg ?? 0.1,
});
export const aSetPiece = (
  b: Base & { variant: "corner" | "freeKick" | "penalty" | "throwIn" | "kickoff" },
): ActionEvent => ({ ...at(b), type: "setPiece", variant: b.variant, outcome: "taken" });
export const aFoul = (b: Base & { outcome?: "freeKick" | "penalty" }): ActionEvent => ({
  ...at(b),
  type: "foul",
  outcome: b.outcome ?? "freeKick",
});
export const aPeriodChange = (time: number, period: "halfTime" | "fullTime"): ActionEvent => ({
  type: "periodChange",
  time,
  period,
  team: "home",
  from: { x: 52.5, y: 34 },
  to: { x: 52.5, y: 34 },
  pressure: 0,
});

/** A quiet midfield run of `count` passes, one every `step` match seconds from `start`. */
export const quietRun = (count: number, start = 0, step = 3): ActionEvent[] =>
  Array.from({ length: count }, (_, i) => aPass({ time: start + i * step }));

const cache = new Map<number, readonly ActionEvent[]>();

/** The full log (both halves) of a seeded match, played once per worker. */
export const seededMatchEvents = (seed: number): readonly ActionEvent[] => {
  const cached = cache.get(seed);
  if (cached) return cached;
  const { setup } = anActionMatchSetup(seed);
  const match = createActionMatch(setup.input, setup.seed, { detail: "fast" });
  match.advanceTo(1_000_000);
  match.resume();
  match.advanceTo(1_000_000);
  cache.set(seed, match.events);
  return match.events;
};

export const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

/** A chance with its result, at the match `time` of its shot; `clear` follows `xg`. */
export const aChance = (b: {
  time: number;
  result: ChanceResult;
  xg?: number;
  team?: "home" | "away";
}): StepChance => {
  const xg = b.xg ?? 0.4;
  return {
    kind: "throughBall",
    creator: "a",
    shooter: "b",
    situation: "box",
    xg,
    result: b.result,
    keeper: "k",
    aftermath: "goalKick",
    from: { x: 52.5, y: 34 },
    team: b.team ?? "home",
    period: "firstHalf",
    time: b.time,
    step: 0,
    clear: xg >= 0.25,
  };
};

const v3Cache = new Map<
  number,
  { events: readonly ActionEvent[]; chances: readonly StepChance[] }
>();

/** The full log and the chances of a seeded engine v3 match, played once per worker. */
export const seededV3Match = (seed: number) => {
  const cached = v3Cache.get(seed);
  if (cached) return cached;
  const { setup } = anActionMatchSetup(seed);
  const match = createMatch({ ...setup.input, engineVersion: 3 }, setup.seed, { detail: "fast" });
  match.advanceTo(1_000_000);
  match.resume();
  match.advanceTo(1_000_000);
  const played = { events: match.events, chances: chancesOf(match.steps) };
  v3Cache.set(seed, played);
  return played;
};
