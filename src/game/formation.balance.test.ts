import { beforeAll, describe, expect, it } from "vitest";
import { NEUTRAL_TACTICS, type TeamSheet } from "../engine";
import { simulateActionBalance } from "../engine/action/action-balance";
import { FORMATION_SHAPE, FORMATIONS, type Formation } from "./formation";
import { formationShape } from "./formation-shape";
import { generateLeague } from "./generate-league";
import { BENCH_SIZE, type Lineup } from "./lineup";
import type { Player } from "./player";
import { playerOverall } from "./player-overall";
import { toEngineBench, toEnginePlayers } from "./to-engine-players";

const LEAGUE_SEEDS = [1, 2];
/** Every club plays this many matches per formation, half at home and half away. */
const MATCHES_PER_CLUB = 40;
const MAX_SHARE = 0.55;
const POSITIONS = ["GK", "DEF", "MID", "FWD"] as const;

type Share = { wins: number; losses: number; matches: number };

/** Best players per position line for the formation; the rest of the squad fills the bench. */
const lineupFor = (formation: Formation, squad: readonly Player[]): Lineup => {
  const shape = FORMATION_SHAPE[formation];
  const starters = POSITIONS.flatMap((position) =>
    squad
      .filter((p) => p.position === position)
      .sort((a, b) => playerOverall(b) - playerOverall(a) || (a.id < b.id ? -1 : 1))
      .slice(0, shape[position])
      .map((p) => p.id),
  );
  const rest = squad.filter((p) => !starters.includes(p.id));
  const keeper = rest.find((p) => p.position === "GK") as Player;
  const bench = [keeper, ...rest.filter((p) => p !== keeper)].slice(0, BENCH_SIZE).map((p) => p.id);
  return { formation, starters, bench };
};

/** The sheet of a lineup with neutral tactics; ids get a prefix so a club can play its own copy. */
const sheetOf = (
  name: string,
  lineup: Lineup,
  squad: readonly Player[],
  idPrefix: string,
): TeamSheet => {
  const prefixed = <T extends { id: string }>(players: readonly T[]): T[] =>
    players.map((p) => ({ ...p, id: `${idPrefix}${p.id}` }));
  return {
    name,
    formation: formationShape(lineup.formation),
    starters: prefixed(toEnginePlayers(lineup, squad, {})),
    bench: prefixed(toEngineBench(lineup, squad, {})),
    tactics: NEUTRAL_TACTICS,
  };
};

/** Every club plays `formation` against its own 4-4-2 self (equal players, home and away alternating). */
const simulateAgainst442 = (formation: Formation): Share => {
  const share: Share = { wins: 0, losses: 0, matches: 0 };
  for (const seed of LEAGUE_SEEDS) {
    const generated = generateLeague({ seed });
    if (!generated.ok) throw new Error(generated.error);
    const { clubs, players } = generated.league;
    clubs.forEach((club, index) => {
      const squad = players.filter((p) => club.playerIds.includes(p.id));
      const tested = sheetOf(club.name, lineupFor(formation, squad), squad, "t-");
      const baseline = sheetOf(club.name, lineupFor("4-4-2", squad), squad, "b-");
      const half = MATCHES_PER_CLUB / 2;
      const baseSeed = seed * 1_000_000 + index * 1_000;
      const atHome = simulateActionBalance(
        { engineVersion: 3, home: tested, away: baseline },
        half,
        baseSeed,
      );
      const away = simulateActionBalance(
        { engineVersion: 3, home: baseline, away: tested },
        half,
        baseSeed + half,
      );
      share.wins += atHome.homeWinRate * half + away.awayWinRate * half;
      share.losses += atHome.awayWinRate * half + away.homeWinRate * half;
      share.matches += MATCHES_PER_CLUB;
    });
  }
  return share;
};

describe("formation balance: every formation against equal-strength 4-4-2", () => {
  const shares = new Map<Formation, Share>();

  beforeAll(() => {
    for (const formation of FORMATIONS) shares.set(formation, simulateAgainst442(formation));
  }, 600_000);

  for (const formation of FORMATIONS) {
    it(`${formation} neither wins nor loses more than 55% of its matches`, () => {
      const share = shares.get(formation) as Share;
      expect(share.wins / share.matches).toBeLessThanOrEqual(MAX_SHARE);
      expect(share.losses / share.matches).toBeLessThanOrEqual(MAX_SHARE);
    });
  }
});
