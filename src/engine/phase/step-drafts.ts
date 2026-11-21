import type { PassVariant } from "../action/action-event";
import { PITCH_LENGTH, PITCH_WIDTH, type Point } from "../action/pitch-metres";
import type { Period, Side } from "../match-state";
import { clamp } from "../pitch";
import type { Rng } from "../rng";
import type { Chance } from "./chance";
import type { DraftEvent } from "./draft-event";
import type { PhaseStep } from "./phase-step";

/** A possession shorter than this many actions would be merged into a neighbour by `toPhases`. */
export const MIN_STEP_ACTIONS = 3;
/** Chance of a short carry by a receiver before he passes on. */
const CARRY_CHANCE = 0.25;
const LONG_PASS_METRES = 30;
const GOAL_HALF_WIDTH = 3.66;
const CENTRE: Point = { x: PITCH_LENGTH / 2, y: PITCH_WIDTH / 2 };

const RESTARTS = ["kickoff", "goalKick", "throwIn", "corner", "freeKick", "penalty"] as const;
type Restart = (typeof RESTARTS)[number];
const isRestart = (start: PhaseStep["start"]): start is Restart =>
  (RESTARTS as readonly string[]).includes(start);

const distance = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

const onPitch = (point: Point): Point => ({
  x: clamp(point.x, 0, PITCH_LENGTH),
  y: clamp(point.y, 0, PITCH_WIDTH),
});

const forward = (team: Side, from: Point, metres: number): Point =>
  onPitch({ x: from.x + (team === "home" ? metres : -metres), y: from.y });

const passVariant = (chance: Chance | undefined, last: boolean, length: number): PassVariant => {
  if (chance && last && chance.kind === "cross") return "cross";
  if (chance && last && chance.kind === "throughBall") return "through";
  return length > LONG_PASS_METRES ? "long" : "short";
};

const passes = (step: PhaseStep, rng: Rng): DraftEvent[] =>
  step.chain.slice(0, -1).flatMap((link, i): DraftEvent[] => {
    const next = step.chain[i + 1] as PhaseStep["chain"][number];
    const chance = step.outcome === "chance" ? step.chance : undefined;
    const pass: DraftEvent = {
      type: "pass",
      team: step.team,
      period: step.period,
      actor: link.player,
      target: next.player,
      from: link.at,
      to: next.at,
      variant: passVariant(chance, i === step.chain.length - 2, distance(link.at, next.at)),
      outcome: "complete",
    };
    return rng.chance(CARRY_CHANCE) && i < step.chain.length - 2
      ? [pass, carryBy(step, next.player, next.at, forward(step.team, next.at, 3 + rng.next() * 5))]
      : [pass];
  });

const carryBy = (step: PhaseStep, actor: string, from: Point, to: Point): DraftEvent => ({
  type: "carry",
  team: step.team,
  period: step.period,
  actor,
  from,
  to,
  outcome: "kept",
});

const restart = (step: PhaseStep): DraftEvent[] => {
  if (!isRestart(step.start)) return [];
  const taker = step.chain[0];
  return [
    {
      type: "setPiece",
      team: step.team,
      period: step.period,
      actor: taker.player,
      from: taker.at,
      to: taker.at,
      variant: step.start,
      outcome: "taken",
    },
  ];
};

const SHOT_OUTCOME = {
  goal: "goal",
  saved: "saved",
  woodwork: "woodwork",
  blocked: "blocked",
  wide: "missed",
  over: "missed",
} as const;

const shot = (step: PhaseStep & { outcome: "chance" }, rng: Rng): DraftEvent => {
  const goalX = step.team === "home" ? PITCH_LENGTH : 0;
  const { chance } = step;
  return {
    type: "shot",
    team: step.team,
    period: step.period,
    actor: (step.chain.at(-1) as PhaseStep["chain"][number]).player,
    opponent: chance.keeper,
    from: chance.from,
    to: { x: goalX, y: CENTRE.y + (rng.next() * 2 - 1) * GOAL_HALF_WIDTH },
    outcome: SHOT_OUTCOME[chance.result],
    xg: chance.xg,
  };
};

const NEXT_PERIOD: Record<Period, Period> = {
  firstHalf: "halfTime",
  halfTime: "fullTime",
  secondHalf: "fullTime",
  fullTime: "fullTime",
};

const lastLink = (step: PhaseStep) => step.chain.at(-1) as PhaseStep["chain"][number];

const loss = (step: PhaseStep & { outcome: "lost" }, rng: Rng): DraftEvent => {
  const last = lastLink(step);
  if (step.how === "tackle") {
    return {
      ...carryBy(step, last.player, last.at, forward(step.team, last.at, 2)),
      outcome: "tackled",
      opponent: step.challenger,
    } as DraftEvent;
  }
  return {
    type: "pass",
    team: step.team,
    period: step.period,
    actor: last.player,
    target: step.chain[0].player,
    opponent: step.challenger,
    from: last.at,
    to: forward(step.team, last.at, 8 + rng.next() * 10),
    variant: "short",
    outcome: step.how === "interception" ? "intercepted" : "incomplete",
  };
};

const exit = (step: PhaseStep): DraftEvent => {
  const last = lastLink(step);
  const touchline: Point = { x: last.at.x, y: last.at.y < PITCH_WIDTH / 2 ? 0 : PITCH_WIDTH };
  return { ...carryBy(step, last.player, last.at, touchline), outcome: "outOfPlay" } as DraftEvent;
};

const foul = (step: PhaseStep & { outcome: "foul" }): DraftEvent => {
  const last = lastLink(step);
  return {
    type: "foul",
    team: step.team,
    period: step.period,
    actor: last.player,
    opponent: step.offender,
    from: last.at,
    to: last.at,
    outcome: step.penalty ? "penalty" : "freeKick",
  };
};

const whistle = (step: PhaseStep): DraftEvent => ({
  type: "periodChange",
  team: "home",
  period: NEXT_PERIOD[step.period],
  from: CENTRE,
  to: CENTRE,
});

const terminal = (step: PhaseStep, rng: Rng): DraftEvent => {
  switch (step.outcome) {
    case "chance":
      return shot(step, rng);
    case "lost":
      return loss(step, rng);
    case "foul":
      return foul(step);
    case "outOfPlay":
      return exit(step);
    case "periodEnd":
      return whistle(step);
  }
};

/** Actions before the closing one a step needs so `toPhases` keeps it as one phase. */
const missingBefore = (step: PhaseStep, present: number): number => {
  if (step.outcome === "chance") return 0;
  const closing = step.outcome === "periodEnd" ? 0 : 1;
  return Math.max(0, MIN_STEP_ACTIONS - closing - present);
};

const padding = (step: PhaseStep, count: number): DraftEvent[] => {
  const first = step.chain[0];
  return Array.from({ length: count }, () =>
    carryBy(step, first.player, first.at, forward(step.team, first.at, 4)),
  );
};

/** The action events of a step, in order and without time, pressure or snapshot. */
export const draftsOf = (step: PhaseStep, rng: Rng): DraftEvent[] => {
  const build = [...restart(step), ...passes(step, rng)];
  const padded = [...build, ...padding(step, missingBefore(step, build.length))];
  return [...padded, terminal(step, rng)];
};
