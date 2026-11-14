import * as fc from "fast-check";
import type { Mentality, Pressing, TeamTactics, Tempo, Width } from "../tactics";
import {
  ENGINE_ATTRIBUTE_NAMES,
  type EngineAttributes,
  type EnginePlayer,
  type EnginePosition,
  MAX_ENGINE_ATTRIBUTE,
  MIN_ENGINE_ATTRIBUTE,
} from "./engine-player";
import type { MatchInputV2 } from "./match-input-v2";
import type { FormationCounts, TeamSheet } from "./team-sheet";

/** Test support: random valid inputs for property tests of the action engine. */

/** Runs per property: small by default, raised by the nightly workflow through `FC_RUNS`. */
export const propertyRuns = (fallback = 25): number => {
  const parsed = Number.parseInt(process.env.FC_RUNS ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const arbSeed: fc.Arbitrary<number> = fc.integer({ min: 0, max: 0xffffffff });

const arbAttributes: fc.Arbitrary<EngineAttributes> = fc
  .array(fc.integer({ min: MIN_ENGINE_ATTRIBUTE, max: MAX_ENGINE_ATTRIBUTE }), {
    minLength: ENGINE_ATTRIBUTE_NAMES.length,
    maxLength: ENGINE_ATTRIBUTE_NAMES.length,
  })
  .map(
    (values) =>
      Object.fromEntries(
        ENGINE_ATTRIBUTE_NAMES.map((name, i) => [name, values[i]]),
      ) as EngineAttributes,
  );

const arbPlayer = (id: string, position: EnginePosition): fc.Arbitrary<EnginePlayer> =>
  arbAttributes.map((attributes) => ({ id, position, attributes }));

/** Formations with 3 to 5 defenders, 1 to 3 forwards and the rest midfielders (ten outfield players). */
const arbFormation: fc.Arbitrary<FormationCounts> = fc
  .tuple(fc.integer({ min: 3, max: 5 }), fc.integer({ min: 1, max: 3 }))
  .map(([defenders, forwards]) => ({
    defenders,
    forwards,
    midfielders: 10 - defenders - forwards,
  }));

export const arbTactics: fc.Arbitrary<TeamTactics> = fc.record({
  mentality: fc.constantFrom<Mentality>("defensive", "balanced", "attacking"),
  pressing: fc.constantFrom<Pressing>("low", "medium", "high"),
  width: fc.constantFrom<Width>("narrow", "normal", "wide"),
  tempo: fc.constantFrom<Tempo>("slow", "normal", "fast"),
});

const positionsOf = (formation: FormationCounts): EnginePosition[] => [
  "GK",
  ...Array<EnginePosition>(formation.defenders).fill("DEF"),
  ...Array<EnginePosition>(formation.midfielders).fill("MID"),
  ...Array<EnginePosition>(formation.forwards).fill("FWD"),
];

/** A valid team sheet; player ids are `<idPrefix>-<n>` so two sheets never share an id. */
export const arbTeamSheet = (idPrefix = "t"): fc.Arbitrary<TeamSheet> =>
  fc
    .tuple(arbFormation, arbTactics, fc.integer({ min: 0, max: 3 }))
    .chain(([formation, tactics, benchSize]) =>
      fc
        .tuple(
          fc.tuple(
            ...positionsOf(formation).map((position, i) =>
              arbPlayer(`${idPrefix}-${i + 1}`, position),
            ),
          ),
          fc.tuple(
            ...Array.from({ length: benchSize }, (_, i) =>
              arbPlayer(`${idPrefix}-b${i + 1}`, "MID"),
            ),
          ),
        )
        .map(([starters, bench]) => ({
          name: idPrefix,
          formation,
          starters,
          bench,
          tactics,
        })),
    );

export const arbMatchInputV2: fc.Arbitrary<MatchInputV2> = fc
  .tuple(arbTeamSheet("h"), arbTeamSheet("a"))
  .map(([home, away]) => ({ engineVersion: 2 as const, home, away }));
