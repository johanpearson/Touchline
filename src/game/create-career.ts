import type { EngineVersion } from "../engine";
import type { CareerResult } from "./career";
import { createSeason } from "./create-season";
import { generateLeague } from "./generate-league";
import { clubSquad, initialConditions, initialSquadPlan } from "./squad-plan";

export type CareerSpec = {
  seed: number;
  userClubId: string;
  /** The engine for new matches; defaults to 1 (the zone engine) until v2 becomes the default. */
  engineVersion?: EngineVersion;
};

/**
 * Starts a career: generates the league from the seed and schedules the first season.
 * Returns an error result when the user's club is not in the generated league.
 */
export const createCareer = (spec: CareerSpec): CareerResult => {
  const generated = generateLeague({ seed: spec.seed });
  if (!generated.ok) throw new RangeError(`Cannot generate the league: ${generated.error}`);
  const { league } = generated;
  const userClub = league.clubs.find((club) => club.id === spec.userClubId);
  if (!userClub) return { ok: false, error: "unknown-club" };
  const season = createSeason(
    spec.seed,
    1,
    league.clubs.map((club) => club.id),
  );
  return {
    ok: true,
    career: {
      seed: spec.seed,
      userClubId: spec.userClubId,
      league,
      season,
      history: [],
      squadPlan: initialSquadPlan(clubSquad(userClub, league.players)),
      condition: initialConditions(league.players),
      engineVersion: spec.engineVersion ?? 1,
    },
  };
};
