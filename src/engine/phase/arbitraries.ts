import * as fc from "fast-check";
import { PITCH_LENGTH, PITCH_WIDTH } from "../action/pitch-metres";
import type { Side } from "../match-state";
import type { Chance, ChanceAftermath, ChanceKind, ChanceResult, ChanceSituation } from "./chance";
import type { ChainLink, LostHow, PhaseStart, PhaseStep } from "./phase-step";

/** Test support: random sequences of valid phase steps for property tests. */

const arbPoint = fc.record({
  x: fc.double({ min: 0, max: PITCH_LENGTH, noNaN: true }),
  y: fc.double({ min: 0, max: PITCH_WIDTH, noNaN: true }),
});

type Outcome = "chance" | "lost" | "foul" | "outOfPlay";

/** Everything random about one step; the run's fold turns it into a step that fits its predecessor. */
const arbDraft = fc.record({
  links: fc.array(fc.tuple(fc.integer({ min: 2, max: 11 }), arbPoint), {
    minLength: 2,
    maxLength: 6,
  }),
  outcome: fc.constantFrom<Outcome>(
    "chance",
    "chance",
    "lost",
    "lost",
    "lost",
    "foul",
    "outOfPlay",
  ),
  how: fc.constantFrom<LostHow>("tackle", "interception", "badPass"),
  restart: fc.constantFrom<PhaseStart>("goalKick", "throwIn", "corner", "freeKick"),
  sameSide: fc.boolean(),
  duration: fc.double({ min: 10, max: 25, noNaN: true }),
  gap: fc.double({ min: 0, max: 8, noNaN: true }),
  penalty: fc.boolean(),
  kind: fc.constantFrom<ChanceKind>(
    "openPlay",
    "throughBall",
    "cross",
    "cutBack",
    "counter",
    "setPiece",
  ),
  situation: fc.constantFrom<ChanceSituation>("oneOnOne", "header", "edge", "box", "volley"),
  xg: fc.double({ min: 0.01, max: 0.9, noNaN: true }),
  result: fc.constantFrom<ChanceResult>("goal", "saved", "woodwork", "blocked", "wide", "over"),
  aftermath: fc.constantFrom<ChanceAftermath>("rebound", "corner", "goalKick", "kickoff"),
  shotFrom: arbPoint,
});

type Draft = typeof arbDraft extends fc.Arbitrary<infer T> ? T : never;

const oneDecimal = (value: number): number => Math.round(value * 10) / 10;
const idOf = (team: Side, n: number): string => `${team === "home" ? "h" : "a"}${n}`;
const otherSide = (team: Side): Side => (team === "home" ? "away" : "home");

const chainOf = (team: Side, draft: Draft): PhaseStep["chain"] =>
  draft.links.map(
    ([n, at]): ChainLink => ({ player: idOf(team, n), at }),
  ) as unknown as PhaseStep["chain"];

const chanceOf = (team: Side, chain: PhaseStep["chain"], draft: Draft): Chance => ({
  kind: draft.kind,
  creator: (chain[chain.length - 2] as ChainLink).player,
  shooter: (chain[chain.length - 1] as ChainLink).player,
  situation: draft.situation,
  xg: draft.xg,
  result: draft.result,
  keeper: idOf(otherSide(team), 1),
  aftermath: draft.aftermath,
  from: draft.shotFrom,
});

type Ending = Pick<PhaseStep, "outcome"> & Record<string, unknown>;

const endingOf = (team: Side, chain: PhaseStep["chain"], draft: Draft): Ending => {
  const challenger = idOf(otherSide(team), 3);
  switch (draft.outcome) {
    case "chance":
      return { outcome: "chance", chance: chanceOf(team, chain, draft) };
    case "lost":
      return { outcome: "lost", how: draft.how, challenger };
    case "foul":
      return { outcome: "foul", offender: challenger, penalty: draft.penalty };
    case "outOfPlay":
      return { outcome: "outOfPlay" };
  }
};

/** How the next possession begins after `previous` ended the way it did. */
const startAfter = (previous: PhaseStep | undefined, draft: Draft): PhaseStart => {
  if (!previous) return "kickoff";
  if (previous.outcome === "lost") return previous.how === "tackle" ? "tackle" : "interception";
  if (previous.outcome === "foul") return previous.penalty ? "penalty" : "freeKick";
  return draft.restart;
};

const nextTeam = (previous: PhaseStep | undefined, draft: Draft): Side => {
  if (!previous) return "home";
  if (previous.outcome === "lost") return otherSide(previous.team);
  return draft.sameSide ? previous.team : otherSide(previous.team);
};

const stepAfter = (previous: PhaseStep | undefined, draft: Draft): PhaseStep => {
  const team = nextTeam(previous, draft);
  const chain = chainOf(team, draft);
  const startTime = oneDecimal((previous?.endTime ?? 0) + draft.gap);
  return {
    team,
    period: "firstHalf",
    startTime,
    endTime: oneDecimal(startTime + draft.duration),
    start: startAfter(previous, draft),
    chain,
    ...endingOf(team, chain, draft),
  } as PhaseStep;
};

const run = (drafts: readonly Draft[], whistle: boolean): PhaseStep[] => {
  const steps: PhaseStep[] = [];
  for (const draft of drafts) steps.push(stepAfter(steps.at(-1), draft));
  const last = steps.at(-1) as PhaseStep;
  return whistle ? [...steps.slice(0, -1), { ...last, outcome: "periodEnd" } as PhaseStep] : steps;
};

/**
 * A run of 1 to 12 consecutive steps in the first half. After a lost ball the other side has it, the
 * start of each step follows how the previous one ended, and the run may end with the whistle.
 */
export const arbSteps: fc.Arbitrary<PhaseStep[]> = fc
  .tuple(fc.array(arbDraft, { minLength: 1, maxLength: 12 }), fc.boolean())
  .map(([drafts, whistle]) => run(drafts, whistle));
