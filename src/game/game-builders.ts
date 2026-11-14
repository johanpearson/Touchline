import type { Club } from "./club";
import type { Formation } from "./formation";
import type { Lineup } from "./lineup";
import { ATTRIBUTE_NAMES, type AttributeName, type Player } from "./player";
import { initialCondition, type PlayerCondition } from "./player-condition";
import type { PlayerPosition } from "./squad-player";

type PlayerBuilder = {
  withId: (value: string) => PlayerBuilder;
  withName: (value: string) => PlayerBuilder;
  withAge: (value: number) => PlayerBuilder;
  withPosition: (value: PlayerPosition) => PlayerBuilder;
  withPassing: (value: number) => PlayerBuilder;
  withBallControl: (value: number) => PlayerBuilder;
  withDribbling: (value: number) => PlayerBuilder;
  withPace: (value: number) => PlayerBuilder;
  withVision: (value: number) => PlayerBuilder;
  withFinishing: (value: number) => PlayerBuilder;
  withWorkRate: (value: number) => PlayerBuilder;
  withTackling: (value: number) => PlayerBuilder;
  withPositioning: (value: number) => PlayerBuilder;
  withStrength: (value: number) => PlayerBuilder;
  withHandling: (value: number) => PlayerBuilder;
  withReflexes: (value: number) => PlayerBuilder;
  /** Sets all twelve attributes at once. */
  withAllAttributes: (value: number) => PlayerBuilder;
  build: () => Player;
};

const defaultPlayer = (): Player => ({
  id: "p1",
  name: "Player",
  age: 25,
  position: "MID",
  passing: 10,
  ballControl: 10,
  dribbling: 10,
  pace: 10,
  vision: 10,
  finishing: 10,
  workRate: 10,
  tackling: 10,
  positioning: 10,
  strength: 10,
  handling: 10,
  reflexes: 10,
});

const playerBuilder = (player: Player): PlayerBuilder => {
  const with_ = (changes: Partial<Player>): PlayerBuilder =>
    playerBuilder({ ...player, ...changes });
  return {
    withId: (id) => with_({ id }),
    withName: (name) => with_({ name }),
    withAge: (age) => with_({ age }),
    withPosition: (position) => with_({ position }),
    withPassing: (passing) => with_({ passing }),
    withBallControl: (ballControl) => with_({ ballControl }),
    withDribbling: (dribbling) => with_({ dribbling }),
    withPace: (pace) => with_({ pace }),
    withVision: (vision) => with_({ vision }),
    withFinishing: (finishing) => with_({ finishing }),
    withWorkRate: (workRate) => with_({ workRate }),
    withTackling: (tackling) => with_({ tackling }),
    withPositioning: (positioning) => with_({ positioning }),
    withStrength: (strength) => with_({ strength }),
    withHandling: (handling) => with_({ handling }),
    withReflexes: (reflexes) => with_({ reflexes }),
    withAllAttributes: (value) =>
      with_(Object.fromEntries(ATTRIBUTE_NAMES.map((n: AttributeName) => [n, value]))),
    build: () => ({ ...player }),
  };
};

export const aPlayer = (): PlayerBuilder => playerBuilder(defaultPlayer());

type ClubBuilder = {
  withId: (value: string) => ClubBuilder;
  withName: (value: string) => ClubBuilder;
  withShortName: (value: string) => ClubBuilder;
  withColours: (primary: string, secondary: string) => ClubBuilder;
  withPlayerIds: (value: readonly string[]) => ClubBuilder;
  build: () => Club;
};

const clubBuilder = (club: Club): ClubBuilder => {
  const with_ = (changes: Partial<Club>): ClubBuilder => clubBuilder({ ...club, ...changes });
  return {
    withId: (id) => with_({ id }),
    withName: (name) => with_({ name }),
    withShortName: (shortName) => with_({ shortName }),
    withColours: (primary, secondary) => with_({ colours: { primary, secondary } }),
    withPlayerIds: (ids) => with_({ playerIds: [...ids] }),
    build: () => ({ ...club, colours: { ...club.colours }, playerIds: [...club.playerIds] }),
  };
};

