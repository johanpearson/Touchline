import type { Chance } from "./chance";
import type { ChainLink, PhaseStep } from "./phase-step";

type ChanceBuilder = {
  withResult: (result: Chance["result"]) => ChanceBuilder;
  withKind: (kind: Chance["kind"]) => ChanceBuilder;
  withXg: (xg: number) => ChanceBuilder;
  withAftermath: (aftermath: Chance["aftermath"]) => ChanceBuilder;
  build: () => Chance;
};

const chanceBuilder = (chance: Chance): ChanceBuilder => ({
  withResult: (result) => chanceBuilder({ ...chance, result }),
  withKind: (kind) => chanceBuilder({ ...chance, kind }),
  withXg: (xg) => chanceBuilder({ ...chance, xg }),
  withAftermath: (aftermath) => chanceBuilder({ ...chance, aftermath }),
  build: () => ({ ...chance, from: { ...chance.from } }),
});

/** Test builder for `Chance`: an open-play box chance by `h3` created by `h2`, saved by `a1`. */
export const aChance = (): ChanceBuilder =>
  chanceBuilder({
    kind: "openPlay",
    creator: "h2",
    shooter: "h3",
    situation: "box",
    xg: 0.2,
    result: "saved",
    keeper: "a1",
    aftermath: "corner",
    from: { x: 92, y: 34 },
  });

const DEFAULT_CHAIN: readonly [ChainLink, ...ChainLink[]] = [
  { player: "h1", at: { x: 30, y: 34 } },
  { player: "h2", at: { x: 55, y: 30 } },
  { player: "h3", at: { x: 85, y: 36 } },
];

type StepBuilder = {
  forTeam: (team: PhaseStep["team"]) => StepBuilder;
  during: (period: PhaseStep["period"]) => StepBuilder;
  between: (startTime: number, endTime: number) => StepBuilder;
  startingWith: (start: PhaseStep["start"]) => StepBuilder;
  withChain: (chain: readonly [ChainLink, ...ChainLink[]]) => StepBuilder;
  endingInChance: (chance?: Chance) => StepBuilder;
  endingLost: (how?: "tackle" | "interception" | "badPass", challenger?: string) => StepBuilder;
  endingInFoul: (offender?: string, penalty?: boolean) => StepBuilder;
  endingOutOfPlay: () => StepBuilder;
  endingAtPeriodEnd: () => StepBuilder;
  build: () => PhaseStep;
};

const stepBuilder = (step: PhaseStep): StepBuilder => ({
  forTeam: (team) => stepBuilder({ ...step, team }),
  during: (period) => stepBuilder({ ...step, period }),
  between: (startTime, endTime) => stepBuilder({ ...step, startTime, endTime }),
  startingWith: (start) => stepBuilder({ ...step, start }),
  withChain: (chain) => stepBuilder({ ...step, chain }),
  endingInChance: (chance = aChance().build()) =>
    stepBuilder({ ...base(step), outcome: "chance", chance }),
  endingLost: (how = "tackle", challenger = "a2") =>
    stepBuilder({ ...base(step), outcome: "lost", how, challenger }),
  endingInFoul: (offender = "a2", penalty = false) =>
    stepBuilder({ ...base(step), outcome: "foul", offender, penalty }),
  endingOutOfPlay: () => stepBuilder({ ...base(step), outcome: "outOfPlay" }),
  endingAtPeriodEnd: () => stepBuilder({ ...base(step), outcome: "periodEnd" }),
  build: () => step,
});

const base = (step: PhaseStep) => ({
  team: step.team,
  period: step.period,
  startTime: step.startTime,
  endTime: step.endTime,
  start: step.start,
  chain: step.chain,
});

/** Test builder for `PhaseStep`: a home kick-off possession of three players that loses the ball to a tackle. */
export const aStep = (): StepBuilder =>
  stepBuilder({
    team: "home",
    period: "firstHalf",
    startTime: 0,
    endTime: 15,
    start: "kickoff",
    chain: DEFAULT_CHAIN,
    outcome: "lost",
    how: "tackle",
    challenger: "a2",
  });
