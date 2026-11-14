import { beforeAll, describe, expect, it } from "vitest";
import { simulateBalance } from "../engine/balance-harness";
import { aMatchInput } from "../engine/match-builders";
import { deriveLineupProfile } from "./derive-lineup-profile";
import { FORMATION_SHAPE, FORMATIONS, type Formation } from "./formation";
import { generateLeague } from "./generate-league";
import { BENCH_SIZE, type Lineup } from "./lineup";
import type { Player } from "./player";
import { playerOverall } from "./player-overall";

const LEAGUE_SEEDS = [1, 2, 3];
const SEASONS = 5;
const MATCHDAYS_PER_SEASON = 26;
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

/** Every club plays `formation` against its own 4-4-2 self (equal players), 5 seasons of 26 matches. */
const simulateAgainst442 = (formation: Formation): Share => {
  const share: Share = { wins: 0, losses: 0, matches: 0 };
  for (const seed of LEAGUE_SEEDS) {
    const generated = generateLeague({ seed });
    if (!generated.ok) throw new Error(generated.error);
    const { clubs, players } = generated.league;
    clubs.forEach((club, index) => {
      const squad = players.filter((p) => club.playerIds.includes(p.id));
      const tested = deriveLineupProfile(club.name, squad, lineupFor(formation, squad), {});
      const baseline = deriveLineupProfile(club.name, squad, lineupFor("4-4-2", squad), {});
      const matches = SEASONS * MATCHDAYS_PER_SEASON;
      const input = aMatchInput().withHome(tested).withAway(baseline).build();
      const summary = simulateBalance(input, matches, seed * 1_000_000 + index * 1_000);
      share.wins += summary.homeWinRate * matches;
      share.losses += summary.awayWinRate * matches;
      share.matches += matches;
    });
  }
  return share;
};

describe("formation balance: every formation against equal-strength 4-4-2", () => {
  const shares = new Map<Formation, Share>();

  beforeAll(() => {
    for (const formation of FORMATIONS) shares.set(formation, simulateAgainst442(formation));
  }, 300_000);

  for (const formation of FORMATIONS) {
    it(`${formation} neither wins nor loses more than 55% of its matches`, () => {
      const share = shares.get(formation) as Share;
      expect(share.wins / share.matches).toBeLessThanOrEqual(MAX_SHARE);
      expect(share.losses / share.matches).toBeLessThanOrEqual(MAX_SHARE);
    });
  }
});