export const aClub = (): ClubBuilder =>
  clubBuilder({
    id: "c1",
    name: "Test FC",
    shortName: "TFC",
    colours: { primary: "#d62828", secondary: "#ffffff" },
    playerIds: [],
  });

const FULL_SQUAD_SHAPE: [PlayerPosition, number][] = [
  ["GK", 3],
  ["DEF", 7],
  ["MID", 7],
  ["FWD", 5],
];

/** A full 22-player squad (3 GK, 7 DEF, 7 MID, 5 FWD), ids `<prefix>-<POS>-<index>`. */
export const aFullSquad = (attributeValue = 10, idPrefix = "p"): Player[] =>
  FULL_SQUAD_SHAPE.flatMap(([position, count]) =>
    Array.from({ length: count }, (_, i) =>
      aPlayer()
        .withId(`${idPrefix}-${position}-${i}`)
        .withName(`${position} ${i}`)
        .withPosition(position)
        .withAllAttributes(attributeValue)
        .build(),
    ),
  );

/** A 4-4-2 squad (one extra of each outfield position for depth) with the given attribute value. */
export const aSquad = (attributeValue = 10, idPrefix = "p"): Player[] => {
  const shape: [PlayerPosition, number][] = [
    ["GK", 2],
    ["DEF", 5],
    ["MID", 5],
    ["FWD", 3],
  ];
  return shape.flatMap(([position, count]) =>
    Array.from({ length: count }, (_, i) =>
      aPlayer()
        .withId(`${idPrefix}-${position}-${i}`)
        .withName(`${position} ${i}`)
        .withPosition(position)
        .withAllAttributes(attributeValue)
        .build(),
    ),
  );
};

type ConditionBuilder = {
  withFitness: (value: number) => ConditionBuilder;
  withForm: (value: number) => ConditionBuilder;
  build: () => PlayerCondition;
};

const conditionBuilder = (condition: PlayerCondition): ConditionBuilder => ({
  withFitness: (fitness) => conditionBuilder({ ...condition, fitness }),
  withForm: (form) => conditionBuilder({ ...condition, form }),
  build: () => ({ ...condition }),
});

/** A neutral condition (fitness 100, form 5) unless overridden. */
export const aCondition = (): ConditionBuilder => conditionBuilder(initialCondition());

type LineupBuilder = {
  withFormation: (value: Formation) => LineupBuilder;
  withStarters: (value: readonly string[]) => LineupBuilder;
  withBench: (value: readonly string[]) => LineupBuilder;
  build: () => Lineup;
};

const lineupBuilder = (lineup: Lineup): LineupBuilder => ({
  withFormation: (formation) => lineupBuilder({ ...lineup, formation }),
  withStarters: (starters) => lineupBuilder({ ...lineup, starters: [...starters] }),
  withBench: (bench) => lineupBuilder({ ...lineup, bench: [...bench] }),
  build: () => ({ ...lineup, starters: [...lineup.starters], bench: [...lineup.bench] }),
});

/** A valid 4-4-2 lineup over `aFullSquad()` (ids prefixed `p`) unless overridden. */
export const aLineup = (): LineupBuilder =>
  lineupBuilder({
    formation: "4-4-2",
    starters: [
      "p-GK-0",
      ...[0, 1, 2, 3].map((i) => `p-DEF-${i}`),
      ...[0, 1, 2, 3].map((i) => `p-MID-${i}`),
      "p-FWD-0",
      "p-FWD-1",
    ],
    bench: ["p-GK-1", "p-DEF-4", "p-DEF-5", "p-MID-4", "p-MID-5", "p-FWD-2", "p-FWD-3"],
  });
