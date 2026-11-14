import { NEUTRAL_TACTICS } from "../tactics";
import {
  ENGINE_ATTRIBUTE_NAMES,
  type EngineAttributes,
  type EnginePlayer,
  type EnginePosition,
} from "./engine-player";
import type { MatchInputV2 } from "./match-input-v2";
import type { FormationCounts, TeamSheet } from "./team-sheet";

const averageAttributes = (): EngineAttributes =>
  Object.fromEntries(ENGINE_ATTRIBUTE_NAMES.map((name) => [name, 10])) as EngineAttributes;

type PlayerBuilder = {
  withId: (id: string) => PlayerBuilder;
  withPosition: (position: EnginePosition) => PlayerBuilder;
  withAttribute: (name: keyof EngineAttributes, value: number) => PlayerBuilder;
  build: () => EnginePlayer;
};

const playerBuilder = (player: EnginePlayer): PlayerBuilder => ({
  withId: (id) => playerBuilder({ ...player, id }),
  withPosition: (position) => playerBuilder({ ...player, position }),
  withAttribute: (name, value) =>
    playerBuilder({ ...player, attributes: { ...player.attributes, [name]: value } }),
  build: () => ({ ...player, attributes: { ...player.attributes } }),
});

/** Test builder for `EnginePlayer`; an average midfielder (all attributes 10). */
export const anEnginePlayer = (id = "p1"): PlayerBuilder =>
  playerBuilder({ id, position: "MID", attributes: averageAttributes() });

const DEFAULT_FORMATION: FormationCounts = { defenders: 4, midfielders: 4, forwards: 2 };

const startersFor = (prefix: string, formation: FormationCounts): EnginePlayer[] => {
  const slots: EnginePosition[] = [
    "GK",
    ...Array<EnginePosition>(formation.defenders).fill("DEF"),
    ...Array<EnginePosition>(formation.midfielders).fill("MID"),
    ...Array<EnginePosition>(formation.forwards).fill("FWD"),
  ];
  return slots.map((position, index) =>
    anEnginePlayer(`${prefix}-${index + 1}`)
      .withPosition(position)
      .build(),
  );
};

type TeamSheetBuilder = {
  named: (name: string) => TeamSheetBuilder;
  /** Replaces the formation and regenerates the starters to match it. */
  withFormation: (formation: FormationCounts) => TeamSheetBuilder;
  withStarters: (starters: readonly EnginePlayer[]) => TeamSheetBuilder;
  withBench: (bench: readonly EnginePlayer[]) => TeamSheetBuilder;
  build: () => TeamSheet;
};

const teamSheetBuilder = (sheet: TeamSheet, prefix: string): TeamSheetBuilder => ({
  named: (name) => teamSheetBuilder({ ...sheet, name }, prefix),
  withFormation: (formation) =>
    teamSheetBuilder({ ...sheet, formation, starters: startersFor(prefix, formation) }, prefix),
  withStarters: (starters) => teamSheetBuilder({ ...sheet, starters }, prefix),
  withBench: (bench) => teamSheetBuilder({ ...sheet, bench }, prefix),
  build: () => ({
    ...sheet,
    formation: { ...sheet.formation },
    starters: [...sheet.starters],
    bench: [...sheet.bench],
    tactics: { ...sheet.tactics },
  }),
});

/** Test builder for `TeamSheet`; a valid 4-4-2 of average players with neutral tactics. */
export const aTeamSheet = (name = "Team", idPrefix = "t"): TeamSheetBuilder =>
  teamSheetBuilder(
    {
      name,
      formation: DEFAULT_FORMATION,
      starters: startersFor(idPrefix, DEFAULT_FORMATION),
      bench: [anEnginePlayer(`${idPrefix}-b1`).build()],
      tactics: NEUTRAL_TACTICS,
    },
    idPrefix,
  );

type MatchInputV2Builder = {
  withHome: (sheet: TeamSheet) => MatchInputV2Builder;
  withAway: (sheet: TeamSheet) => MatchInputV2Builder;
  build: () => MatchInputV2;
};

const inputV2Builder = (input: MatchInputV2): MatchInputV2Builder => ({
  withHome: (home) => inputV2Builder({ ...input, home }),
  withAway: (away) => inputV2Builder({ ...input, away }),
  build: () => ({ ...input }),
});

/** Test builder for `MatchInputV2`; two valid average 4-4-2 teams with distinct player ids. */
export const aMatchInputV2 = (): MatchInputV2Builder =>
  inputV2Builder({
    engineVersion: 2,
    home: aTeamSheet("Home", "h").build(),
    away: aTeamSheet("Away", "a").build(),
  });
