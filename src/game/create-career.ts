import type { CareerResult } from "./career";
import { createSeason } from "./create-season";
import { generateLeague } from "./generate-league";

export type CareerSpec = {
  seed: number;
  userClubId: string;
};

/**
 * Starts a career: generates the league from the seed and schedules the first season.
 * Returns an error result when the user's club is not in the generated league.
 */
export const createCareer = (spec: CareerSpec): CareerResult => {
  const generated = generateLeague({ seed: spec.seed });
  if (!generated.ok) throw new RangeError(`Cannot generate the league: ${generated.error}`);
  const { league } = generated;
  if (!league.clubs.some((club) => club.id === spec.userClubId)) {
    return { ok: false, error: "unknown-club" };
  }
  const season = createSeason(
    spec.seed,
    1,
    league.clubs.map((club) => club.id),
  );
  return {
    ok: true,
    career: { seed: spec.seed, userClubId: spec.userClubId, league, season, history: [] },
  };
};
