import { beforeAll, describe, expect, it } from "vitest";
import { autoManageUserSquad } from "./auto-manage-squad";
import type { Career } from "./career";
import { completeMatchday } from "./complete-matchday";
import { createCareer } from "./create-career";
import { finishSeason } from "./finish-season";
import { generateLeague } from "./generate-league";
import { getNextFixture } from "./get-next-fixture";
import { pickBestEleven } from "./pick-best-eleven";
import { playerOverall } from "./player-overall";
import { simulateFixture } from "./simulate-fixture";
import { squadLimits } from "./squad-limits";
import { startNextSeason } from "./start-next-season";
import { FREE_AGENT_POOL_CAP } from "./trim-free-agents";

// Long-run balance (docs/vision.md, "Long-run balance (M6)"): the league must not drift over ten
// seasons of growth, decline, retirement, youth and AI squad building, with the user passive (his
// lineup is auto-picked and he does not use the market). Engine balance is unaffected, because the
// engine only sees attributes. If this fails, tune the named constants of the development, youth and
// retirement modules, never the ranges below.
const LEAGUE_SEEDS = [1, 2, 3];
const SEASONS = 10;
const MATCHDAYS = 26;
/** Ten seasons are 1,820 simulated matches; the hook default of 10 s is far too short. */
const PLAY_TIMEOUT_MS = 600_000;

const MAX_DRIFT_OF_MEAN = 0.75;
const GAP_RATIO_RANGE = { min: 0.5, max: 2 };
const AGE_RANGE = { min: 22, max: 28 };

const careerFor = (seed: number): Career => {
  const generated = generateLeague({ seed });
  if (!generated.ok) throw new Error(generated.error);
  const created = createCareer({
    seed,
    userClubId: (generated.league.clubs[0] as { id: string }).id,
  });
  if (!created.ok) throw new Error(created.error);
  return created.career;
};

const playSeason = (start: Career): Career => {
  let career = start;
  for (let day = 0; day < MATCHDAYS; day++) {
    const fixture = getNextFixture(career.season, career.userClubId);
    if (!fixture) throw new Error("season ended early");
    const outcome = completeMatchday(career, simulateFixture(career, fixture));
    if (!outcome.ok) throw new Error(outcome.error);
    career = outcome.career;
  }
  return career;
};

const rollOver = (finished: Career): Career => {
  const opened = finishSeason(finished);
  if (!opened.ok) throw new Error(opened.error);
  const next = startNextSeason(autoManageUserSquad(opened.career));
  if (!next.ok) throw new Error(next.error);
  return next.career;
};

type Snapshot = {
  season: number;
  /** Best-eleven mean overall per club. */
  strengths: number[];
  meanStrength: number;
  gap: number;
  meanAge: number;
  freeAgents: number;
  illegalClubs: string[];
  emptyLineups: string[];
};

const mean = (values: readonly number[]): number =>
  values.reduce((sum, v) => sum + v, 0) / values.length;

const snapshotOf = (career: Career): Snapshot => {
  const squads = career.league.clubs.map((club) => ({
    club,
    players: career.league.players.filter((p) => club.playerIds.includes(p.id)),
  }));
  const strengths = squads.map(({ players }) => mean(pickBestEleven(players).map(playerOverall)));
  return {
    season: career.season.number,
    strengths,
    meanStrength: mean(strengths),
    gap: Math.max(...strengths) - Math.min(...strengths),
    meanAge: mean(squads.flatMap(({ players }) => players.map((p) => p.age))),
    freeAgents: career.freeAgentIds.length,
    illegalClubs: squads
      .filter(({ club }) => !squadLimits(career, club.id).ok)
      .map((s) => s.club.id),
    emptyLineups: squads
      .filter(({ players }) => pickBestEleven(players).length < 11)
      .map((s) => s.club.id),
  };
};

/** The league at the start of season 1 and at the start of every following season. */
const playLeague = (seed: number): { career: Career; snapshots: Snapshot[] } => {
  let career = careerFor(seed);
  const snapshots = [snapshotOf(career)];
  for (let season = 1; season <= SEASONS; season++) {
    career = rollOver(playSeason(career));
    snapshots.push(snapshotOf(career));
  }
  return { career, snapshots };
};

describe("ten seasons of development", () => {
  describe.each(LEAGUE_SEEDS)("league %i", (seed) => {
    let run: { career: Career; snapshots: Snapshot[] };
    beforeAll(() => {
      run = playLeague(seed);
    }, PLAY_TIMEOUT_MS);
    const start = () => run.snapshots[0] as Snapshot;

    it("keeps the mean best-eleven overall within 0.75 of the start", () => {
      for (const snapshot of run.snapshots.slice(1)) {
        expect(Math.abs(snapshot.meanStrength - start().meanStrength)).toBeLessThanOrEqual(
          MAX_DRIFT_OF_MEAN,
        );
      }
    });

    it("keeps the gap between the strongest and the weakest club within 50% to 200% of the start", () => {
      for (const snapshot of run.snapshots.slice(1)) {
        const ratio = snapshot.gap / start().gap;
        expect(ratio).toBeGreaterThanOrEqual(GAP_RATIO_RANGE.min);
        expect(ratio).toBeLessThanOrEqual(GAP_RATIO_RANGE.max);
      }
    });

    it("leaves every club with a legal squad and a full lineup", () => {
      for (const snapshot of run.snapshots) {
        expect(snapshot.illegalClubs).toEqual([]);
        expect(snapshot.emptyLineups).toEqual([]);
      }
    });

    it("keeps the free-agent pool within its cap", () => {
      for (const snapshot of run.snapshots) {
        expect(snapshot.freeAgents).toBeLessThanOrEqual(FREE_AGENT_POOL_CAP);
      }
    });

    it("never produces a NaN balance", () => {
      for (const finance of Object.values(run.career.finances)) {
        expect(Number.isNaN(finance.balance)).toBe(false);
      }
      for (const snapshot of run.snapshots) {
        expect(snapshot.strengths.some(Number.isNaN)).toBe(false);
      }
    });

    it("keeps the average age of the league between 22 and 28", () => {
      for (const snapshot of run.snapshots) {
        expect(snapshot.meanAge).toBeGreaterThanOrEqual(AGE_RANGE.min);
        expect(snapshot.meanAge).toBeLessThanOrEqual(AGE_RANGE.max);
      }
    });

    it("has played all ten seasons", () => {
      expect(run.career.season.number).toBe(SEASONS + 1);
      expect(run.career.history).toHaveLength(SEASONS);
    });
  });
});
